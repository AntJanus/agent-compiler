---
phase: 03-core-embedding
plan: 03
subsystem: embedding
tags: [content-merger, idempotency, validation, hash, backup, atomic-write]

# Dependency graph
requires:
  - phase: 03-01
    provides: section detection and content splitting with hash validation
  - phase: 03-02
    provides: section and template generation
  - phase: 02
    provides: safe file operations with backup and atomic writes
provides:
  - mergeEmbeddedContent API for orchestrating full embedding flow
  - Idempotency checking to skip unnecessary writes
  - User content validation with hash comparison
  - Unified embedding module exports through index.ts
affects: [04-cli, testing, integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Normalize content before idempotency comparison (line endings, blank lines)"
    - "Use atomicWrite for new files, safeWrite for existing files"
    - "Skip user content validation for new files (nothing to preserve)"
    - "Smart separator handling: avoid duplicate --- when user content already has one"

key-files:
  created:
    - src/embedding/content-merger.ts
    - src/embedding/index.ts
  modified:
    - src/embedding/template-generator.ts

key-decisions:
  - "Use atomicWrite for new files, safeWrite for existing files (no backup needed when creating)"
  - "Skip user content validation for new file creation (nothing to preserve)"
  - "Avoid duplicate separator when user content already ends with ---"
  - "Template should not include section headings (merger adds them with content)"
  - "Normalize content before idempotency check (trim, line endings, collapse blank lines)"

patterns-established:
  - "Merge flow: read/create → split → generate → assemble → idempotency → write → validate"
  - "Hash-based idempotency: normalize both contents, compare hashes, skip write if identical"
  - "User content validation: compare hash before/after merge (catches section detection bugs)"

# Metrics
duration: 4min
completed: 2026-02-04
---

# Phase 03 Plan 03: Merge Orchestrator with Idempotency and Validation Summary

**Complete embedding API with hash-based idempotency checking, user content validation, and smart separator handling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-04T19:55:00Z
- **Completed:** 2026-02-04T19:58:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented mergeEmbeddedContent orchestrator with full merge flow
- Hash-based idempotency skips writes when content unchanged
- User content validation catches section detection bugs before data loss
- Unified embedding module exports for Phase 4 CLI integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement merge orchestrator with idempotency and validation** - `d497126` (feat)
2. **Task 2: Create embedding module index with unified exports** - `744a6b7` (feat)

## Files Created/Modified
- `src/embedding/content-merger.ts` - Main embedding API orchestrating read/split/generate/merge/validate flow
- `src/embedding/index.ts` - Unified module exports for complete embedding API
- `src/embedding/template-generator.ts` - Fixed to exclude section headings (merger adds them)

## Decisions Made

**Use atomicWrite for new files, safeWrite for existing files**
- New files have nothing to backup, atomicWrite is sufficient
- Existing files need backup protection, use safeWrite
- Avoids backup manager ENOENT error on new file creation

**Skip user content validation for new file creation**
- New files have no user content to preserve
- Template doesn't include separator, but merged content does
- Validation only makes sense for existing files where corruption could occur

**Avoid duplicate separator when user content already ends with ---**
- splitContent includes --- in user content (design intent)
- Assembly logic would add another ---, creating duplicate
- Check if user content ends with --- before adding separator

**Template should not include section headings**
- Originally template included empty ## SKILLS, ## COMMANDS
- These were treated as embedded sections, causing double section headers
- Template now only includes user placeholder content, no sections

**Normalize content before idempotency check**
- Different line endings (\r\n vs \n) shouldn't trigger writes
- Multiple blank lines (3+ vs 2) shouldn't trigger writes
- Normalization: trim, convert line endings, collapse 3+ blank lines to 2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed double separator issue**
- **Found during:** Task 1 (Integration testing)
- **Issue:** Assembly logic always added --- separator, but user content from splitContent already included it, creating double separators
- **Fix:** Added check to skip separator if user content already ends with ---
- **Files modified:** src/embedding/content-merger.ts
- **Verification:** Integration test confirms single separator in output
- **Committed in:** d497126 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed template including empty section headings**
- **Found during:** Task 1 (Integration testing)
- **Issue:** Template generated ## SKILLS and ## COMMANDS as empty sections, causing double headers after merge
- **Fix:** Removed section headings from template - merger adds them with actual content
- **Files modified:** src/embedding/template-generator.ts
- **Verification:** Integration test confirms single section heading per section
- **Committed in:** d497126 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed backup error on new file creation**
- **Found during:** Task 1 (Integration testing)
- **Issue:** safeWrite tried to create backup of non-existent file, causing ENOENT error
- **Fix:** Use atomicWrite directly for new files (no backup needed), safeWrite only for existing files
- **Files modified:** src/embedding/content-merger.ts
- **Verification:** New file creation test passes without backup error
- **Committed in:** d497126 (Task 1 commit)

**4. [Rule 1 - Bug] Fixed incorrect validation on new file creation**
- **Found during:** Task 1 (Integration testing)
- **Issue:** Validation compared template hash (no separator) vs merged hash (with separator), causing false positive corruption detection
- **Fix:** Skip user content validation for new files (nothing to preserve)
- **Files modified:** src/embedding/content-merger.ts
- **Verification:** New file creation succeeds without validation error
- **Committed in:** d497126 (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (4 bugs discovered during testing)
**Impact on plan:** All bugs caught during integration testing before completion. Fixed immediately as part of TDD-style development. No scope creep - all fixes necessary for correct operation.

## Issues Encountered

**Hash mismatch during validation**
- Problem: User content hash differed before/after merge for new files
- Root cause: Template had no separator, merged content had separator (part of user content after split)
- Resolution: Skip validation for new files (nothing to preserve)

**Double separator in output**
- Problem: Output had two --- separators between user content and embedded sections
- Root cause: splitContent includes --- in user content, assembly logic added another
- Resolution: Check if user content ends with --- before adding separator

**Empty section headings in template**
- Problem: Template included ## SKILLS and ## COMMANDS without content, causing double headers
- Root cause: Template tried to pre-create sections, but merger also adds section headings
- Resolution: Template only includes user placeholder, no section headings

**Backup error on new file creation**
- Problem: safeWrite tried to backup non-existent file, threw ENOENT
- Root cause: New files don't exist yet, backup manager expects existing file
- Resolution: Use atomicWrite for new files, safeWrite only for existing

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 4 (CLI Development):**
- Complete embedding API available through src/embedding/index.ts
- mergeEmbeddedContent() is the main entry point
- Handles all edge cases: new files, existing files, idempotency, validation
- Safe operations with backup protection for existing files

**Integration points:**
- Import from src/embedding/index.js
- Call mergeEmbeddedContent({ targetPath, skills, commands, backupDir })
- Returns { success, skipped, backupPath, created, userContentHash }

**No blockers or concerns.**

---
*Phase: 03-core-embedding*
*Completed: 2026-02-04*
