# Phase 3: Core Embedding - Research

**Researched:** 2026-02-04
**Domain:** Markdown section manipulation, content merging, idempotent operations, user content preservation
**Confidence:** HIGH

## Summary

Phase 3 implements the core logic for embedding skills/commands into CLAUDE.md and AGENTS.md files while preserving user content. The research focused on markdown section detection strategies, content replacement patterns, idempotency techniques, and validation approaches for ensuring user content remains intact.

The standard approach uses **regex-based section boundary detection** with heading depth matching for simple, reliable parsing without heavy AST dependencies. Idempotency is achieved through **content hash comparison** to skip writes when identical. User content preservation uses **hash validation before/after merge** to detect corruption. The critical insight is that regex parsing is sufficient for well-structured markdown with clear section boundaries (## SKILLS, ## COMMANDS), and AST parsing (remark/unified) adds complexity without significant benefit for this use case.

**Primary recommendation:** Implement regex-based section extraction with heading depth boundary detection. Use content hashing to enable idempotent operations (skip write if content identical). Validate user content unchanged using hash comparison of non-embedded sections. Generate template files with explanatory header comment on first run.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js String/RegExp | Native | Section boundary detection and content splitting | Built-in, zero dependencies. RegExp with multiline mode is sufficient for heading detection. Used universally in markdown tools. |
| Node.js crypto | Native (reuse Phase 2) | Content hashing for idempotency and validation | Already implemented in Phase 2 for backups. SHA-256 hashing enables content comparison without string equality (whitespace normalization). |
| gray-matter | 4.0.3 | YAML frontmatter parsing (already in Phase 1) | Already dependency. Used for parsing SKILL.md frontmatter. Consistent across codebase. |

### Supporting Utilities

| Utility | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| String.split() | Native | Split content at section boundaries | Splitting markdown into user content and embedded sections. Simple and reliable. |
| String.trim() | Native | Whitespace normalization | Removing trailing whitespace from sections. Prevents whitespace-only diffs. |
| Array.join() | Native | Reassemble content sections | Joining user content, separator, and embedded sections. |
| String.includes() | Native | Check for section existence | Quick check if ## SKILLS or ## COMMANDS already exists. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex-based parsing | remark + unified AST manipulation | remark (7.5M downloads/week) provides full AST with mdast nodes. More powerful but heavier (3 dependencies: remark, remark-parse, unified). Regex is simpler for well-structured section boundaries. Only use remark if need complex transformations. |
| Content hash comparison | String equality (===) | Direct string comparison works but sensitive to whitespace differences. Hash comparison allows normalization (trim, line ending consistency) before hashing. Hash is better for "semantically identical" checks. |
| Manual section detection | markdown-replace-section package | markdown-replace-section handles section replacement but unmaintained since 2017. Regex gives full control over boundary detection and whitespace handling. |
| Template literals | Dedicated template library | Template strings are sufficient for generating minimal CLAUDE.md template. No need for Handlebars/Mustache for simple header + sections. |

**Installation:**
```bash
# No new dependencies needed
# Reuse existing: gray-matter (Phase 1), crypto (Phase 2)
```

## Architecture Patterns

### Recommended Module Structure
```
src/
├── embedding/                  # Content embedding logic
│   ├── section-extractor.ts    # Extract/remove embedded sections
│   ├── section-generator.ts    # Generate ## SKILLS, ## COMMANDS sections
│   ├── content-merger.ts       # Merge user + embedded content
│   ├── template-generator.ts   # Generate new CLAUDE.md template
│   └── idempotency-checker.ts  # Check if content identical (skip write)
├── validation/
│   ├── user-content-validator.ts  # Validate user sections unchanged
│   └── section-validator.ts       # Validate embedded section structure
└── types/
    ├── embedded-content.ts     # Types for embedded sections
    └── merge-result.ts         # Merge operation result types
```

### Pattern 1: Section Boundary Detection

**What:** Detect section boundaries using heading depth to identify where ## SKILLS or ## COMMANDS sections start and end.

**When to use:** When extracting existing embedded sections before replacement, or when separating user content from embedded sections.

**Boundary detection rules:**
- Section starts: Line matching `^##\s+SKILLS` or `^##\s+COMMANDS` (case-insensitive per markdown conventions)
- Section ends: Next line matching `^##\s+` (same depth heading) OR end of file
- Depth matching: Only match same-level headings (## = depth 2). Don't end section on ### (depth 3) subsection.

**Example:**
```typescript
// Source: Markdown heading regex patterns + depth matching logic
interface SectionBoundary {
  sectionName: 'SKILLS' | 'COMMANDS';
  startLine: number;
  endLine: number;
  content: string;
}

function detectSectionBoundaries(
  content: string,
  sectionName: 'SKILLS' | 'COMMANDS'
): SectionBoundary | null {
  const lines = content.split('\n');

  // Regex: ^##\s+(SKILLS|COMMANDS)\s*$ (heading at start of line, depth 2)
  const sectionHeadingPattern = new RegExp(`^##\\s+${sectionName}\\s*$`, 'i');

  // Find section start
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (sectionHeadingPattern.test(lines[i])) {
      startLine = i;
      break;
    }
  }

  if (startLine === -1) {
    return null; // Section not found
  }

  // Find section end (next ## heading at same depth, or EOF)
  let endLine = lines.length;
  const sameLevelHeadingPattern = /^##\s+/; // Any ## heading

  for (let i = startLine + 1; i < lines.length; i++) {
    if (sameLevelHeadingPattern.test(lines[i])) {
      endLine = i;
      break;
    }
  }

  // Extract section content (including heading line)
  const sectionLines = lines.slice(startLine, endLine);

  return {
    sectionName,
    startLine,
    endLine,
    content: sectionLines.join('\n')
  };
}
```

### Pattern 2: Content Splitting (User vs Embedded)

**What:** Split markdown content into user sections and embedded sections, preserving user content exactly.

**When to use:** Before replacing embedded sections. Need to preserve user content while removing old embedded sections.

**Approach:**
1. Detect all embedded section boundaries (## SKILLS, ## COMMANDS)
2. Extract embedded sections and track positions
3. Everything outside embedded sections = user content
4. Preserve user content character-for-character (no normalization)

**Example:**
```typescript
// Source: Section boundary detection + array slicing
interface SplitContent {
  userContent: string;        // Everything except embedded sections
  embeddedSections: Map<string, string>;  // Existing embedded sections
  userContentHash: string;    // Hash for validation
}

function splitContent(content: string): SplitContent {
  const skillsSection = detectSectionBoundaries(content, 'SKILLS');
  const commandsSection = detectSectionBoundaries(content, 'COMMANDS');

  const lines = content.split('\n');
  const userLines: string[] = [];
  const embeddedSections = new Map<string, string>();

  // Track which line ranges are embedded sections
  const embeddedRanges: Array<{ start: number; end: number }> = [];

  if (skillsSection) {
    embeddedRanges.push({ start: skillsSection.startLine, end: skillsSection.endLine });
    embeddedSections.set('SKILLS', skillsSection.content);
  }

  if (commandsSection) {
    embeddedRanges.push({ start: commandsSection.startLine, end: commandsSection.endLine });
    embeddedSections.set('COMMANDS', commandsSection.content);
  }

  // Sort ranges by start line
  embeddedRanges.sort((a, b) => a.start - b.start);

  // Extract user content (lines NOT in embedded ranges)
  let currentLine = 0;

  for (const range of embeddedRanges) {
    // Add user lines before this embedded section
    userLines.push(...lines.slice(currentLine, range.start));
    currentLine = range.end;
  }

  // Add remaining user lines after last embedded section
  userLines.push(...lines.slice(currentLine));

  const userContent = userLines.join('\n').trim();

  // Generate hash of user content for validation
  const userContentHash = generateContentHash(userContent);

  return {
    userContent,
    embeddedSections,
    userContentHash
  };
}
```

### Pattern 3: Idempotent Write with Content Hash Comparison

**What:** Compare content hash before writing. Skip write if new content identical to existing content.

**When to use:** On every merge operation. Prevents unnecessary writes and preserves file timestamps when no changes.

**Benefits:**
- No-op on repeat runs with same selection (idempotency)
- Preserves file modification time when unchanged
- Reduces backup creation when content identical
- Fast comparison (hash vs hash, not full string comparison)

**Example:**
```typescript
// Source: Idempotency patterns + content hashing
import { readFile } from 'fs/promises';
import { generateContentHash } from '../file-safety/hash-generator.js';

interface IdempotencyCheckResult {
  isIdentical: boolean;
  existingHash: string;
  newHash: string;
}

async function checkIdempotency(
  targetPath: string,
  newContent: string
): Promise<IdempotencyCheckResult> {
  try {
    // Read existing file content
    const existingContent = await readFile(targetPath, 'utf8');

    // Normalize whitespace for comparison (trim, consistent line endings)
    const normalizedExisting = normalizeContent(existingContent);
    const normalizedNew = normalizeContent(newContent);

    // Generate hashes
    const existingHash = generateContentHash(normalizedExisting);
    const newHash = generateContentHash(normalizedNew);

    return {
      isIdentical: existingHash === newHash,
      existingHash,
      newHash
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - not identical
      return {
        isIdentical: false,
        existingHash: '',
        newHash: generateContentHash(normalizeContent(newContent))
      };
    }
    throw error;
  }
}

function normalizeContent(content: string): string {
  return content
    .trim()                         // Remove leading/trailing whitespace
    .replace(/\r\n/g, '\n')         // Normalize line endings to LF
    .replace(/\n{3,}/g, '\n\n');    // Normalize excessive blank lines to max 2
}
```

### Pattern 4: Template Generation for New Files

**What:** Generate minimal CLAUDE.md template on first run with explanatory header comment.

**When to use:** When target file doesn't exist. Creates proper structure before embedding sections.

**Template structure:**
```markdown
<!-- Generated by Agent Compiler -->
<!-- This file embeds Claude Code skills and commands for reliable agent behavior -->

[User can add their content here]

---

## SKILLS

[Embedded skill sections]

## COMMANDS

[Embedded command sections]
```

**Example:**
```typescript
// Source: Template string generation + markdown structure
interface TemplateOptions {
  includeSkills: boolean;
  includeCommands: boolean;
  headerComment?: string;
}

function generateTemplate(options: TemplateOptions): string {
  const parts: string[] = [];

  // Header comment explaining purpose
  parts.push('<!-- Generated by Agent Compiler -->');
  parts.push('<!-- This file embeds Claude Code skills and commands for reliable agent behavior -->');
  parts.push('');

  // User content placeholder
  parts.push('[User can add their content here]');
  parts.push('');

  // Separator between user content and embedded sections
  parts.push('---');
  parts.push('');

  // Embedded sections (initially empty, will be populated by merge)
  if (options.includeSkills) {
    parts.push('## SKILLS');
    parts.push('');
  }

  if (options.includeCommands) {
    parts.push('## COMMANDS');
    parts.push('');
  }

  return parts.join('\n');
}
```

### Pattern 5: User Content Validation (Hash Check)

**What:** Validate that user content (non-embedded sections) is unchanged after merge using hash comparison.

**When to use:** After merging new embedded sections. Ensures merge didn't corrupt user content.

**Approach:**
1. Extract user content before merge → hash it
2. Perform merge operation
3. Extract user content after merge → hash it
4. Compare hashes (must be identical)
5. If hashes differ → rollback (corruption detected)

**Example:**
```typescript
// Source: Validation patterns + hash comparison
interface ValidationResult {
  valid: boolean;
  beforeHash: string;
  afterHash: string;
  error?: string;
}

async function validateUserContentPreserved(
  targetPath: string,
  beforeHash: string
): Promise<ValidationResult> {
  // Read merged content
  const mergedContent = await readFile(targetPath, 'utf8');

  // Extract user content from merged file
  const { userContent, userContentHash } = splitContent(mergedContent);

  // Compare hashes
  const valid = beforeHash === userContentHash;

  if (!valid) {
    return {
      valid: false,
      beforeHash,
      afterHash: userContentHash,
      error: `User content changed during merge. Expected hash: ${beforeHash}, got: ${userContentHash}`
    };
  }

  return {
    valid: true,
    beforeHash,
    afterHash: userContentHash
  };
}
```

### Pattern 6: Section Assembly with Subsection Headings

**What:** Generate ## SKILLS and ## COMMANDS sections with ### subsections for each skill/command.

**When to use:** When assembling embedded sections from parsed skills/commands.

**Structure:**
```markdown
## SKILLS

### Skill Name 1
[skill 1 content]

### Skill Name 2
[skill 2 content]

## COMMANDS

### Command Name 1
[command 1 content]
```

**Example:**
```typescript
// Source: Markdown section generation + subsection headings
import type { ParsedSkill } from '../types/skill.js';
import type { ParsedCommand } from '../types/command.js';

function generateSkillsSection(skills: ParsedSkill[]): string {
  if (skills.length === 0) {
    return '';
  }

  const parts: string[] = ['## SKILLS', ''];

  for (const skill of skills) {
    // Use skill name from metadata (not directory name)
    parts.push(`### ${skill.metadata.name}`);
    parts.push('');

    // Add skill content (already concatenated from Phase 1)
    parts.push(skill.content.trim());
    parts.push('');
  }

  return parts.join('\n');
}

function generateCommandsSection(commands: ParsedCommand[]): string {
  if (commands.length === 0) {
    return '';
  }

  const parts: string[] = ['## COMMANDS', ''];

  for (const command of commands) {
    parts.push(`### ${command.name}`);
    parts.push('');
    parts.push(command.content.trim());
    parts.push('');
  }

  return parts.join('\n');
}
```

### Pattern 7: Complete Merge Operation

**What:** Orchestrate the full merge: split content, preserve user content, replace embedded sections, validate.

**When to use:** Main entry point for embedding operation.

**Flow:**
1. Read existing file (or generate template if new)
2. Split into user content + old embedded sections
3. Hash user content (for validation)
4. Generate new embedded sections
5. Merge: user content + separator + new embedded sections
6. Check idempotency (skip write if identical)
7. Write merged content (use Phase 2 safe write)
8. Validate user content unchanged

**Example:**
```typescript
// Source: Complete merge orchestration pattern
import { safeWrite } from '../file-safety/safe-writer.js';

interface MergeOptions {
  targetPath: string;
  skills: ParsedSkill[];
  commands: ParsedCommand[];
  backupDir: string;
}

interface MergeResult {
  success: boolean;
  skipped: boolean;           // True if skipped due to idempotency
  backupPath?: string;
  validationResult: ValidationResult;
}

async function mergeEmbeddedContent(options: MergeOptions): Promise<MergeResult> {
  const { targetPath, skills, commands, backupDir } = options;

  // Step 1: Read existing content (or generate template)
  let existingContent: string;
  try {
    existingContent = await readFile(targetPath, 'utf8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - generate template
      existingContent = generateTemplate({
        includeSkills: skills.length > 0,
        includeCommands: commands.length > 0
      });
    } else {
      throw error;
    }
  }

  // Step 2: Split content (extract user content, remove old embedded sections)
  const { userContent, userContentHash } = splitContent(existingContent);

  // Step 3: Generate new embedded sections
  const skillsSection = generateSkillsSection(skills);
  const commandsSection = generateCommandsSection(commands);

  // Step 4: Merge content
  const parts: string[] = [];

  // User content
  if (userContent.trim()) {
    parts.push(userContent.trim());
    parts.push('');
  }

  // Separator (horizontal rule)
  parts.push('---');
  parts.push('');

  // Embedded sections
  if (skillsSection) {
    parts.push(skillsSection.trim());
    parts.push('');
  }

  if (commandsSection) {
    parts.push(commandsSection.trim());
    parts.push('');
  }

  const mergedContent = parts.join('\n');

  // Step 5: Check idempotency (skip if identical)
  const idempotencyCheck = await checkIdempotency(targetPath, mergedContent);

  if (idempotencyCheck.isIdentical) {
    console.log(`Skipping write - content identical: ${targetPath}`);
    return {
      success: true,
      skipped: true,
      validationResult: { valid: true, beforeHash: userContentHash, afterHash: userContentHash }
    };
  }

  // Step 6: Write merged content (with backup and auto-rollback)
  const writeResult = await safeWrite(targetPath, mergedContent, {
    backupDir,
    validate: true  // Use Phase 2 markdown validation
  });

  if (!writeResult.success) {
    throw new Error(`Write failed and was rolled back: ${targetPath}`);
  }

  // Step 7: Validate user content unchanged
  const validationResult = await validateUserContentPreserved(targetPath, userContentHash);

  if (!validationResult.valid) {
    // Critical: user content corrupted during merge
    throw new Error(
      `CRITICAL: User content corrupted during merge.\n` +
      `File: ${targetPath}\n` +
      `Backup: ${writeResult.backupPath}\n` +
      `${validationResult.error}\n` +
      `Restore from backup immediately.`
    );
  }

  return {
    success: true,
    skipped: false,
    backupPath: writeResult.backupPath,
    validationResult
  };
}
```

### Anti-Patterns to Avoid

- **AST parsing for simple section extraction:** Don't use remark/unified AST for straightforward ## SKILLS, ## COMMANDS section detection. Regex is simpler, faster, and has zero dependencies. AST is overkill unless you need complex markdown transformations.

- **String equality for idempotency:** Don't use `existingContent === newContent` for idempotency checks. Whitespace differences (trailing newlines, line endings) cause false negatives. Use hash comparison with normalized content.

- **Removing horizontal rule separator:** Don't skip the `---` separator between user content and embedded sections. It provides visual boundary in file. Users expect clear separation.

- **Editing embedded sections in-place:** Don't try to update individual skills within ## SKILLS section. Always remove entire section and regenerate. In-place updates are complex and error-prone.

- **Skipping user content validation:** Don't assume merge preserved user content. Always validate with hash check. Corruption can happen from bugs in boundary detection.

- **Not handling missing sections gracefully:** Don't crash if ## SKILLS or ## COMMANDS missing. Absence is valid state (user hasn't embedded yet, or only embedded one type). Return null from detectSectionBoundaries, not error.

## Common Pitfalls

### Pitfall 1: Incorrect Section Boundary Detection (### vs ##)

**What goes wrong:** Section extractor ends ## SKILLS section when encountering ### subsection heading, truncating embedded content.

**Why it happens:** Regex pattern matches ANY heading (`^#+\s+`) instead of same-depth headings (`^##\s+`). Subsections (### Skill Name) incorrectly treated as section boundaries.

**How to avoid:**
- Match exact heading depth: `^##\s+` for depth 2
- Don't end section on deeper headings (###, ####)
- Only end on same-depth sibling headings or EOF

**Warning signs:**
- Embedded sections missing subsection content
- Section ends prematurely at first ### heading
- Regex pattern like `/^#+\s+/` (matches any depth)

**Code example:**
```typescript
// Bad: Matches any heading depth
const anyHeadingPattern = /^#+\s+/;
// This ends section at ### Skill Name subsection!

// Good: Matches exact depth only
const sameLevelPattern = /^##\s+/;
// This only ends section at next ## heading
```

### Pitfall 2: Not Normalizing Content Before Idempotency Check

**What goes wrong:** Idempotency check fails even when content semantically identical due to whitespace differences (trailing newlines, CRLF vs LF).

**Why it happens:** Direct string comparison (`===`) is sensitive to whitespace. Content generated programmatically might have different whitespace than content from file.

**How to avoid:**
- Normalize both contents before hashing
- Trim whitespace, normalize line endings
- Use hash comparison, not string equality
- Document normalization rules

**Warning signs:**
- Idempotency check always fails
- Write occurs on every run even with same selection
- Backup created unnecessarily
- File modification time changes on no-op runs

**Code example:**
```typescript
// Bad: Direct string comparison (whitespace sensitive)
if (existingContent === newContent) {
  return { skipped: true };
}

// Good: Normalized hash comparison
function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

const existingHash = generateContentHash(normalizeContent(existingContent));
const newHash = generateContentHash(normalizeContent(newContent));

if (existingHash === newHash) {
  return { skipped: true };
}
```

### Pitfall 3: Whitespace Handling Around Removed Sections

**What goes wrong:** After removing embedded sections, excessive blank lines remain (3-4 blank lines) or no spacing between user content and new sections.

**Why it happens:** Section removal leaves blank lines. No clear strategy for whitespace normalization around boundaries.

**How to avoid:**
- Trim user content after extraction
- Add consistent spacing around separator (`---`)
- Normalize excessive blank lines (max 2 consecutive)
- Document whitespace rules in code

**Warning signs:**
- Visual inspection shows excessive blank lines
- Diff shows whitespace-only changes on re-runs
- User content has trailing blank lines that grow

**Code example:**
```typescript
// Bad: No whitespace normalization
const mergedContent = userContent + '\n---\n' + skillsSection;

// Good: Consistent spacing with normalization
const parts: string[] = [];

// User content (trimmed)
if (userContent.trim()) {
  parts.push(userContent.trim());
  parts.push('');  // Single blank line
}

// Separator
parts.push('---');
parts.push('');  // Single blank line

// Embedded sections (trimmed)
if (skillsSection.trim()) {
  parts.push(skillsSection.trim());
  parts.push('');  // Single blank line
}

const mergedContent = parts.join('\n');
```

### Pitfall 4: Case-Sensitive Section Detection

**What goes wrong:** Tool doesn't detect `## Skills` or `## skills` sections, only `## SKILLS` (uppercase).

**Why it happens:** Regex pattern doesn't use case-insensitive flag. Markdown conventions allow any casing for headings.

**How to avoid:**
- Use case-insensitive regex: `/^##\s+SKILLS\s*$/i`
- Generate sections in consistent casing (UPPERCASE)
- Document that tool owns these specific headings

**Warning signs:**
- Users report "section not removed" when using different casing
- Multiple ## Skills sections accumulate
- Regex pattern missing `i` flag

**Code example:**
```typescript
// Bad: Case-sensitive (misses ## Skills, ## skills)
const pattern = /^##\s+SKILLS\s*$/;

// Good: Case-insensitive (matches any casing)
const pattern = /^##\s+SKILLS\s*$/i;
```

### Pitfall 5: Not Validating User Content After Merge

**What goes wrong:** Bug in section boundary detection corrupts user content during merge. User loses their manual edits. No detection until user notices.

**Why it happens:** Developer assumes merge logic is correct. No validation that user content unchanged.

**How to avoid:**
- Hash user content before merge
- Hash user content after merge
- Compare hashes (must be identical)
- Throw error and rollback if mismatch
- Make validation non-optional (always run)

**Warning signs:**
- No user content hash check in merge flow
- User reports "my content disappeared"
- Validation is optional or can be disabled

**Code example:**
```typescript
// Bad: No validation after merge
await safeWrite(targetPath, mergedContent, { backupDir });
return { success: true };

// Good: Validate user content unchanged
const { userContent, userContentHash: beforeHash } = splitContent(existingContent);
await safeWrite(targetPath, mergedContent, { backupDir });

// Validate
const afterContent = await readFile(targetPath, 'utf8');
const { userContentHash: afterHash } = splitContent(afterContent);

if (beforeHash !== afterHash) {
  throw new Error(
    `User content corrupted. Before: ${beforeHash}, After: ${afterHash}. ` +
    `Restore from backup immediately.`
  );
}
```

### Pitfall 6: Template Placement When User Content Exists

**What goes wrong:** When embedding for first time in existing CLAUDE.md with user content, template placeholder `[User can add their content here]` is inserted, duplicating content.

**Why it happens:** Template generation logic doesn't check if user content already exists before adding placeholder.

**How to avoid:**
- Only generate template for NEW files (ENOENT)
- If file exists, skip template generation
- Preserve existing content exactly
- Template is for initialization only

**Warning signs:**
- User content has `[User can add their content here]` inserted
- Template comment appears in existing files
- Duplicate content after first embedding

**Code example:**
```typescript
// Bad: Always generate template
const content = generateTemplate({ includeSkills: true }) + existingContent;

// Good: Template only for new files
let existingContent: string;
try {
  existingContent = await readFile(targetPath, 'utf8');
} catch (error: any) {
  if (error.code === 'ENOENT') {
    // NEW FILE: Generate template
    existingContent = generateTemplate({ includeSkills: true, includeCommands: true });
  } else {
    throw error;
  }
}
// For existing files, existingContent used as-is
```

### Pitfall 7: Missing Skills (Deleted from Disk) Causing Merge Failure

**What goes wrong:** User selects skills for embedding. Between selection and merge, skill is deleted from disk. Merge fails with "file not found" error.

**Why it happens:** No validation that selected skills still exist before merge. Time gap between selection and embedding.

**How to avoid:**
- Validate all selected skills exist before merge
- Warn about missing skills but continue with available ones
- Document warning mechanism for Phase 4 (CLI will display)
- Don't fail entire operation for missing skills

**Warning signs:**
- Merge fails with ENOENT for skill file
- No graceful handling of missing skills
- User must re-run entire selection process

**Code example:**
```typescript
// Bad: Assume all selected skills exist
const skills = await Promise.all(
  selectedSkillPaths.map(path => parseSkill(path))
);

// Good: Filter out missing skills, warn but continue
const skillResults = await Promise.allSettled(
  selectedSkillPaths.map(path => parseSkill(path))
);

const skills: ParsedSkill[] = [];
const missingSkills: string[] = [];

for (let i = 0; i < skillResults.length; i++) {
  const result = skillResults[i];
  if (result.status === 'fulfilled') {
    skills.push(result.value);
  } else {
    // Skill missing or parse failed
    missingSkills.push(selectedSkillPaths[i]);
  }
}

if (missingSkills.length > 0) {
  // Warn but continue (Phase 4 CLI will display warning)
  console.warn(`Warning: ${missingSkills.length} skills not found: ${missingSkills.join(', ')}`);
}

// Continue merge with available skills
await mergeEmbeddedContent({ skills, commands, targetPath, backupDir });
```

## Code Examples

Verified patterns for implementation:

### Complete Section Extraction with Depth Matching

```typescript
// Source: Regex boundary detection + depth matching logic
interface SectionRange {
  name: string;
  startLine: number;
  endLine: number;
  depth: number;
}

function extractSections(content: string): {
  userContent: string;
  embeddedSections: Map<string, string>;
} {
  const lines = content.split('\n');
  const sections: SectionRange[] = [];

  // Find all ## headings (depth 2)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{2})\s+(.+)$/);
    if (match) {
      const depth = match[1].length;
      const name = match[2].trim();
      sections.push({ name, startLine: i, endLine: -1, depth });
    }
  }

  // Calculate end line for each section (next same-depth heading or EOF)
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSameDepth = sections.slice(i + 1).find(s => s.depth === section.depth);
    section.endLine = nextSameDepth ? nextSameDepth.startLine : lines.length;
  }

  // Extract embedded sections (SKILLS, COMMANDS)
  const embeddedSections = new Map<string, string>();
  const embeddedRanges: Array<{ start: number; end: number }> = [];

  for (const section of sections) {
    const normalizedName = section.name.toUpperCase();
    if (normalizedName === 'SKILLS' || normalizedName === 'COMMANDS') {
      const sectionLines = lines.slice(section.startLine, section.endLine);
      embeddedSections.set(normalizedName, sectionLines.join('\n'));
      embeddedRanges.push({ start: section.startLine, end: section.endLine });
    }
  }

  // Extract user content (everything NOT in embedded ranges)
  embeddedRanges.sort((a, b) => a.start - b.start);

  const userLines: string[] = [];
  let currentLine = 0;

  for (const range of embeddedRanges) {
    userLines.push(...lines.slice(currentLine, range.start));
    currentLine = range.end;
  }
  userLines.push(...lines.slice(currentLine));

  const userContent = userLines.join('\n').trim();

  return { userContent, embeddedSections };
}
```

### Idempotent Merge with Skip Detection

```typescript
// Source: Hash-based idempotency + skip logic
import { readFile } from 'fs/promises';
import { generateContentHash } from '../file-safety/hash-generator.js';

async function mergeWithIdempotencyCheck(
  targetPath: string,
  newContent: string,
  backupDir: string
): Promise<{ skipped: boolean; backupPath?: string }> {
  // Normalize content for comparison
  const normalizedNew = normalizeContent(newContent);
  const newHash = generateContentHash(normalizedNew);

  try {
    // Read existing file
    const existing = await readFile(targetPath, 'utf8');
    const normalizedExisting = normalizeContent(existing);
    const existingHash = generateContentHash(normalizedExisting);

    // Check if identical
    if (existingHash === newHash) {
      console.log(`Skipping write (content identical): ${targetPath}`);
      return { skipped: true };
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // File doesn't exist - proceed with write
  }

  // Content different or file new - write it
  const result = await safeWrite(targetPath, newContent, {
    backupDir,
    validate: true
  });

  return {
    skipped: false,
    backupPath: result.backupPath
  };
}

function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n')         // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')     // Max 2 consecutive blank lines
    .replace(/\t/g, '  ');          // Normalize tabs to spaces
}
```

### Robust User Content Preservation Validation

```typescript
// Source: Hash validation pattern + error detection
import { createHash } from 'crypto';

interface PreservationCheck {
  preserved: boolean;
  beforeHash: string;
  afterHash: string;
  error?: string;
}

async function validatePreservation(
  beforeContent: string,
  afterFilePath: string
): Promise<PreservationCheck> {
  // Hash BEFORE merge
  const beforeNormalized = normalizeContent(beforeContent);
  const beforeHash = createHash('sha256')
    .update(beforeNormalized, 'utf8')
    .digest('hex');

  // Read file AFTER merge
  const afterFull = await readFile(afterFilePath, 'utf8');

  // Extract user content from merged file
  const { userContent: afterUserContent } = extractSections(afterFull);

  // Hash AFTER merge
  const afterNormalized = normalizeContent(afterUserContent);
  const afterHash = createHash('sha256')
    .update(afterNormalized, 'utf8')
    .digest('hex');

  // Compare
  const preserved = beforeHash === afterHash;

  if (!preserved) {
    return {
      preserved: false,
      beforeHash,
      afterHash,
      error: `User content changed during merge.\n` +
             `Expected: ${beforeHash}\n` +
             `Got: ${afterHash}\n` +
             `Content may be corrupted.`
    };
  }

  return {
    preserved: true,
    beforeHash,
    afterHash
  };
}
```

### Section Generation with Proper Spacing

```typescript
// Source: Markdown section structure + subsection pattern
function assembleSections(
  userContent: string,
  skills: ParsedSkill[],
  commands: ParsedCommand[]
): string {
  const parts: string[] = [];

  // User content (if exists)
  const trimmedUser = userContent.trim();
  if (trimmedUser) {
    parts.push(trimmedUser);
    parts.push('');  // Blank line
  }

  // Separator
  parts.push('---');
  parts.push('');

  // SKILLS section
  if (skills.length > 0) {
    parts.push('## SKILLS');
    parts.push('');

    for (const skill of skills) {
      parts.push(`### ${skill.metadata.name}`);
      parts.push('');
      parts.push(skill.content.trim());
      parts.push('');
    }
  }

  // COMMANDS section
  if (commands.length > 0) {
    parts.push('## COMMANDS');
    parts.push('');

    for (const command of commands) {
      parts.push(`### ${command.name}`);
      parts.push('');
      parts.push(command.content.trim());
      parts.push('');
    }
  }

  // Join with newlines (already have blank lines in parts)
  return parts.join('\n');
}
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown AST parsing | Custom parser for headings/sections | remark + unified (if needed) | Full AST parsing is complex (nested structures, escaping, code blocks). remark handles all edge cases. But for simple section detection, regex is sufficient. |
| Content hashing | Custom hash function | crypto.createHash('sha256') (Phase 2) | Already implemented in Phase 2. SHA-256 is standard. Don't reinvent. |
| YAML parsing | Custom frontmatter parser | gray-matter (Phase 1) | Already dependency. Handles edge cases (Norway problem, dates). Don't duplicate. |
| Whitespace normalization | Manual regex chain | Dedicated normalize function with rules | Normalization rules are subtle (line endings, tabs, excessive blanks). Centralize in tested function. |

**Key insight:** Markdown section extraction LOOKS simple but has edge cases: nested headings, code blocks with # characters, escaping. For well-structured files with clear ## SKILLS, ## COMMANDS sections, regex is sufficient and simpler than AST. Only use AST (remark) if encountering edge cases in practice.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom markdown parsers | remark/unified ecosystem | 2015+ | Unified ecosystem became standard for markdown AST manipulation. Plugin architecture allows extensibility. |
| String replacement for sections | AST-based section replacement | 2018+ | AST provides structured approach but adds complexity. For simple section replacement, regex remains valid in 2026. |
| No idempotency checks | Hash-based idempotency | 2020s | Content hashing (SHA-256) enables fast comparison without full string equality. Prevents unnecessary writes. |
| Manual section detection | markdown-replace-section, update-markdown | 2016-2018 | Tools emerged but many unmaintained. Pattern is well-known, simple to implement with regex. |

**Deprecated/outdated:**
- **markdown-replace-section package**: Unmaintained since 2017. Pattern is simple enough to implement directly.
- **update-markdown package**: Last update 2018. Uses older markdown-it parser. Simpler to use native regex for our use case.
- **MD5 for content hashing**: Use SHA-256 (already in Phase 2). MD5 cryptographically broken.

**Current best practices (2026):**
- **Regex for simple section extraction**: For well-structured markdown with clear section boundaries, regex is simpler than AST parsing
- **AST (remark/unified) for complex manipulation**: Use when need to preserve formatting, handle nested structures, or complex transformations
- **SHA-256 for idempotency**: Hash comparison faster and more reliable than string equality
- **Validation after merge**: Always validate user content unchanged using hash comparison

## Open Questions

Things that couldn't be fully resolved:

1. **Question: Should section detection be case-insensitive?**
   - What we know: Markdown conventions don't enforce heading casing. Users might write ## Skills or ## SKILLS.
   - What's unclear: Whether to detect all casings or enforce tool-generated casing only.
   - Recommendation: CASE-INSENSITIVE detection (`/^##\s+SKILLS\s*$/i`). Generate in uppercase but detect any casing. User-friendly.

2. **Question: How much whitespace normalization is appropriate?**
   - What we know: Excessive blank lines (3+) are visually messy. But users might intentionally space content.
   - What's unclear: Whether to normalize aggressively (max 2 blank lines) or preserve exactly.
   - Recommendation: NORMALIZE for embedded sections only (trim skill content, consistent spacing). Preserve user content whitespace exactly.

3. **Question: Should horizontal rule separator be configurable?**
   - What we know: `---` is standard markdown horizontal rule. Provides clear visual boundary.
   - What's unclear: Whether users might want different separator (no separator, custom marker).
   - Recommendation: HARDCODE `---` separator for v1. If users request customization, defer to v2 configuration option.

4. **Question: How to handle malformed markdown in user content?**
   - What we know: User content might have unbalanced headings, code blocks without closing, etc.
   - What's unclear: Whether section detection breaks on malformed markdown.
   - Recommendation: REGEX approach is resilient - only looks for ## headings. Won't break on malformed content. If issues arise, add code block detection to skip # inside code blocks.

5. **Question: Should tool detect and warn about manual edits to embedded sections?**
   - What we know: User contract is "don't edit ## SKILLS, ## COMMANDS manually." But users might forget.
   - What's unclear: Whether to detect manual edits and warn, or silently replace.
   - Recommendation: SILENT replacement for v1. Embedded sections are replaced on every run (idempotency prevents no-op writes). Manual edits will be overwritten. Document clearly in template comment.

## Sources

### Primary (HIGH confidence)

- [remark GitHub Repository](https://github.com/remarkjs/remark) - Official markdown processor with plugin ecosystem (7.5M downloads/week)
- [unified Ecosystem Documentation](https://unifiedjs.com/) - Official unified collective documentation for AST processing
- [Node.js Crypto API Documentation](https://nodejs.org/api/crypto.html) - Official crypto.createHash documentation (v25.6.0)
- [Markdown Heading Regex Patterns](https://www.markdownlang.com/basic/headings.html) - Markdown heading syntax documentation
- [markdownlint Rules Documentation](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) - MD024 sibling heading detection rules

### Secondary (MEDIUM confidence)

- [Transforming Markdown with Remark & Rehype](https://www.ryanfiller.com/blog/remark-and-rehype-plugins) - Practical remark plugin usage patterns
- [How I Used Unified, Remark, and Rehype](https://ondrejsevcik.com/blog/building-perfect-markdown-processor-for-my-blog) - Real-world markdown processing approach
- [markdown-replace-section GitHub](https://github.com/renke/markdown-replace-section) - Section replacement pattern (unmaintained but good reference)
- [update-markdown GitHub](https://github.com/bahmutov/update-markdown) - Alternative section update approach
- [gray-matter npm package](https://www.npmjs.com/package/gray-matter) - YAML frontmatter parsing (already dependency)

### Tertiary (LOW confidence - marked for validation)

- [Idempotency in Data Pipelines](https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines) - Idempotency patterns (database context, not file operations)
- [String Hashing Algorithms](https://cp-algorithms.com/string/string-hashing.html) - Hash-based comparison theory
- [PyMarkdown Linter MD024 Rule](https://pymarkdown.readthedocs.io/en/stable/plugins/rule_md024/) - Sibling heading detection (Python context)

## Metadata

**Confidence breakdown:**
- Section detection regex: HIGH - Simple regex patterns for heading detection are well-established
- Idempotency patterns: HIGH - Hash-based comparison using Phase 2 infrastructure
- User content preservation: HIGH - Hash validation pattern is straightforward
- Whitespace handling: MEDIUM - Normalization rules have some judgment calls
- Missing skill handling: MEDIUM - Warning mechanism deferred to Phase 4 CLI

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable patterns, no fast-moving changes expected)

---

*Phase: 03-core-embedding*
*Research complete: 2026-02-04*
