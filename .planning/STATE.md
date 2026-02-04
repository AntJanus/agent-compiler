# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-30)

**Core value:** The tool must reliably embed selected skills/commands into CLAUDE.md or AGENTS.md, so that functionality that fails as external skills works consistently when embedded.
**Current focus:** Phase 3 - Core Embedding

## Current Position

Phase: 3 of 4 (Core Embedding)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-04 — Completed 03-01-PLAN.md (section detection and content splitting)

Progress: [████████░░] 89%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 30 min
- Total execution time: 4.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 232 min | 77 min |
| 02-safe-file-operations | 3 | 7 min | 2.3 min |
| 03-core-embedding | 2 | 3 min | 1.5 min |

**Recent Trend:**
- Last 5 plans: 02-01 (3 min), 02-03 (2 min), 03-02 (1 min), 03-01 (2 min)
- Trend: Maintaining fast pace (1-3 min recent)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Use lightweight TUI (prompts-style) — matches Next.js generator UX
- Concatenate only markdown files — non-markdown files aren't embeddable instructions
- Create backups before overwriting — safety net prevents data loss
- Parse YAML frontmatter from SKILL.md — needed to extract skill metadata
- Use ES modules (type: module) for modern Node.js compatibility — (01-01)
- Use .js extensions in TypeScript imports for ES module compatibility — (01-01)
- Separate ParsedSkill/ParsedCommand from Skill/Command types — (01-01)
- Use YAML 1.2 JSON_SCHEMA to avoid implicit type conversions — (01-03)
- Warn on missing skill name/description but don't fail — (01-03)
- Preserve markdown reference order with array-based duplicate checking — (01-03)
- Fail fast with clear contextual errors for malformed YAML and missing files — (01-03)
- Use suppressErrors in fast-glob to silently handle missing directories — (01-02)
- Follow symlinks during discovery for flexible skill management — (01-02)
- Return absolute paths from discovery for reliability — (01-02)
- Commands are project-only (no global commands directory) — (01-02)
- Use SHA-256 hash with first 16 chars for backup identification — (02-01)
- Filesystem-safe timestamp format (ISO 8601 with hyphens replacing colons) — (02-01)
- Default 30-day retention period for backup cleanup — (02-01)
- Graceful handling of missing backup directory (return zeros, don't throw) — (02-01)
- Backup filename format: {baseName}_{ISO8601}_{hash}.md — (02-01)
- Use crypto.randomBytes for temp filename generation to prevent collisions — (02-02)
- Preserve temp files on failure per SAFETY-04 for debugging aid — (02-02)
- UTF-8 encoding enforced on all file writes per SAFETY-05 — (02-02)
- Minimal validation approach catches obvious corruption, not strict linting — (02-02)
- Temp file format: .{basename}.tmp.{randomHex} — (02-02)
- safeWrite validates by default (options.validate !== false) — (02-03)
- Auto-rollback restores from backup on validation failure — (02-03)
- Pre-restore backup created before user-initiated restore — (02-03)
- discoverBackups returns empty array (not error) for missing directory — (02-03)
- Use regex-based section detection (not AST) for simplicity — (03-01)
- Case-insensitive section detection matches any casing (## SKILLS, ## Skills, ## skills) — (03-01)
- Section boundaries respect heading depth (## only, not ###) — (03-01)
- Generate hash of user content for validation after merge — (03-01)
- Subsection headings use skill name from YAML frontmatter (not directory name) — (03-02)
- Empty arrays return empty string (not section heading alone) — (03-02)
- Template includes explanatory header comment for user clarity — (03-02)
- Template only used for new files (ENOENT), existing files preserve user content — (03-02)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-04T19:50:57Z
Stopped at: Completed 03-01-PLAN.md (section detection and content splitting)
Resume file: None
