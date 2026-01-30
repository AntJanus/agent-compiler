# Requirements: Agent Compiler

**Defined:** 2026-01-30
**Core Value:** The tool must reliably embed selected skills/commands into CLAUDE.md or AGENTS.md, so that functionality that fails as external skills works consistently when embedded.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### CLI Interface

- [ ] **CLI-01**: User can invoke tool via `npx agent-compiler compile`
- [ ] **CLI-02**: User can view help documentation with `--help` flag
- [ ] **CLI-03**: User can check version with `--version` flag
- [ ] **CLI-04**: Tool provides interactive wizard with step-by-step prompts
- [ ] **CLI-05**: User can preview changes with `--dry-run` flag without applying
- [ ] **CLI-06**: Tool displays color-coded output (success/error/info messages)
- [ ] **CLI-07**: Tool provides proper exit codes for success/failure

### File Discovery

- [ ] **DISC-01**: Tool discovers skills from `~/.claude/skills/` (global)
- [ ] **DISC-02**: Tool discovers skills from `./.claude/skills/` (project)
- [ ] **DISC-03**: Tool discovers commands from `./.claude/commands/`
- [ ] **DISC-04**: Tool differentiates global vs project skills in selection UI
- [ ] **DISC-05**: Tool handles missing directories gracefully with clear messages
- [ ] **DISC-06**: User can filter/search skills in large lists

### Content Parsing

- [ ] **PARSE-01**: Tool parses YAML frontmatter from SKILL.md files
- [ ] **PARSE-02**: Tool extracts markdown content from SKILL.md files
- [ ] **PARSE-03**: Tool concatenates referenced markdown files from skill directories
- [ ] **PARSE-04**: Tool skips non-markdown files during concatenation
- [ ] **PARSE-05**: Tool validates YAML structure and provides clear errors for malformed files
- [ ] **PARSE-06**: Tool handles YAML edge cases correctly (Norway problem, octal, sexagesimal)

### Content Embedding

- [ ] **EMBED-01**: Tool reads existing CLAUDE.md/AGENTS.md before writing
- [ ] **EMBED-02**: Tool removes existing embedded sections (## SKILLS, ## COMMANDS, ## AGENTS)
- [ ] **EMBED-03**: Tool inserts new sections with selected content
- [ ] **EMBED-04**: Tool preserves original user content outside embedded sections
- [ ] **EMBED-05**: Tool generates proper markdown section structure
- [ ] **EMBED-06**: Tool operations are idempotent (can re-run safely)

### File Safety

- [ ] **SAFETY-01**: Tool creates timestamped backup before overwriting files
- [ ] **SAFETY-02**: Tool validates backup exists and is readable before proceeding
- [ ] **SAFETY-03**: Tool uses atomic write operations (write-to-temp-then-rename)
- [ ] **SAFETY-04**: Tool halts operation if backup creation fails
- [ ] **SAFETY-05**: Tool enforces UTF-8 encoding for all file operations
- [ ] **SAFETY-06**: User can undo compilation by restoring from backup
- [ ] **SAFETY-07**: Tool fails fast with clear error if write operation fails

### Error Handling

- [ ] **ERROR-01**: Tool checks file permissions before operations
- [ ] **ERROR-02**: Tool provides clear, actionable error messages with file paths
- [ ] **ERROR-03**: Tool suggests resolution steps for common errors
- [ ] **ERROR-04**: Tool displays progress indicators for operations >100ms
- [ ] **ERROR-05**: Tool handles edge cases gracefully (empty files, binary files)

### Validation

- [ ] **VALID-01**: Tool validates SKILL.md structure before parsing
- [ ] **VALID-02**: Tool validates YAML frontmatter schema
- [ ] **VALID-03**: Tool validates output file integrity after compilation
- [ ] **VALID-04**: Tool detects and reports broken references in concatenated content

### Cross-Platform (Unix)

- [ ] **XPLAT-01**: Tool works on macOS
- [ ] **XPLAT-02**: Tool works on Linux
- [ ] **XPLAT-03**: Tool preserves line endings (CRLF vs LF) from original files
- [ ] **XPLAT-04**: Tool detects and handles symlinks appropriately

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Cross-Platform (Windows)

- **XPLAT-05**: Tool works on Windows
- **XPLAT-06**: Tool handles Windows junctions appropriately
- **XPLAT-07**: Tool handles Windows-specific path separators

### Agents

- **AGENT-01**: Tool discovers agents from `~/.claude/agents/` and `./.claude/agents/`
- **AGENT-02**: Tool embeds agents into ## AGENTS section
- **AGENT-03**: Tool parses agent definition files

### Advanced Features

- **ADV-01**: Tool compresses embedded content for token optimization
- **ADV-02**: Tool supports CRUD operations on existing embeds
- **ADV-03**: Tool watches for skill changes and prompts recompile
- **ADV-04**: Tool supports global config file (`~/.agent-compiler/config.json`)
- **ADV-05**: Tool provides diff view before applying changes
- **ADV-06**: Tool tracks dependencies between skills and referenced files

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| GUI mode | Defeats CLI purpose; TUI with @clack/prompts is sufficient (anti-feature) |
| Auto-commit to git | Dangerous; users must review changes before committing (anti-feature) |
| Remote skill fetching | Security risk and network dependency (anti-feature) |
| Embed everything by default | Creates bloated files; forces intentional selection instead (anti-feature) |
| Skill marketplace | Out of scope for compilation tool; belongs in separate ecosystem |
| Real-time sync/watch mode | High complexity; defer until use case validation |
| Template system for output | Wait for user demand; CLAUDE.md/AGENTS.md formats are standard |
| Smart conflict resolution | Defer until patterns emerge from real usage |
| OAuth/cloud integration | Not relevant for local file compilation tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | TBD | Pending |
| CLI-02 | TBD | Pending |
| CLI-03 | TBD | Pending |
| CLI-04 | TBD | Pending |
| CLI-05 | TBD | Pending |
| CLI-06 | TBD | Pending |
| CLI-07 | TBD | Pending |
| DISC-01 | TBD | Pending |
| DISC-02 | TBD | Pending |
| DISC-03 | TBD | Pending |
| DISC-04 | TBD | Pending |
| DISC-05 | TBD | Pending |
| DISC-06 | TBD | Pending |
| PARSE-01 | TBD | Pending |
| PARSE-02 | TBD | Pending |
| PARSE-03 | TBD | Pending |
| PARSE-04 | TBD | Pending |
| PARSE-05 | TBD | Pending |
| PARSE-06 | TBD | Pending |
| EMBED-01 | TBD | Pending |
| EMBED-02 | TBD | Pending |
| EMBED-03 | TBD | Pending |
| EMBED-04 | TBD | Pending |
| EMBED-05 | TBD | Pending |
| EMBED-06 | TBD | Pending |
| SAFETY-01 | TBD | Pending |
| SAFETY-02 | TBD | Pending |
| SAFETY-03 | TBD | Pending |
| SAFETY-04 | TBD | Pending |
| SAFETY-05 | TBD | Pending |
| SAFETY-06 | TBD | Pending |
| SAFETY-07 | TBD | Pending |
| ERROR-01 | TBD | Pending |
| ERROR-02 | TBD | Pending |
| ERROR-03 | TBD | Pending |
| ERROR-04 | TBD | Pending |
| ERROR-05 | TBD | Pending |
| VALID-01 | TBD | Pending |
| VALID-02 | TBD | Pending |
| VALID-03 | TBD | Pending |
| VALID-04 | TBD | Pending |
| XPLAT-01 | TBD | Pending |
| XPLAT-02 | TBD | Pending |
| XPLAT-03 | TBD | Pending |
| XPLAT-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 44 ⚠️

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after initial definition*
