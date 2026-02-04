---
phase: 03-core-embedding
plan: 01
subsystem: embedding
tags: [markdown, parsing, section-detection, content-splitting, hash-validation]

# Dependency graph
requires:
  - phase: 02-safe-file-operations
    provides: generateContentHash for user content validation
  - phase: 01-foundation
    provides: Type system and ES module setup
provides:
  - Section boundary detection for ## SKILLS and ## COMMANDS
  - Content splitting to separate user content from embedded sections
  - User content hash generation for validation
  - SectionBoundary, SplitContent, EmbeddedSection types
affects: [03-02, 03-03, content-merger, validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regex-based section detection with depth matching"
    - "Case-insensitive heading detection"
    - "Content hashing for validation"

key-files:
  created:
    - src/types/embedding.ts
    - src/embedding/section-extractor.ts
  modified:
    - src/types/index.ts

key-decisions:
  - "Use regex-based section detection (not AST) for simplicity"
  - "Case-insensitive section detection matches any casing (## SKILLS, ## Skills, ## skills)"
  - "Section boundaries respect heading depth (## only, not ###)"
  - "Generate hash of user content for validation after merge"

patterns-established:
  - "Section detection: ^##\\s+(SKILLS|COMMANDS)\\s*$ with case-insensitive flag"
  - "Section end: next ^##\\s+ heading (same depth) or EOF"
  - "User content extraction: preserve exactly, only trim at end"
  - "Empty content handling: return empty strings with empty hash (no errors)"

# Metrics
duration: 2min
completed: 2026-02-04
---

# Phase 3 Plan 1: Section Detection and Content Splitting Summary

**Regex-based markdown section detection with case-insensitive ## SKILLS/COMMANDS boundaries and hash validation for user content preservation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-04T19:49:05Z
- **Completed:** 2026-02-04T19:50:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created embedding types (SectionBoundary, SplitContent, EmbeddedSection) for section operations
- Implemented case-insensitive section boundary detection for ## SKILLS and ## COMMANDS
- Built content splitting logic to separate user content from embedded sections
- Integrated hash generation for user content validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create embedding types for section detection** - `588b573` (feat)
2. **Task 2: Implement section boundary detection and content splitting** - `93bcbcc` (feat)

## Files Created/Modified
- `src/types/embedding.ts` - SectionBoundary, SplitContent, EmbeddedSection interfaces
- `src/types/index.ts` - Export embedding types
- `src/embedding/section-extractor.ts` - detectSectionBoundary, extractUserContent, splitContent functions

## Decisions Made

**1. Use regex-based section detection (not AST parsing)**
- **Rationale:** For well-structured markdown with clear ## SKILLS and ## COMMANDS boundaries, regex is simpler, faster, and has zero dependencies. Research showed remark/unified AST adds complexity without benefit for this use case.
- **Implementation:** Pattern `/^##\s+(SKILLS|COMMANDS)\s*$/i` for section start, `/^##\s+/` for section end

**2. Case-insensitive section detection**
- **Rationale:** Markdown conventions don't enforce heading casing. Users might write ## Skills or ## SKILLS. Tool should detect any casing but generate uppercase.
- **Implementation:** Regex flag `i` for case-insensitive matching

**3. Respect heading depth for section boundaries**
- **Rationale:** Subsections (###) within ## SKILLS should be included in section, not treated as section boundaries. Only same-depth headings (##) mark section end.
- **Implementation:** Section ends at next `^##\s+` (depth 2 only) or EOF, not at ### (depth 3+)

**4. Generate hash of user content for validation**
- **Rationale:** After merge, need to verify user content unchanged. Hash comparison (from Phase 2) enables validation that merge didn't corrupt user content.
- **Implementation:** Use generateContentHash from file-safety/hash-generator

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Implementation followed research patterns precisely. Tests confirmed:
- Case-insensitive detection works for all casings (SKILLS, Skills, skills, SkIlLs)
- Depth matching preserves ### subsections within ## sections
- User content excludes embedded sections completely
- Hash generation succeeds for validation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 03-02:** Section generation logic can now use these types and functions to:
- Generate ## SKILLS and ## COMMANDS sections from parsed skills/commands
- Use SectionBoundary type for tracking embedded content
- Use EmbeddedSection type for section generation

**Foundation established:**
- Section detection handles both SKILLS and COMMANDS independently
- Content splitting provides clean separation for merge operation
- Hash validation enables user content preservation checking

**No blockers.**

---
*Phase: 03-core-embedding*
*Completed: 2026-02-04*
