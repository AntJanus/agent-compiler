# Phase 1: Foundation - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Discover and parse Claude Code skills and commands from filesystem locations (`~/.claude/skills/`, `./.claude/skills/`, `./.claude/commands/`). Parse YAML frontmatter and markdown content from SKILL.md files. Concatenate multi-file skills in correct order. Handle missing directories and malformed files appropriately.

</domain>

<decisions>
## Implementation Decisions

### File Discovery Behavior
- Follow symlinks in `.claude/` directories (treat symlinked skills/commands like regular files)
- Silently skip missing directories (`~/.claude/skills/` or `./.claude/skills/` not existing is OK)
- Show global vs project differentiation with `(global)` / `(project)` labels in selection UI
- Skills without SKILL.md: highlight in red and mark as invalid to user

### YAML Parsing Strictness
- Fail fast with clear error on malformed YAML frontmatter
- Validate YAML frontmatter schema (name, description) but only warn if missing (don't fail)
- Use YAML 1.2 parser (matches Claude Code expectations, no implicit conversions like 'no' → false)

### Multi-file Concatenation
- Preserve reference order: concatenate files in the order they're mentioned in SKILL.md
- Fail with clear error if referenced file doesn't exist
- Add markdown separators (`---`) between concatenated files for clarity
- Parse SKILL.md for references: look for markdown links `[text](file.md)` to detect what to concatenate
- Only concatenate `.md` files (validate file extensions, skip/error on non-markdown)

### Error Messages & Validation
- Concise but clear error messages: show what failed and which file, skip technical details
- No fix suggestions in errors (just report the problem)
- Warnings for non-critical issues (missing optional fields), errors for critical problems (malformed YAML)

### Claude's Discretion
- Exact implementation of markdown link parsing
- Format of file separator between concatenated files
- Internal error handling for edge cases not explicitly discussed

</decisions>

<specifics>
## Specific Ideas

None - standard approaches acceptable for foundation infrastructure.

</specifics>

<deferred>
## Deferred Ideas

- **Skill validation command** (v2) - Standalone command to validate skill structure without compilation

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-30*
