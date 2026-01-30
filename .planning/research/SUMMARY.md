# Project Research Summary

**Project:** Agent Compiler CLI Tool
**Domain:** CLI Developer Tools - Compilation/Embedding/Bundling
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

Agent Compiler is a Node.js CLI tool that embeds Claude Code skills and commands into project CLAUDE.md files. This domain has well-established patterns: modern CLI tools combine Commander.js for argument parsing, interactive prompts for TUI, and gray-matter for frontmatter extraction. The recommended approach uses Node.js 24 LTS with native TypeScript support, eliminating build steps in development while using tsdown for production bundling.

The architecture follows a pipeline pattern: discover files → parse frontmatter/content → embed into target file → write atomically with backups. This separation of concerns enables independent testing and clear error boundaries. The most critical architectural decision is to **always read before writing** - the number one cause of data loss in file manipulation tools is destructive overwrites without understanding existing content.

Key risks center on file safety: non-atomic writes cause corruption, missing backups prevent recovery, and YAML parsing edge cases silently corrupt data. These are addressed through atomic write-then-rename operations, validated backup creation before all modifications, and strict YAML 1.2 parsing with comprehensive edge case handling. Cross-platform concerns (line endings, encoding, permissions) require explicit UTF-8 handling and testing on Windows, Linux, and macOS.

## Key Findings

### Recommended Stack

Modern Node.js CLIs leverage native TypeScript support in Node.js 24 LTS, eliminating ts-node overhead and enabling `node index.ts` execution in development. TypeScript 5.8+ introduces `--erasableSyntaxOnly` for compatibility. The ecosystem has consolidated around zero-dependency solutions and performance-optimized alternatives to legacy tools.

**Core technologies:**
- **Node.js 24 LTS + TypeScript 5.8+**: Runtime with native type stripping, no build step needed for development, LTS support until April 2028
- **commander.js 12.x**: Zero dependencies, 27.9k stars, strict parsing with typo suggestions, excellent for hierarchical subcommands
- **@clack/prompts 1.x**: 80% smaller than Inquirer, beautiful default styling, modern async/await API for interactive wizards
- **gray-matter 4.x**: Industry standard for frontmatter parsing (used by Gatsby, Eleventy), handles YAML/JSON/TOML, doesn't use regex
- **fast-glob 3.x**: 79M+ downloads/week, 10-20% faster than node-glob, TypeScript definitions included, efficient for large directories
- **tsdown**: Actively maintained (tsup abandoned 2025), ESM-first bundler for npm publishing with dual CJS/ESM output

**Supporting libraries:**
- **picocolors**: 14x smaller and 2x faster than chalk for terminal colors
- **ora**: Loading spinners with 46M+ downloads, auto-handles concurrent writes

**Critical version requirements:**
- Node.js 24+ for native TypeScript support
- TypeScript 5.8+ for Node.js compatibility
- ESM-first architecture ("type": "module" in package.json)

**Confidence:** HIGH - Official LTS documentation, dominant ecosystem libraries, verified compatibility matrix.

### Expected Features

CLI file manipulation tools have clear table stakes around safety and validation. Users expect destructive operations to include backups, preview modes, and clear error messages. The competitive differentiator for Agent Compiler is its Claude Code ecosystem awareness through interactive wizards that guide skill selection.

**Must have (table stakes):**
- **Error handling & validation**: Fail fast with clear, actionable error messages including file paths and resolution steps
- **File backups**: Create timestamped `.bak` files before any overwrite operation, validate backup exists before proceeding
- **Progress indicators**: Spinners for operations >100ms, users expect visual feedback on long-running tasks
- **Color-coded output**: Success/error/info messages with picocolors (industry standard)
- **Interactive prompts**: Wizard-style interface for skill selection (our key differentiator vs concat-md competitors)
- **File discovery**: Automatic detection in both global (`~/.claude/`) and project (`./.claude/`) paths
- **YAML frontmatter parsing**: Extract metadata from SKILL.md files with gray-matter
- **Idempotent operations**: Re-running safely removes old sections before adding new ones
- **Help documentation**: Auto-generated from Commander.js definitions

**Should have (competitive advantage):**
- **Preview/dry-run mode**: Show what will change without applying (`--dry-run` flag), critical for user trust
- **Undo functionality**: Quick rollback using backup history
- **Diff view**: Side-by-side comparison before applying changes
- **Global config file**: Store user preferences in `~/.agent-compiler/config.json`
- **Verification checks**: Validate output integrity after compilation (broken references, malformed markdown)

**Defer (v2+):**
- **Content compression**: Token optimization for LLM consumption (noted in README as future feature)
- **Watch mode**: Auto-recompile on source skill changes (high complexity, defer until use case validation)
- **Smart conflict resolution**: Semantic merging when embedded sections have custom content (defer until patterns emerge)
- **Dependency tracking**: Detect when referenced files change and prompt recompile
- **Template system**: Customizable output format (wait for user demand)

**Anti-features to avoid:**
- GUI mode (defeats CLI purpose, TUI with @clack/prompts is sufficient)
- Auto-commit to git (dangerous, users must review before committing)
- Remote skill fetching (security risk, network dependency)
- Embed everything by default (creates bloated files, forces intentional selection instead)

**Confidence:** HIGH - Patterns validated across similar tools (concat-md, merge-markdown), UX best practices from clig.dev, CLI tools comparison research.

### Architecture Approach

File manipulation CLIs benefit most from **pipeline architecture**: linear data flow where each stage transforms data and passes to next stage. This enables independent testing, clear dependencies, and simple error handling. Each component has a single responsibility with explicit boundaries communicating through typed data structures.

**Major components:**
1. **File Discovery** - Locates skills/commands in global and project directories using fast-glob, returns file paths only (no parsing)
2. **Parser Engine** - Parses YAML frontmatter with gray-matter and markdown content, handles nested files in multi-file skills
3. **Content Embedder** - Merges parsed content with target file by removing old sections (## SKILLS, ## COMMANDS) then inserting new sections
4. **File Writer** - Atomic write operations using write-to-temp-then-rename pattern, manages timestamped backups
5. **Validation Service** - Validates file structure and YAML schema before and after operations, provides actionable error messages
6. **CLI Entry Point** - Commander.js for argument parsing + @clack/prompts for interactive wizard, orchestrates pipeline flow

**Data flow:**
```
[Discover files] → [Parse frontmatter/content] → [Build sections] → [Create backup] → [Write atomically]
```

**Key architectural patterns:**
- **Separation of concerns**: Discovery returns paths, parsing reads content - never mix I/O with parsing logic
- **Pure transformations**: Each pipeline stage is a pure function receiving input and returning output, no global state
- **Fail fast**: Any stage failure stops pipeline with clear error, no partial writes
- **Atomic operations**: All writes use temp-file-then-rename (POSIX atomic guarantee)

**Build order:**
1. Foundation: Types, utilities, error handling (no dependencies)
2. File operations: Discovery, backup (pure file system)
3. Content processing: Parser, validation (needs discovery to test)
4. Business logic: Embedder (needs parsed content)
5. Output: Writer (uses backup service)
6. UI: CLI entry point (orchestrates all services)

**Confidence:** HIGH - Pipeline pattern is standard for CLI compilation tools (verified in Vite, webpack, markdown compilers), separation of concerns validated in production CLI tools.

### Critical Pitfalls

File manipulation CLIs have catastrophic failure modes centered on data loss. The most severe pitfalls involve destructive operations without safety nets, and subtle cross-platform edge cases that corrupt user data.

1. **File overwrite without reading first** (CRITICAL)
   - GitHub Copilot's edit_file tool caused 54% file deletion by completely replacing large files
   - **Prevention**: ALWAYS read file contents before write operations, implement read-modify-write pattern with explicit confirmation
   - **Phase**: Phase 1 (Core File Operations) - establish read-first pattern as architectural requirement

2. **Non-atomic file writes cause corruption** (CRITICAL)
   - Writes fail mid-operation (crash, SIGKILL, disk full) leaving files in inconsistent state
   - **Prevention**: Use write-to-temp-then-rename pattern (guaranteed atomic on POSIX), write to `.tmp` in same directory
   - **Phase**: Phase 2 (Backup & Safety) - all file writes must use atomic operations

3. **Backup failure proceeds with overwrite** (CRITICAL)
   - OneDrive sync bug overwrote files when backup wasn't created due to configuration
   - **Prevention**: Create backup BEFORE modification, validate backup exists and is readable, HALT if backup fails
   - **Phase**: Phase 2 (Backup & Safety) - backup must be first operation with validation gate

4. **YAML parsing edge cases silently corrupt data** (HIGH)
   - YAML 1.1 parses "no" → false, "013" → octal 11, "22:22" → sexagesimal 1342
   - **Prevention**: Use YAML 1.2 parser (js-yaml), force string parsing for ambiguous values, preserve original format on round-trip
   - **Phase**: Phase 1 (Core File Operations) with strict parser, Phase 3 (Validation) with edge case tests

5. **Cross-platform encoding & line endings corruption** (HIGH)
   - Windows CRLF vs Linux/Mac LF, terminal encoding differences (CP437 vs UTF-8)
   - **Prevention**: Always read/write with explicit UTF-8 encoding, normalize line endings internally but preserve on write
   - **Phase**: Phase 1 (Core File Operations) for UTF-8 defaults, Phase 4 (Cross-platform) for testing

6. **Permission errors not handled gracefully** (MEDIUM)
   - Tool crashes with cryptic EACCES errors instead of actionable guidance
   - **Prevention**: Check read/write permissions before operations, provide clear error messages with fix instructions (chmod commands)
   - **Phase**: Phase 3 (Validation & Error Handling) - pre-flight checks with helpful messages

7. **Symlink/junction handling breaks cross-platform** (MEDIUM)
   - Following symlinks modifies target files unintentionally, Windows symlinks require admin
   - **Prevention**: Detect symlinks with fs.lstatSync (not fs.statSync), document behavior, test on all platforms
   - **Phase**: Phase 4 (Cross-platform) - symlink detection and handling strategy

**Additional concerns:**
- **UX pitfalls**: No progress indication (>100ms operations), cryptic error messages, no diff preview, no dry-run mode
- **Performance traps**: Loading entire files into memory (breaks on >100MB), synchronous operations (blocking)
- **Security**: Path traversal validation, no arbitrary YAML code execution, predictable temp file paths

**Confidence:** HIGH - Validated with real-world examples (GitHub Copilot data loss, OneDrive sync bugs), YAML edge cases documented extensively, atomic operations verified in POSIX specs.

## Implications for Roadmap

Based on research, the roadmap must prioritize file safety above all else. The most common failure mode is data loss from destructive overwrites, so Phase 1 must establish the read-first pattern and Phase 2 must implement atomic operations with validated backups before any user-facing features.

### Phase 1: Core File Operations & Parsing
**Rationale:** Foundation must establish safe file handling patterns before building on top. Discovery and parsing are prerequisites for all other work, and their separation enables independent development.

**Delivers:**
- File discovery service (global + project paths, fast-glob integration)
- YAML frontmatter parser (gray-matter with strict mode)
- Markdown content parser (handle nested multi-file skills)
- Path resolution utilities (cross-platform compatibility)
- Read-first pattern enforcement (all file operations require current state)

**Addresses:**
- File discovery (table stakes feature)
- YAML frontmatter parsing (table stakes)
- UTF-8 encoding defaults (prevents cross-platform corruption)

**Avoids:**
- Pitfall #1: File overwrite without reading (enforces read-modify-write pattern)
- Pitfall #4: YAML parsing edge cases (strict YAML 1.2 parser)
- Pitfall #5: Cross-platform encoding (explicit UTF-8)

**Dependencies:** None (foundation phase)

### Phase 2: Backup & Atomic Write Operations
**Rationale:** Safety mechanisms must be in place before implementing any destructive operations. This phase establishes the non-negotiable safety net.

**Delivers:**
- Backup service (timestamped backups with validation)
- Atomic file writer (write-to-temp-then-rename)
- Pre-write validation (verify backup exists before proceeding)
- Error handling for backup failures (halt operation if backup fails)

**Addresses:**
- File backups (table stakes feature)
- Idempotent operations safety (enables re-running without data loss)

**Avoids:**
- Pitfall #2: Non-atomic writes (atomic operations prevent corruption)
- Pitfall #3: Backup failure proceeding (validation gate prevents data loss)

**Dependencies:** Phase 1 (needs file reading utilities)

### Phase 3: Content Embedding & Section Management
**Rationale:** With safety mechanisms in place, implement core business logic. This phase delivers the actual compilation functionality.

**Delivers:**
- Section detection (find ## SKILLS, ## COMMANDS markers)
- Section removal (surgical deletion of old content)
- Content merger (combine parsed skills/commands into sections)
- Output builder (construct final markdown structure)
- Validation service (verify structure, detect malformed content)

**Addresses:**
- Idempotent operations (removes old sections before adding new)
- Section replacement (core compilation logic)

**Avoids:**
- Pitfall #6: Permission errors (validation service checks before operations)
- Complex edge cases through comprehensive validation

**Dependencies:** Phase 1 (needs parsed content), Phase 2 (uses backup service)

### Phase 4: CLI Interface & Interactive Wizard
**Rationale:** User-facing interface comes after core logic is solid. This phase makes the tool usable through interactive skill selection.

**Delivers:**
- Commander.js integration (argument parsing, help generation)
- @clack/prompts wizard (interactive skill selection)
- Progress indicators (ora spinners for long operations)
- Color-coded output (picocolors for success/error/info)
- Exit codes and error messages

**Addresses:**
- Interactive prompts (table stakes, key differentiator)
- Progress indicators (table stakes)
- Color-coded output (table stakes)
- Help documentation (table stakes)
- Error handling with actionable messages

**Avoids:**
- UX pitfalls (no progress, cryptic errors)

**Dependencies:** All previous phases (orchestrates entire pipeline)

### Phase 5: Polish & Cross-Platform Testing
**Rationale:** Core functionality works, now ensure reliability across environments and edge cases.

**Delivers:**
- Cross-platform testing (Windows, Linux, macOS)
- Line ending handling (CRLF vs LF preservation)
- Symlink detection and handling
- Permission error messages with resolution steps
- Edge case validation (empty files, binary files, malformed YAML)

**Addresses:**
- Clear error messages (table stakes)
- Version flag, exit codes (table stakes)

**Avoids:**
- Pitfall #5: Cross-platform encoding/line endings (comprehensive testing)
- Pitfall #7: Symlink handling (detection and strategy)

**Dependencies:** Phase 4 (needs working CLI to test)

### Phase 6: Preview & Safety Features
**Rationale:** Competitive advantage features that build trust and enable confident usage.

**Delivers:**
- Dry-run mode (preview changes without applying)
- Diff view (show before/after comparison)
- Undo command (restore from backup history)
- Verification checks (validate output integrity)

**Addresses:**
- Preview/dry-run mode (competitive advantage)
- Undo functionality (competitive advantage)
- Diff view (competitive advantage)
- Verification checks (competitive advantage)

**Dependencies:** All core phases (enhances existing functionality)

### Phase Ordering Rationale

**Why this sequence:**
1. **Foundation first** - File operations and parsing are prerequisites for everything else, must establish safe patterns immediately
2. **Safety before features** - Backup and atomic operations come before embedding logic to prevent data loss
3. **Core logic isolated** - Embedding logic built on stable foundation, testable with in-memory data
4. **UI last for core** - Interface wraps working business logic, easier to test when services are stable
5. **Polish as enhancement** - Cross-platform and preview features improve existing functionality after core works

**Parallel development opportunities:**
- Phase 1 Discovery and Parser can be built in parallel (no inter-dependencies)
- Phase 2 and Phase 3 validation tests can be written in parallel with implementation

**Critical path:**
- Phase 1 → Phase 2 → Phase 3 → Phase 4 (must be sequential)
- Phase 5 and Phase 6 can begin once Phase 4 demonstrates working end-to-end flow

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Content Embedding)**: Section detection regex patterns need validation against real Claude Code CLAUDE.md files, may need AST parsing research
- **Phase 4 (CLI Interface)**: @clack/prompts TUI patterns for multi-select with filtering, may need to research virtual scrolling for large lists

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (File Operations)**: File discovery and parsing are well-documented, gray-matter and fast-glob have extensive examples
- **Phase 2 (Backup & Safety)**: Atomic write patterns are standard POSIX operations, extensively documented
- **Phase 5 (Cross-platform)**: Line endings and encoding are solved problems with clear best practices
- **Phase 6 (Preview Features)**: Diff libraries (diff, jsdiff) are mature with clear documentation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Node.js 24 LTS verified in official docs, recommended libraries have 25M+ downloads and active development, version compatibility matrix validated |
| Features | HIGH | Table stakes validated against similar tools (concat-md, merge-markdown), UX patterns from clig.dev, competitive analysis shows clear differentiators |
| Architecture | HIGH | Pipeline pattern is standard for CLI tools (Vite, webpack), separation of concerns validated in production tools, build order follows dependency graph |
| Pitfalls | HIGH | Critical pitfalls validated with real-world examples (GitHub Copilot data loss, OneDrive sync bugs), YAML edge cases extensively documented, atomic operations verified in specs |

**Overall confidence:** HIGH

The research is comprehensive with primary sources for all major decisions. Node.js LTS documentation provides definitive guidance on TypeScript support. Library recommendations based on npm download counts, GitHub stars, and ecosystem adoption (PostCSS uses picocolors, Gatsby uses gray-matter). Architecture patterns validated in production CLI tools. Critical pitfalls documented with specific examples of real-world failures.

### Gaps to Address

**Areas requiring validation during implementation:**

1. **Optimal token count threshold for embedded CLAUDE.md files**: No existing research on Claude-specific token optimization for embedded content. Will need experimentation to determine when files become too large and impact response time.
   - **Approach**: Start with no limits, add token counting in Phase 3, defer optimization to v1.x based on user feedback

2. **Section detection regex reliability**: Markdown section markers (## SKILLS, ## COMMANDS) may have variations in real Claude Code files (extra whitespace, case sensitivity, nested headings).
   - **Approach**: Phase 3 research should validate against actual .claude/ repositories, may need to research markdown AST parsing if regex proves insufficient

3. **Multi-file skill concatenation strategy**: SKILL.md may reference templates/, resources/, reference.md - unclear how these should be organized in embedded output.
   - **Approach**: Phase 1 parser research should examine real skill structures, determine concatenation order and section boundaries

4. **@clack/prompts performance with 500+ skills**: Unknown if TUI remains responsive with large lists, may need virtual scrolling or pagination.
   - **Approach**: Phase 4 should prototype with large test datasets, research virtual scrolling if performance issues emerge

5. **Windows junction handling for .claude/ directories**: Windows uses junctions for directory symlinks (not regular symlinks), behavior on junction-linked skill directories unclear.
   - **Approach**: Phase 5 cross-platform testing must include Windows junction scenarios, document behavior vs follow strategy

## Sources

### Primary Sources (HIGH Confidence)

**Official Documentation:**
- Node.js v24 LTS documentation (native TypeScript support, LTS timeline)
- TypeScript 5.8 release notes (`--erasableSyntaxOnly` compatibility)
- Commander.js GitHub repository (27.9k stars, feature documentation)
- gray-matter GitHub repository (battle-tested frontmatter parser)
- fast-glob GitHub repository (performance benchmarks, API docs)

**Library Ecosystem:**
- npm weekly download statistics (picocolors 79M+, ora 46M+, chalk 25M+, inquirer 25M+)
- GitHub stars and activity metrics (commander.js 27.9k, tsdown active vs tsup abandoned)
- @clack/prompts official documentation (size comparison vs Inquirer)

**Real-World Failures:**
- GitHub Copilot edit_file tool data loss issue (#178656) - 54% file deletion
- Google Gemini CLI write_file safety protocol failure (#3823)
- OneDrive sync client backup failure bug (#1813)

### Secondary Sources (MEDIUM Confidence)

**Best Practices & Patterns:**
- Command Line Interface Guidelines (clig.dev) - CLI UX patterns
- Modern CLI Tools in 2026 blog posts - ecosystem trends
- Node.js Design Patterns book - async patterns, stream processing
- Vite and webpack architecture docs - bundler pipeline patterns
- Building Modern CLI Tool with Node.js guides - architecture examples

**Domain Research:**
- concat-md, merge-markdown, mdmerge tool comparisons - feature landscape
- CLI tool comparisons (commander vs yargs vs oclif) - framework selection
- Terminal color library benchmarks (picocolors vs chalk) - performance data
- YAML edge cases documentation ("yaml document from hell", InfoWorld gotchas)

**Security & Safety:**
- POSIX atomic write specifications (write-then-rename guarantee)
- YAML 1.1 vs 1.2 specification differences (sexagesimal, boolean coercion)
- Cross-platform encoding guides (UTF-8 vs CP437, CRLF vs LF)
- Symlink behavior documentation (Windows junctions vs POSIX symlinks)

### Tertiary Sources (LOW Confidence - Needs Validation)

**Areas requiring hands-on validation:**
- Content compression techniques for LLM token optimization (no existing research)
- Specific Claude Code skill file structures (need to examine real .claude/ repositories)
- @clack/prompts performance with 500+ items (need to test at scale)
- Section marker variations in user CLAUDE.md files (need real-world examples)

---
*Research completed: 2026-01-30*
*Ready for roadmap: yes*
