# Roadmap: Agent Compiler

## Overview

Agent Compiler delivers a CLI tool that embeds Claude Code skills and commands into CLAUDE.md files through four focused phases. Foundation phase establishes safe file operations and parsing infrastructure, followed by backup mechanisms that prevent data loss. Core embedding logic implements section management and content merging, with final phase delivering the interactive CLI interface and cross-platform reliability. The critical path prioritizes file safety above features, ensuring users can confidently compile their agent instructions without risk of data corruption.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - File discovery, parsing, and path utilities
- [ ] **Phase 2: Safe File Operations** - Backups and atomic write operations
- [ ] **Phase 3: Core Embedding** - Content merging and section management
- [ ] **Phase 4: CLI & Polish** - Interactive interface and cross-platform support

## Phase Details

### Phase 1: Foundation
**Goal**: Establish infrastructure for discovering and parsing Claude Code skills and commands
**Depends on**: Nothing (first phase)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, PARSE-01, PARSE-02, PARSE-03, PARSE-04, PARSE-05, PARSE-06
**Success Criteria** (what must be TRUE):
  1. Tool discovers all skills from both `~/.claude/skills/` and `./.claude/skills/` directories
  2. Tool discovers all commands from `./.claude/commands/` directory
  3. Tool correctly parses YAML frontmatter and markdown content from SKILL.md files
  4. Tool concatenates multi-file skills (reference.md, templates/) in correct order
  5. Tool handles missing directories and malformed files with clear error messages
**Plans**: 3 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Project setup, types, and path utilities (Wave 1)
- [x] 01-02-PLAN.md — File discovery for skills and commands (Wave 2)
- [x] 01-03-PLAN.md — Content parsing and markdown concatenation (Wave 2)

### Phase 2: Safe File Operations
**Goal**: Implement backup and atomic write mechanisms that prevent data loss
**Depends on**: Phase 1
**Requirements**: SAFETY-01, SAFETY-02, SAFETY-03, SAFETY-04, SAFETY-05, SAFETY-06, SAFETY-07
**Success Criteria** (what must be TRUE):
  1. Tool creates timestamped backup before any file modification
  2. Tool validates backup exists and is readable before proceeding with write
  3. Tool uses atomic write operations (write-to-temp-then-rename) for all file modifications
  4. Tool halts with clear error if backup creation fails
  5. User can restore from backup using simple command
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 02-01-PLAN.md — Backup infrastructure with hash verification (Wave 1)
- [ ] 02-02-PLAN.md — Atomic write with temp-then-rename pattern (Wave 1)
- [ ] 02-03-PLAN.md — Safe write orchestrator and restore mechanism (Wave 2)

### Phase 3: Core Embedding
**Goal**: Implement content merging logic that embeds skills/commands into CLAUDE.md
**Depends on**: Phase 2
**Requirements**: EMBED-01, EMBED-02, EMBED-03, EMBED-04, EMBED-05, EMBED-06, VALID-01, VALID-02, VALID-03, VALID-04
**Success Criteria** (what must be TRUE):
  1. Tool reads existing CLAUDE.md/AGENTS.md content before modifications
  2. Tool removes previously embedded sections (## SKILLS, ## COMMANDS) when re-running
  3. Tool inserts selected skills and commands with proper markdown structure
  4. Tool preserves all original user content outside embedded sections
  5. Tool validates output file structure after compilation
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: CLI & Polish
**Goal**: Deliver interactive CLI interface with cross-platform reliability
**Depends on**: Phase 3
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06, CLI-07, ERROR-01, ERROR-02, ERROR-03, ERROR-04, ERROR-05, XPLAT-01, XPLAT-02, XPLAT-03, XPLAT-04
**Success Criteria** (what must be TRUE):
  1. User can run `npx agent-compiler compile` and see interactive wizard
  2. User can select skills and commands through filterable/searchable interface
  3. Tool differentiates global vs project skills visually in selection UI
  4. Tool provides color-coded output with progress indicators for long operations
  5. Tool works correctly on macOS and Linux with proper line ending preservation
  6. Tool provides actionable error messages with resolution steps for all failure modes
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✓ Complete | 2026-02-03 |
| 2. Safe File Operations | 0/3 | Not started | - |
| 3. Core Embedding | 0/2 | Not started | - |
| 4. CLI & Polish | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-30*
*Last updated: 2026-02-03*
