---
phase: 03-core-embedding
plan: 02
subsystem: embedding
tags: [markdown, template-generation, section-generation]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: ParsedSkill and ParsedCommand types with metadata
provides:
  - Section generators for ## SKILLS and ## COMMANDS markdown content
  - Template generator for new CLAUDE.md files with header and structure
affects: [03-03-merge-logic, 04-interactive-cli]

# Tech tracking
tech-stack:
  added: []
  patterns: [subsection-based-embedding, metadata-driven-headings]

key-files:
  created:
    - src/embedding/section-generator.ts
    - src/embedding/template-generator.ts
  modified: []

key-decisions:
  - "Subsection headings use skill/command name from metadata, not directory name"
  - "Empty arrays return empty string (not section heading alone)"
  - "Template includes explanatory header comment for user clarity"
  - "Template only used for new files (ENOENT), existing files preserve user content"

patterns-established:
  - "Section generation pattern: heading + subsections with trimmed content"
  - "Template generation pattern: header + placeholder + separator + optional sections"

# Metrics
duration: 1min
completed: 2026-02-04
---

# Phase 3 Plan 2: Section and Template Generation Summary

**Section generators produce formatted ## SKILLS and ## COMMANDS markdown from parsed data, template generator creates minimal CLAUDE.md structure with explanatory header**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-04T19:49:05Z
- **Completed:** 2026-02-04T19:50:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Section generators create properly formatted ## SKILLS and ## COMMANDS sections with ### subsections
- Subsection headings use metadata names (skill.metadata.name, command.name) not directory names
- Template generator creates minimal CLAUDE.md structure with header comment explaining tool purpose
- Empty arrays handled gracefully (return empty string, not section heading alone)
- Content properly trimmed to avoid excessive whitespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement section generators for skills and commands** - `3647493` (feat)
2. **Task 2: Implement template generator for new files** - `b3fa450` (feat)

## Files Created/Modified
- `src/embedding/section-generator.ts` - Generates ## SKILLS and ## COMMANDS sections with ### subsections from parsed data
- `src/embedding/template-generator.ts` - Generates minimal CLAUDE.md template with header, placeholder, separator, and optional section headings

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 3 Plan 3 (merge logic):
- Section generators produce the content to embed
- Template generator creates structure for new files
- Next: Implement parsing logic to extract user content and merge embedded sections

---
*Phase: 03-core-embedding*
*Completed: 2026-02-04*
