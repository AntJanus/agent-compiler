# Architecture Research

**Domain:** CLI compilation/embedding tools
**Researched:** 2026-01-30
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                         │
│              (argument parsing, orchestration)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  File   │  │ Parser  │  │Content  │  │  File   │        │
│  │Discovery│  │ Engine  │  │Embedder │  │ Writer  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                      Data Flow                               │
├─────────────────────────────────────────────────────────────┤
│                    Supporting Services                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │Validation Service│  │  Backup Service  │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| CLI Entry Point | Parse args, orchestrate wizard flow, handle errors | Commander.js or yargs for arg parsing + prompts for TUI |
| File Discovery | Locate skills/commands in global and project directories | fast-glob or node-glob with recursive pattern matching |
| Parser Engine | Parse YAML frontmatter and markdown content | gray-matter for frontmatter + markdown-it for markdown parsing |
| Content Embedder | Merge discovered content with target file, remove old sections | String manipulation, AST transformation, or template engine |
| File Writer | Write output with atomic operations, manage backups | fs.promises with atomic write patterns |
| Validation Service | Validate file structure, detect malformed content | JSON schema validation + custom validators |
| Backup Service | Create timestamped backups before modification | fs.copyFile with timestamp naming |

## Recommended Project Structure

```
src/
├── cli/                    # CLI entry point and command definitions
│   ├── commands/           # Command implementations (compile, etc.)
│   ├── prompts/            # Interactive wizard prompts
│   └── index.ts            # Main CLI entry point
├── discovery/              # File discovery and location
│   ├── skill-discovery.ts  # Locate skill directories
│   ├── command-discovery.ts # Locate command files
│   └── path-resolver.ts    # Resolve global vs project paths
├── parser/                 # Content parsing
│   ├── skill-parser.ts     # Parse SKILL.md (frontmatter + body)
│   ├── command-parser.ts   # Parse command markdown
│   └── markdown-concat.ts  # Concatenate nested markdown files
├── embedder/               # Content embedding logic
│   ├── section-remover.ts  # Remove old embedded sections
│   ├── content-merger.ts   # Merge new content with original
│   └── output-builder.ts   # Build final output structure
├── writer/                 # File writing operations
│   ├── atomic-writer.ts    # Atomic file write operations
│   └── backup-manager.ts   # Backup creation and management
├── validation/             # Input validation
│   ├── file-validator.ts   # Validate file structure
│   └── schema-validator.ts # Validate YAML frontmatter
├── types/                  # TypeScript type definitions
│   ├── skill.ts            # Skill data structures
│   ├── command.ts          # Command data structures
│   └── config.ts           # Configuration types
└── utils/                  # Shared utilities
    ├── error-handler.ts    # Error handling and user feedback
    └── logger.ts           # Logging utilities
```

### Structure Rationale

- **cli/:** Separates user-facing interface from business logic, making it easy to add new commands or change TUI framework
- **discovery/:** Isolated concern - file system operations separate from parsing logic, easier to test with mocks
- **parser/:** Single responsibility - converts raw file content to structured data, can swap parsing libraries without affecting other components
- **embedder/:** Core business logic - isolated from I/O operations, making it testable with in-memory data structures
- **writer/:** Separated write operations enable atomic writes, backup management, and rollback without coupling to content logic
- **validation/:** Cross-cutting concern extracted into dedicated module, reusable across discovery, parsing, and embedding

## Architectural Patterns

### Pattern 1: Pipeline Architecture (Recommended)

**What:** Linear data flow where each stage transforms data and passes it to the next stage. Each component is a pure transformation function.

**When to use:** Perfect for CLI compilation tools where data flows in one direction: discover → parse → transform → write

**Trade-offs:**
- Pros: Easy to reason about, easy to test, clear dependencies, simple error handling
- Cons: Less flexible for interactive operations, harder to implement rollback across stages

**Example:**
```typescript
// Pipeline approach
async function compile(options: CompileOptions): Promise<void> {
  const discovered = await discoverFiles(options);
  const parsed = await parseFiles(discovered);
  const embedded = await embedContent(parsed, options);
  await writeOutput(embedded, options);
}

// Each stage is independently testable
function embedContent(parsed: ParsedContent, options: CompileOptions): EmbeddedContent {
  const original = readOriginalFile(options.targetFile);
  const withoutOldSections = removePreviousSections(original);
  const merged = mergeSections(withoutOldSections, parsed);
  return buildOutput(merged);
}
```

### Pattern 2: Service Layer Architecture (Alternative)

**What:** Each major concern (discovery, parsing, embedding, writing) is a service class with dependency injection.

**When to use:** When you need more flexibility, shared state, or complex interactions between components

**Trade-offs:**
- Pros: More flexible, easier to extend, better for complex orchestration
- Cons: More boilerplate, harder to reason about state, potential for circular dependencies

**Example:**
```typescript
// Service-based approach
class CompilerService {
  constructor(
    private discoveryService: DiscoveryService,
    private parserService: ParserService,
    private embedderService: EmbedderService,
    private writerService: WriterService
  ) {}

  async compile(options: CompileOptions): Promise<void> {
    const files = await this.discoveryService.discover(options);
    const parsed = await this.parserService.parseAll(files);
    const embedded = await this.embedderService.embed(parsed, options);
    await this.writerService.write(embedded, options);
  }
}
```

### Pattern 3: Event-Driven Architecture (Not Recommended for v1)

**What:** Components communicate via events rather than direct calls

**When to use:** When you need plugin architecture or want to support middleware/hooks

**Trade-offs:**
- Pros: Highly extensible, supports plugins naturally
- Cons: Harder to debug, implicit dependencies, overkill for simple CLI tool

## Data Flow

### Request Flow

```
[User runs CLI]
    ↓
[Parse CLI args] → [Validate options]
    ↓                      ↓
[Interactive wizard] → [Collect selections]
    ↓
┌─────────────────────────────────────────────────┐
│           Discovery Phase (Parallel)             │
├─────────────────────────────────────────────────┤
│ [Discover global skills] + [Discover project    │
│                             skills]              │
│ [Discover commands]                              │
└───────────────────┬─────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│            Parsing Phase (Parallel)              │
├─────────────────────────────────────────────────┤
│ For each selected file:                          │
│   [Parse YAML frontmatter] → [Extract metadata] │
│   [Parse markdown body]    → [Concatenate nested]│
└───────────────────┬─────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│          Embedding Phase (Sequential)            │
├─────────────────────────────────────────────────┤
│ [Read original file]                             │
│     ↓                                            │
│ [Validate structure]                             │
│     ↓                                            │
│ [Remove old sections: ## SKILLS, ## COMMANDS]   │
│     ↓                                            │
│ [Build new sections from parsed content]        │
│     ↓                                            │
│ [Merge sections with original]                  │
└───────────────────┬─────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│          Writing Phase (Sequential)              │
├─────────────────────────────────────────────────┤
│ [Create backup with timestamp]                  │
│     ↓                                            │
│ [Validate output structure]                     │
│     ↓                                            │
│ [Write atomically to target]                    │
│     ↓                                            │
│ [Verify write success]                          │
└─────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Discovery to Selection:** File discovery produces list of available items → User selects subset via TUI → Selected items flow to parsing
2. **Parsing to Embedding:** Each file parses to structured data (metadata + content) → All parsed items aggregate → Embedder organizes by section
3. **Embedding to Writing:** Original file content preserved → Old sections removed → New sections inserted → Output validated → Backup created → File written
4. **Error propagation:** Any stage failure stops pipeline → Clear error message to user → No partial writes → Backup preserved

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 skills | Simple pipeline architecture is fine, all operations synchronous |
| 50-500 skills | Parallel discovery and parsing, introduce progress indicators in TUI |
| 500+ skills | Lazy loading, pagination in TUI, streaming file processing, consider SQLite for metadata caching |

### Scaling Priorities

1. **First bottleneck:** TUI responsiveness with large lists → Solution: Virtual scrolling, fuzzy search filtering, paginated rendering
2. **Second bottleneck:** File I/O when processing hundreds of skills → Solution: Parallel file reading with p-map or Promise.all with concurrency limits
3. **Third bottleneck:** Memory usage from loading all content at once → Solution: Stream-based processing, process skills in batches, write incrementally

## Anti-Patterns

### Anti-Pattern 1: Parsing During Discovery

**What people do:** Read and parse file content while discovering files in a single loop
```typescript
// Bad: mixed concerns
async function discoverAndParse() {
  const files = await glob('**/*.md');
  return files.map(async file => {
    const content = await fs.readFile(file);
    return parseContent(content); // Parsing during discovery
  });
}
```

**Why it's wrong:** Violates separation of concerns, makes it impossible to discover without parsing, harder to parallelize, harder to test, breaks pipeline flow

**Do this instead:** Separate discovery (returns file paths) from parsing (reads and parses content)
```typescript
// Good: separated concerns
async function discover(): Promise<string[]> {
  return await glob('**/*.md');
}

async function parse(filePaths: string[]): Promise<ParsedContent[]> {
  return Promise.all(filePaths.map(async path => {
    const content = await fs.readFile(path);
    return parseContent(content);
  }));
}
```

### Anti-Pattern 2: Direct File Overwrite Without Backup

**What people do:** Write directly to target file without creating backup first
```typescript
// Bad: no safety net
async function writeOutput(content: string, targetPath: string) {
  await fs.writeFile(targetPath, content);
}
```

**Why it's wrong:** Data loss if write fails mid-operation, no rollback capability, corrupted files unrecoverable

**Do this instead:** Always create backup before writing, use atomic writes
```typescript
// Good: safe writes with backup
async function writeOutput(content: string, targetPath: string) {
  const backupPath = `${targetPath}.backup.${Date.now()}`;
  await fs.copyFile(targetPath, backupPath);

  const tempPath = `${targetPath}.tmp`;
  await fs.writeFile(tempPath, content);
  await fs.rename(tempPath, targetPath); // Atomic on POSIX

  console.log(`Backup created: ${backupPath}`);
}
```

### Anti-Pattern 3: Global State for File Content

**What people do:** Store parsed content in module-level variables or singleton state
```typescript
// Bad: global mutable state
let parsedSkills: Skill[] = [];

function addSkill(skill: Skill) {
  parsedSkills.push(skill); // Mutating global state
}
```

**Why it's wrong:** Makes testing impossible, prevents parallel operations, causes race conditions, hard to reason about, breaks in watch mode

**Do this instead:** Pass data through pipeline, use immutable data structures
```typescript
// Good: pure functions with explicit data flow
function addSkill(skills: readonly Skill[], skill: Skill): Skill[] {
  return [...skills, skill]; // Returns new array, doesn't mutate
}
```

### Anti-Pattern 4: Silent Failures

**What people do:** Catch errors but don't report them or continue processing
```typescript
// Bad: swallows errors
async function parseFile(path: string) {
  try {
    return await parse(path);
  } catch (error) {
    return null; // Silent failure
  }
}
```

**Why it's wrong:** User doesn't know what failed, corrupted output, debugging nightmare

**Do this instead:** Fail fast with clear error messages
```typescript
// Good: explicit error handling
async function parseFile(path: string): Promise<ParsedContent> {
  try {
    return await parse(path);
  } catch (error) {
    throw new Error(
      `Failed to parse ${path}: ${error.message}\n` +
      `Check that the file has valid YAML frontmatter and markdown content.`
    );
  }
}
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| File System | async fs.promises API | Use atomic writes (write to temp, then rename) |
| YAML Parser | gray-matter library | Battle-tested, handles frontmatter + content split |
| Markdown Parser | markdown-it or marked.js | Only needed if validating/transforming markdown structure |
| Glob Matching | fast-glob library | Much faster than node-glob, handles ignore patterns |
| CLI Framework | Commander.js + prompts | Commander for args, prompts for interactive wizard |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Discovery ↔ Parser | File paths (strings) | Discovery returns paths, Parser receives paths |
| Parser ↔ Embedder | Structured data (typed objects) | Parser returns {metadata, content}, Embedder consumes |
| Embedder ↔ Writer | Formatted output (string) | Embedder returns final markdown string, Writer saves |
| CLI ↔ All Services | Function calls (pipeline) | CLI orchestrates, services are pure functions |

## Build Order & Dependencies

### Phase 1: Foundation (No Dependencies)
**Components:** Type definitions, utilities, error handling
**Rationale:** These have no dependencies and are needed by all other components

### Phase 2: File Operations (Depends on: Phase 1)
**Components:** Discovery service, Backup service
**Rationale:** Pure file system operations, no parsing logic needed yet

### Phase 3: Content Processing (Depends on: Phase 1, Phase 2)
**Components:** Parser engine, Validation service
**Rationale:** Needs file discovery to test with real files, needs types from Phase 1

### Phase 4: Business Logic (Depends on: Phase 3)
**Components:** Content embedder (section remover, merger, builder)
**Rationale:** Needs parsed content to operate on, can work with in-memory data for testing

### Phase 5: Output (Depends on: Phase 2, Phase 4)
**Components:** File writer (atomic writer using backup service)
**Rationale:** Needs backup service from Phase 2, receives content from embedder

### Phase 6: User Interface (Depends on: All previous)
**Components:** CLI entry point, command definitions, interactive prompts
**Rationale:** Orchestrates all services, last piece to integrate everything

**Key Insight:** Building in this order allows each phase to be tested independently before integration. Discovery and Parser can be built in parallel since they don't depend on each other.

## Key Architectural Decisions for Agent Compiler

Based on the project requirements, here are the recommended decisions:

### 1. Should parsing be separate from discovery?
**Recommendation:** YES, absolutely separate

**Rationale:**
- Discovery is file system I/O (can fail due to permissions, paths)
- Parsing is content processing (can fail due to malformed YAML/markdown)
- Different failure modes need different error messages
- Allows parallel discovery of multiple directories, then batch parsing
- Makes testing easier (mock file system vs mock file content)

### 2. Should backup be a separate concern?
**Recommendation:** YES, dedicated backup service

**Rationale:**
- Backup needs to happen before any write operation
- Should be reusable if we add more write operations later
- Enables consistent backup naming (timestamps)
- Allows centralized backup cleanup (future feature: prune old backups)
- Makes rollback logic simpler (backup path is known)

### 3. Parser architecture for nested markdown?
**Recommendation:** Two-phase parsing: frontmatter extraction → content concatenation

**Rationale:**
- SKILL.md needs gray-matter for frontmatter
- Supporting files (reference.md, templates/) need concatenation only
- Skip non-markdown files naturally in concatenation phase
- Preserve original frontmatter metadata separately from body content

### 4. Section removal strategy?
**Recommendation:** Regex-based section removal with clear boundaries

**Rationale:**
- Simple and predictable (find `## SKILLS` → find next `##` or EOF → remove)
- Fast for typical file sizes (CLAUDE.md under 100KB)
- Easy to test (string in → string out)
- More complex AST-based approach is overkill for markdown sections

### 5. Error handling strategy?
**Recommendation:** Fail fast with context-rich errors

**Rationale:**
- CLI tools should never produce partial/corrupted output
- Users need to know exactly what went wrong and where
- Stack traces are useless to end users → transform to readable messages
- Example: "Failed to parse ~/.claude/skills/review-pr/SKILL.md: Missing YAML frontmatter. Ensure file starts with '---'"

## Sources

### CLI Architecture & Design Patterns
- [Modern CLI Tools in 2026](https://medium.com/the-software-journal/7-modern-cli-tools-you-must-try-in-2026-c4ecab6a9928) - Overview of modern CLI tool characteristics and AI integration
- [Understanding Terminal Architecture (January 2026)](https://medium.com/connected-things/understanding-terminal-architecture-from-ttys-to-modern-cli-tools-f42fe08652a3) - Terminal architecture fundamentals and CLI design principles
- [CLI Engineer Architecture](https://github.com/trilogy-group/cli_engineer/blob/main/docs/architecture.md) - Separation of concerns in production CLI tools
- [Building CLI Tools with Node.js](https://byby.dev/node-command-line-libraries) - Top 12 libraries and implementation patterns

### Bundler & Compiler Architecture
- [Vite vs. Webpack in 2026](https://dev.to/pockit_tools/vite-vs-webpack-in-2026-a-complete-migration-guide-and-deep-performance-analysis-5ej5) - Modern bundler architecture and build pipeline design
- [How Vite Works](https://harlanzw.com/blog/how-the-heck-does-vite-work) - Orchestration patterns in build tools
- [Markdown Compiler Architecture](https://medium.com/swlh/entry-level-compiler-ba7e91cffbb2) - Tokenization → Parsing → Code Generation pipeline
- [Writing a Markdown Compiler](https://blog.beezwax.net/writing-a-markdown-compiler/) - Three-phase compiler architecture

### File Discovery & Parsing
- [node-glob](https://github.com/isaacs/node-glob) - Glob pattern matching for file discovery
- [fast-glob](https://github.com/mrmlnc/fast-glob) - High-performance recursive file search
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - YAML frontmatter parser for markdown
- [marked.js](https://marked.js.org/) - Low-level markdown compiler with CLI interface

### Node.js Design Patterns
- [Node.js Design Patterns](https://nodejsdesignpatterns.com/blog/reading-writing-files-nodejs/) - Modern async patterns and stream processing
- [Clean Architecture in Node.js](https://pkritiotis.io/clean-architecture-in-golang/) - Separation of concerns and dependency management
- [Error Handling Best Practices](https://www.honeybadger.io/blog/errors-nodejs/) - Comprehensive error handling strategies

### Content Embedding & Documentation Tools
- [embedmd](https://github.com/campoy/embedmd) - CLI tool for embedding code into markdown
- [Docusaurus](https://docusaurus.io/docs) - Documentation generator architecture
- [Nextra](https://nextra.site/) - Next.js-based documentation framework

---
*Architecture research for: Agent Compiler - CLI tool for embedding skills and commands*
*Researched: 2026-01-30*
