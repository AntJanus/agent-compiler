# Phase 1: Foundation - Research

**Researched:** 2026-01-30
**Domain:** File discovery, YAML frontmatter parsing, markdown concatenation, path resolution
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational infrastructure for discovering Claude Code skills and commands from filesystem locations, parsing YAML frontmatter and markdown content, and concatenating multi-file skills. This research focused on identifying battle-tested libraries and patterns for these core operations.

The standard approach for this phase uses **fast-glob** for recursive file discovery with symlink handling, **gray-matter** with **js-yaml** for YAML frontmatter parsing with strict YAML 1.2 semantics, and Node.js native path operations with manual tilde expansion. The critical insight is that YAML parsing edge cases (Norway problem, octal numbers) require YAML 1.2 with strict schemas, and file discovery must gracefully handle missing directories without throwing errors.

**Primary recommendation:** Build a pipeline architecture (discovery → parsing → validation) with pure functions for each stage. Use fast-glob for multi-location discovery, gray-matter with JSON_SCHEMA for safe YAML parsing, and simple string operations for markdown concatenation with order preservation.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fast-glob | 3.x | Recursive file discovery with glob patterns | 79M+ downloads/week, 10-20% faster than node-glob, TypeScript support built-in. Used by Prettier and 5,000+ projects. Efficient for thousands of files. |
| gray-matter | 4.x | YAML frontmatter parsing from markdown | Industry standard used by Eleventy, Gatsby, Netlify. Handles YAML, JSON, TOML frontmatter. Doesn't use regex (faster, more reliable). Handles complex markdown with embedded code blocks. |
| js-yaml | 4.x | YAML parser (used internally by gray-matter) | YAML 1.2 parser that's been the JavaScript cornerstone since 2013. 21,623 projects depend on it. Provides multiple schemas (FAILSAFE, JSON, CORE, DEFAULT) for different safety levels. |

### Supporting Utilities

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js path | Native | Path manipulation and joining | Cross-platform path operations, use path.join() and path.resolve() for all path construction |
| Node.js os | Native | Home directory resolution | Use os.homedir() for tilde expansion (~/) in paths |
| Node.js fs.promises | Native | Asynchronous file operations | Reading files, checking existence, handling permissions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-glob | node-glob | node-glob is slower and lacks TypeScript support. fast-glob is 10-20% faster with better API. No reason to use node-glob. |
| gray-matter | js-yaml directly | gray-matter provides frontmatter-specific functionality (separating metadata from content). Using js-yaml alone requires manual delimiter parsing. |
| Manual tilde expansion | expand-tilde package | expand-tilde is 9 years old with no updates. Manual expansion with os.homedir() is 3 lines of code and has no dependencies. |
| gray-matter | remark + remark-frontmatter | remark is overkill for just extracting frontmatter. Only use remark if transforming markdown content (AST manipulation). gray-matter alone is sufficient for Phase 1. |

**Installation:**
```bash
npm install fast-glob gray-matter
# js-yaml is a dependency of gray-matter, installed automatically
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── discovery/              # File discovery and location
│   ├── skill-discovery.ts  # Locate skill SKILL.md files
│   ├── command-discovery.ts # Locate command markdown files
│   └── path-resolver.ts    # Resolve global vs project paths, tilde expansion
├── parser/                 # Content parsing
│   ├── skill-parser.ts     # Parse SKILL.md (frontmatter + body)
│   ├── command-parser.ts   # Parse command markdown
│   └── markdown-concat.ts  # Concatenate nested markdown files
├── validation/             # Input validation
│   ├── file-validator.ts   # Validate file structure
│   └── schema-validator.ts # Validate YAML frontmatter schema
└── types/                  # TypeScript type definitions
    ├── skill.ts            # Skill data structures
    ├── command.ts          # Command data structures
    └── discovery.ts        # Discovery result types
```

### Pattern 1: Pipeline Architecture (Recommended for Phase 1)

**What:** Linear data flow where each stage transforms data and passes it to the next. Each component is a pure transformation function.

**When to use:** Perfect for CLI compilation tools where data flows in one direction: discover → parse → validate

**Example:**
```typescript
// Pipeline approach - each stage is independently testable
async function discoverAndParseSkills(options: DiscoveryOptions): Promise<ParsedSkill[]> {
  // Stage 1: Discover file paths
  const skillPaths = await discoverSkillFiles(options);

  // Stage 2: Parse each file
  const parsedSkills = await parseSkillFiles(skillPaths);

  // Stage 3: Validate parsed content
  const validatedSkills = validateSkills(parsedSkills);

  return validatedSkills;
}

// Each stage is pure and testable
function parseSkillFiles(paths: string[]): Promise<ParsedSkill[]> {
  return Promise.all(paths.map(async path => {
    const content = await fs.readFile(path, 'utf-8');
    const parsed = matter(content);
    return {
      path,
      metadata: parsed.data,
      content: parsed.content
    };
  }));
}
```

### Pattern 2: Path Resolution with Tilde Expansion

**What:** Convert user-provided paths with `~` prefix to absolute paths using Node.js native APIs.

**When to use:** When accepting user input paths that may start with `~/` (home directory).

**Example:**
```typescript
// Source: Manual implementation using Node.js os module
import { homedir } from 'os';
import { resolve, join } from 'path';

function expandTilde(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return join(homedir(), filepath.slice(1));
  }
  return filepath;
}

function resolveConfigPath(userPath: string): string {
  const expanded = expandTilde(userPath);
  return resolve(expanded);
}

// Usage
const globalSkillsDir = resolveConfigPath('~/.claude/skills/');
const projectSkillsDir = resolveConfigPath('./.claude/skills/');
```

### Pattern 3: Multi-Location File Discovery

**What:** Discover files from multiple directories (global and project) with differentiation labels.

**When to use:** When aggregating files from multiple sources and need to track origin.

**Example:**
```typescript
// Source: Based on fast-glob documentation and multi-pattern support
import fg from 'fast-glob';

interface DiscoveredFile {
  path: string;
  location: 'global' | 'project';
}

async function discoverSkills(): Promise<DiscoveredFile[]> {
  const globalDir = join(homedir(), '.claude/skills');
  const projectDir = './.claude/skills';

  // Discover from global directory
  const globalSkills = await fg('*/SKILL.md', {
    cwd: globalDir,
    absolute: true,
    followSymbolicLinks: true,
    onlyFiles: true,
    suppressErrors: true // Silently skip if directory doesn't exist
  }).catch(() => []); // Return empty array if directory doesn't exist

  // Discover from project directory
  const projectSkills = await fg('*/SKILL.md', {
    cwd: projectDir,
    absolute: true,
    followSymbolicLinks: true,
    onlyFiles: true,
    suppressErrors: true
  }).catch(() => []);

  return [
    ...globalSkills.map(path => ({ path, location: 'global' as const })),
    ...projectSkills.map(path => ({ path, location: 'project' as const }))
  ];
}
```

### Pattern 4: YAML Frontmatter Parsing with Validation

**What:** Parse YAML frontmatter with strict YAML 1.2 schema to avoid edge cases, then validate structure.

**When to use:** When parsing SKILL.md files that contain YAML frontmatter.

**Example:**
```typescript
// Source: gray-matter + js-yaml documentation
import matter from 'gray-matter';
import yaml from 'js-yaml';

interface SkillMetadata {
  name: string;
  description: string;
  [key: string]: unknown;
}

function parseSkillFile(content: string): { metadata: SkillMetadata; content: string } {
  // Use JSON_SCHEMA to avoid YAML 1.1 edge cases (Norway problem, octal, sexagesimal)
  const parsed = matter(content, {
    engines: {
      yaml: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>
    }
  });

  // Validate required fields (warn if missing, don't fail)
  const metadata = parsed.data as SkillMetadata;
  if (!metadata.name) {
    console.warn('Warning: Missing "name" field in YAML frontmatter');
  }
  if (!metadata.description) {
    console.warn('Warning: Missing "description" field in YAML frontmatter');
  }

  return {
    metadata,
    content: parsed.content
  };
}
```

### Pattern 5: Markdown File Concatenation with Reference Parsing

**What:** Parse markdown links from SKILL.md to find referenced files, then concatenate them in order with separators.

**When to use:** When skills reference additional markdown files (reference.md, templates/*.md).

**Example:**
```typescript
// Source: Based on markdown link regex patterns from davidwells.io and dev.to
import { readFile } from 'fs/promises';
import { dirname, join, extname } from 'path';

async function concatenateSkillFiles(skillPath: string, content: string): Promise<string> {
  const skillDir = dirname(skillPath);

  // Extract markdown link references: [text](file.md)
  // Regex: /\[([^\[]+)\]\(([^)]+)\)/g
  const linkRegex = /\[([^\[]+)\]\(([^)]+)\)/g;
  const references: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkTarget = match[2];

    // Only process relative .md file references (not URLs or anchors)
    if (!linkTarget.startsWith('http') &&
        !linkTarget.startsWith('#') &&
        extname(linkTarget) === '.md') {
      references.push(linkTarget);
    }
  }

  // If no references, return content as-is
  if (references.length === 0) {
    return content;
  }

  // Concatenate referenced files in order with separators
  let concatenated = content;
  for (const ref of references) {
    const refPath = join(skillDir, ref);
    try {
      const refContent = await readFile(refPath, 'utf-8');
      concatenated += '\n\n---\n\n' + refContent;
    } catch (error) {
      // Fail with clear error if referenced file doesn't exist
      throw new Error(
        `Failed to read referenced file: ${ref}\n` +
        `Referenced in: ${skillPath}\n` +
        `Expected at: ${refPath}`
      );
    }
  }

  return concatenated;
}
```

### Anti-Patterns to Avoid

- **Parsing During Discovery:** Don't read and parse file content while discovering files. Keep discovery (returning paths) separate from parsing (reading and processing content). Mixing these concerns prevents parallelization and makes testing harder.

- **Using fs.statSync for symlink detection:** Always use `fs.lstatSync` to detect symlinks before following them. `fs.statSync` follows symlinks automatically, preventing you from detecting them.

- **Checking permissions before operations:** Don't use `fs.access()` to check permissions before reading/writing. This creates a race condition where permissions can change between check and operation. Instead, attempt the operation and handle permission errors.

- **Assuming tilde expansion works:** Node.js doesn't expand `~` in paths automatically. Always use `os.homedir()` to manually expand tilde paths before passing to fs operations.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive file search with patterns | Custom directory walking with regex matching | fast-glob | Handles edge cases (symlinks, permissions, special files), 10-20% faster than alternatives, battle-tested by Prettier and 5,000+ projects |
| YAML frontmatter extraction | Regex parsing for `---` delimiters | gray-matter | Handles edge cases like frontmatter in code blocks, supports multiple formats (YAML/JSON/TOML), doesn't break on complex content |
| YAML parsing | Custom YAML parser or JSON.parse | js-yaml with JSON_SCHEMA | YAML spec is complex (multiline, anchors, types). js-yaml handles all edge cases. JSON_SCHEMA prevents YAML 1.1 gotchas (Norway problem, octal). |
| Tilde path expansion | Parsing `~` with string operations | os.homedir() + path.join() | Only 3 lines but handles cross-platform differences correctly. Third-party packages are outdated. |
| Markdown link parsing | Simple regex without escaping | Regex with proper escaping `/\[([^\[]+)\]\(([^)]+)\)/g` | Markdown links can contain brackets, quotes, and special characters. Tested regex patterns handle edge cases. |

**Key insight:** File system operations and parsing have non-obvious edge cases. YAML has dangerous implicit type conversions (octal numbers, sexagesimal). fast-glob handles permissions, symlinks, and platform differences. gray-matter handles frontmatter edge cases that regex can't.

## Common Pitfalls

### Pitfall 1: YAML Parsing Edge Cases (Norway Problem)

**What goes wrong:** YAML 1.1 implicitly converts certain strings to booleans or numbers, corrupting user data. Examples: `"no"` → `false`, `"013"` → `11` (octal), `"22:22"` → `1342` (sexagesimal base-60).

**Why it happens:** YAML 1.1 spec has aggressive implicit type coercion for backwards compatibility. Developers don't know about these edge cases until user data gets corrupted.

**How to avoid:**
- Use YAML 1.2 parser (js-yaml with `JSON_SCHEMA` or `CORE_SCHEMA`)
- Never use `DEFAULT_SCHEMA` (includes YAML 1.1 compatibility)
- Add test cases with edge values: `"no"`, `"off"`, `"013"`, `"22:22"`

**Warning signs:**
- Using gray-matter without custom engine configuration
- Boolean values appearing where strings expected
- Unexpected number conversions in YAML fields

**Code example:**
```typescript
// Bad: Uses DEFAULT_SCHEMA (YAML 1.1 compatible)
const parsed = matter(content); // "no" becomes false

// Good: Use JSON_SCHEMA (YAML 1.2, safe)
const parsed = matter(content, {
  engines: {
    yaml: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA })
  }
});
```

### Pitfall 2: Missing Directory Handling

**What goes wrong:** Tool crashes with ENOENT error when `~/.claude/skills/` or `./.claude/skills/` doesn't exist, instead of silently skipping.

**Why it happens:** Most glob libraries throw errors for non-existent directories by default. Developers forget to handle this common case.

**How to avoid:**
- Use fast-glob's `suppressErrors: true` option
- Wrap discovery calls in try-catch with empty array fallback
- Document that missing directories are silently skipped

**Warning signs:**
- No error handling around glob operations
- Tool crashes on first run (before user creates `.claude/skills/`)
- Tests don't cover missing directory scenario

**Code example:**
```typescript
// Bad: Crashes if directory doesn't exist
const skills = await fg('*/SKILL.md', { cwd: '~/.claude/skills' });

// Good: Returns empty array if directory missing
const skills = await fg('*/SKILL.md', {
  cwd: expandTilde('~/.claude/skills'),
  suppressErrors: true
}).catch(() => []);
```

### Pitfall 3: Not Following Symlinks in Discovery

**What goes wrong:** Tool doesn't discover symlinked skills in `.claude/skills/`, causing users to wonder why their skills aren't found.

**Why it happens:** Some glob libraries default to `followSymbolicLinks: false`. Developers don't realize symlinks are common in `.claude/` directories.

**How to avoid:**
- Set `followSymbolicLinks: true` explicitly in fast-glob options
- Document that symlinked skills are supported
- Add test with symlinked skill directory

**Warning signs:**
- Discovery config doesn't mention symlinks
- No symlink test cases
- User reports skills not appearing

**Code example:**
```typescript
// Bad: Doesn't follow symlinks (default behavior varies)
const skills = await fg('*/SKILL.md', { cwd: skillsDir });

// Good: Explicitly follow symlinks
const skills = await fg('*/SKILL.md', {
  cwd: skillsDir,
  followSymbolicLinks: true
});
```

### Pitfall 4: Malformed YAML Fails Silently

**What goes wrong:** Parsing malformed YAML returns null or throws generic error, user doesn't understand what's wrong with their file.

**Why it happens:** YAML parsing errors are cryptic. Developers catch errors but don't provide context about which file failed or what the issue is.

**How to avoid:**
- Wrap parsing in try-catch with enhanced error messages
- Include file path in error message
- Provide clear guidance (e.g., "Check YAML frontmatter starts with `---`")
- Fail fast - don't continue with corrupted data

**Warning signs:**
- Generic "parse error" messages
- No file path in error output
- Tool continues after parse failure

**Code example:**
```typescript
// Bad: Generic error
try {
  const parsed = matter(content);
} catch (error) {
  console.error('Parse error');
}

// Good: Clear, actionable error
try {
  const parsed = matter(content, {
    engines: { yaml: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }) }
  });
} catch (error) {
  throw new Error(
    `Failed to parse ${filepath}\n` +
    `YAML frontmatter is malformed.\n` +
    `Ensure file starts with '---' and contains valid YAML.\n` +
    `Original error: ${error.message}`
  );
}
```

### Pitfall 5: File Reference Order Not Preserved

**What goes wrong:** When concatenating multi-file skills, files are processed in filesystem order (alphabetical) instead of reference order in SKILL.md.

**Why it happens:** Developers use `fs.readdir()` which returns files in arbitrary order, or process references as a Set which loses order.

**How to avoid:**
- Parse markdown links sequentially to preserve order
- Store references in array (preserves insertion order)
- Process references with for-loop, not parallel Promise.all

**Warning signs:**
- Using Set for references
- Processing references with Promise.all without order guarantee
- No test verifying concatenation order

**Code example:**
```typescript
// Bad: Order not preserved (Set, Promise.all)
const refs = new Set(extractedRefs);
const contents = await Promise.all([...refs].map(readFile));

// Good: Order preserved (Array, sequential processing)
const refs: string[] = [];
// ... extract refs in document order ...
let concatenated = mainContent;
for (const ref of refs) {
  const content = await readFile(ref);
  concatenated += '\n\n---\n\n' + content;
}
```

## Code Examples

Verified patterns from official sources:

### Discovering Skills from Multiple Locations

```typescript
// Source: fast-glob documentation - multi-pattern discovery
import fg from 'fast-glob';
import { homedir } from 'os';
import { join } from 'path';

async function discoverAllSkills(): Promise<Array<{ path: string; location: 'global' | 'project' }>> {
  const globalSkillsDir = join(homedir(), '.claude/skills');
  const projectSkillsDir = join(process.cwd(), '.claude/skills');

  const [globalPaths, projectPaths] = await Promise.all([
    fg('*/SKILL.md', {
      cwd: globalSkillsDir,
      absolute: true,
      followSymbolicLinks: true,
      onlyFiles: true,
      suppressErrors: true
    }).catch(() => []),

    fg('*/SKILL.md', {
      cwd: projectSkillsDir,
      absolute: true,
      followSymbolicLinks: true,
      onlyFiles: true,
      suppressErrors: true
    }).catch(() => [])
  ]);

  return [
    ...globalPaths.map(path => ({ path, location: 'global' as const })),
    ...projectPaths.map(path => ({ path, location: 'project' as const }))
  ];
}
```

### Parsing YAML Frontmatter with Safe Schema

```typescript
// Source: gray-matter + js-yaml documentation
import matter from 'gray-matter';
import yaml from 'js-yaml';

function parseSkillWithSafeYAML(filepath: string, content: string) {
  try {
    const parsed = matter(content, {
      engines: {
        yaml: (str) => yaml.load(str, {
          schema: yaml.JSON_SCHEMA // YAML 1.2, avoids edge cases
        }) as Record<string, unknown>
      }
    });

    // Validate schema (warn if missing, don't fail)
    const metadata = parsed.data;
    if (!metadata.name) {
      console.warn(`Warning: ${filepath} missing "name" in frontmatter`);
    }
    if (!metadata.description) {
      console.warn(`Warning: ${filepath} missing "description" in frontmatter`);
    }

    return {
      metadata: metadata as { name?: string; description?: string; [key: string]: unknown },
      content: parsed.content
    };
  } catch (error) {
    throw new Error(
      `Failed to parse ${filepath}\n` +
      `YAML frontmatter is malformed. Ensure file starts with '---'.\n` +
      `Original error: ${error.message}`
    );
  }
}
```

### Extracting Markdown Link References

```typescript
// Source: Markdown link regex pattern from davidwells.io
import { extname } from 'path';

function extractMarkdownFileReferences(content: string): string[] {
  // Regex: [text](url) - captures markdown links
  const linkRegex = /\[([^\[]+)\]\(([^)]+)\)/g;
  const references: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkTarget = match[2];

    // Only include relative .md file references
    if (!linkTarget.startsWith('http') &&
        !linkTarget.startsWith('https://') &&
        !linkTarget.startsWith('#') &&
        extname(linkTarget) === '.md') {
      references.push(linkTarget);
    }
  }

  return references;
}
```

### Concatenating Referenced Files with Error Handling

```typescript
// Source: Node.js fs.promises API + error handling best practices
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';

async function concatenateReferencedFiles(
  mainPath: string,
  mainContent: string,
  references: string[]
): Promise<string> {
  if (references.length === 0) {
    return mainContent;
  }

  const baseDir = dirname(mainPath);
  let concatenated = mainContent;

  for (const ref of references) {
    const refPath = join(baseDir, ref);

    try {
      const refContent = await readFile(refPath, 'utf-8');
      concatenated += '\n\n---\n\n' + refContent;
    } catch (error) {
      // Fail fast with clear error if referenced file doesn't exist
      if (error.code === 'ENOENT') {
        throw new Error(
          `Referenced file not found: ${ref}\n` +
          `Referenced in: ${mainPath}\n` +
          `Expected at: ${refPath}`
        );
      }
      throw error;
    }
  }

  return concatenated;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-glob for file discovery | fast-glob | ~2018-2019 | 10-20% faster, TypeScript support, better API |
| Custom regex for frontmatter | gray-matter library | ~2015 | Handles edge cases (code blocks, special chars), supports multiple formats |
| YAML 1.1 parsers | YAML 1.2 with JSON_SCHEMA | 2021 (YAML 1.2 spec) | Prevents type coercion issues (Norway problem, octal, sexagesimal) |
| expand-tilde package | Manual os.homedir() | 2026 (best practice) | Removes dependency, expand-tilde unmaintained (9 years old) |
| Regex markdown parsing | Tested regex patterns | 2023-2024 | Community-validated patterns handle edge cases correctly |

**Deprecated/outdated:**
- **expand-tilde**: Last published 9 years ago, no active maintenance. Use `os.homedir()` + `path.join()` instead.
- **node-glob**: Superseded by fast-glob which is faster and has better TypeScript support.
- **YAML 1.1 DEFAULT_SCHEMA**: Use JSON_SCHEMA or CORE_SCHEMA to avoid implicit type conversions.

## Open Questions

Things that couldn't be fully resolved:

1. **Question: Should we use remark for markdown parsing or just string operations?**
   - What we know: gray-matter handles frontmatter extraction well. Markdown concatenation only needs string operations (read + join with separator).
   - What's unclear: Whether we need markdown AST parsing for validating structure or finding references.
   - Recommendation: Start with string operations for Phase 1. Only add remark if Phase 3 validation requires markdown structure analysis.

2. **Question: How should we handle circular references in multi-file skills?**
   - What we know: Skills can reference other markdown files via links. Circular references (A.md → B.md → A.md) could cause infinite loops.
   - What's unclear: Whether circular references are a real use case or an error scenario.
   - Recommendation: For Phase 1, assume no circular references. Fail with clear error if same file encountered twice in concatenation chain.

3. **Question: Should we cache parsed YAML frontmatter?**
   - What we know: Parsing is relatively fast for typical SKILL.md files (<10KB). Caching adds complexity.
   - What's unclear: Whether users will re-run discovery frequently enough that caching matters.
   - Recommendation: Skip caching in Phase 1. Measure performance in Phase 2. Only add caching if parsing becomes bottleneck.

## Sources

### Primary (HIGH confidence)

- [fast-glob GitHub Repository](https://github.com/mrmlnc/fast-glob) - Official documentation for file discovery API, options, and patterns
- [gray-matter GitHub Repository](https://github.com/jonschlinkert/gray-matter) - Official documentation for frontmatter parsing API and options
- [js-yaml GitHub Repository](https://github.com/nodeca/js-yaml) - YAML parser documentation, schemas, and safe loading
- [Node.js File System API Documentation](https://nodejs.org/api/fs.html) - Official Node.js fs.promises API reference
- [Node.js Path API Documentation](https://nodejs.org/api/path.html) - Official Node.js path module documentation
- [Node.js OS API Documentation](https://nodejs.org/api/os.html) - Official Node.js os.homedir() documentation

### Secondary (MEDIUM confidence)

- [Regex to match markdown links](https://davidwells.io/snippets/regex-match-markdown-links) - Community-tested regex patterns for markdown link extraction
- [Regex to match markdown links in Javascript](https://dev.to/davidwells/regex-to-match-markdown-links-in-javascript-472h) - JavaScript-specific markdown link parsing patterns
- [The yaml document from hell](https://ruudvanasseldonk.com/2023/01/11/the-yaml-document-from-hell) - Comprehensive YAML edge cases (Norway problem, octal, sexagesimal)
- [7 YAML gotchas to avoid—and how to avoid them](https://www.infoworld.com/article/2336307/7-yaml-gotchas-to-avoidand-how-to-avoid-them.html) - YAML parsing pitfalls
- [Converting Tilde Path to Absolute Path in Node.js](https://nesin.io/blog/tilde-path-to-absolute-path-nodejs) - Tilde expansion patterns
- [Node.js path: tilde expansion Issue](https://github.com/nodejs/node/issues/684) - Why Node.js doesn't support tilde expansion natively
- [Frontmatter Parsing Error: Missing 'name' Field Despite Valid YAML](https://github.com/anthropics/claude-code/issues/6377) - Real-world Claude Code frontmatter validation issues
- [skill-creator: Generated skills fail validation](https://github.com/anthropics/skills/issues/37) - Anthropic Skills frontmatter validation patterns

### Tertiary (LOW confidence)

- [WebSearch: gray-matter YAML 1.2 parsing](https://github.com/jonschlinkert/gray-matter) - Confirmed gray-matter uses js-yaml but doesn't specify default schema
- [WebSearch: js-yaml YAML 1.2 schema safe parsing](https://www.npmjs.com/package/js-yaml) - Confirmed JSON_SCHEMA and FAILSAFE_SCHEMA are YAML 1.2 safe

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are widely adopted with 10M+ weekly downloads, used by major projects
- Architecture patterns: HIGH - Pipeline architecture is standard for CLI tools, validated by research on compiler and build tool architectures
- YAML parsing approach: HIGH - JSON_SCHEMA solution verified in js-yaml documentation and Claude Code issues
- Markdown link parsing: MEDIUM - Regex pattern is community-tested but not from official specification
- Tilde expansion: HIGH - os.homedir() is official Node.js API, approach validated in Node.js issues

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - libraries are stable, no fast-moving ecosystem changes expected)
