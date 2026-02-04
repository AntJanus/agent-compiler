---
phase: 04-cli-polish
plan: 03
subsystem: cli
tags: [ora, picocolors, spinner, error-handling, line-endings, permissions, cross-platform]

# Dependency graph
requires:
  - phase: 04-01
    provides: CLI entry point and argument parsing
  - phase: 02-safe-file-operations
    provides: Atomic file writing, backup management
provides:
  - Spinner utility for visual feedback during long operations
  - ActionableError class for structured error formatting
  - Line ending detection and normalization (LF/CRLF)
  - Permission checking before file operations (ERROR-01)
  - Helper functions for common error types
affects: [04-04-integration, future-cli-commands]

# Tech tracking
tech-stack:
  added: [ora@8.0.1, picocolors@1.0.0]
  patterns:
    - ActionableError with context and resolution steps
    - withSpinner wrapper for async operations
    - Proactive permission checking before writes

key-files:
  created:
    - src/cli/output/spinner.ts
    - src/cli/output/messages.ts
    - src/cli/output/index.ts
    - src/file-safety/line-endings.ts
    - src/file-safety/permissions.ts
  modified:
    - src/file-safety/index.ts

key-decisions:
  - "Use ora for spinner (standard, feature-rich CLI spinner)"
  - "Use picocolors for color output (lightweight, fast)"
  - "ActionableError.format() method for structured CLI display"
  - "Proactive permission checking prevents mid-operation failures"
  - "Line ending detection defaults to LF for new files (Unix-first)"
  - "normalizeLineEnding handles mixed line endings (normalize to LF first)"

patterns-established:
  - "Spinner pattern: withSpinner() for automatic succeed/fail handling"
  - "Error pattern: ActionableError with context object and resolution array"
  - "Permission pattern: check before operation, return actionable results"
  - "Line ending pattern: detect original, preserve on write"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 04 Plan 03: Output Formatting and Cross-Platform Utilities Summary

**Ora spinner with succeed/fail states, ActionableError with structured formatting, and cross-platform line ending/permission utilities**

## Performance

- **Duration:** 3 min (153 seconds)
- **Started:** 2026-02-04T22:49:22Z
- **Completed:** 2026-02-04T22:51:55Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- Spinner utility provides visual feedback for long operations with automatic succeed/fail states
- ActionableError class formats errors with context and resolution steps for better UX
- Line ending detection and normalization preserves original file styles (LF/CRLF)
- Proactive permission checking catches access issues before operations (ERROR-01 coverage)
- Helper functions for common error types (permission, file not found, parse errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create spinner and actionable error utilities** - `443f804` (feat)
2. **Task 2: Add line ending detection, permission checking, and symlink utilities** - `d029fda` (feat)

## Files Created/Modified
- `src/cli/output/spinner.ts` - withSpinner() wrapper and createSpinner() for manual control
- `src/cli/output/messages.ts` - ActionableError class with format() method and helper functions
- `src/cli/output/index.ts` - Exports all output utilities
- `src/file-safety/line-endings.ts` - detectLineEnding(), detectFromContent(), normalizeLineEnding()
- `src/file-safety/permissions.ts` - checkWritePermission(), checkReadPermission() with actionable results
- `src/file-safety/index.ts` - Added exports for line-endings and permissions modules

## Decisions Made

**1. Use ora for spinner functionality**
- Rationale: Standard CLI spinner library with excellent terminal support, feature-rich
- Alternative: Custom spinner implementation would be fragile across terminals

**2. Use picocolors for color output**
- Rationale: Lightweight (1.3kb), fast, zero dependencies
- Alternative: chalk (larger, more features we don't need)

**3. ActionableError.format() method for structured display**
- Rationale: Keeps formatting logic in one place, CLI can call .format() for pretty output
- Alternative: Separate formatting function would duplicate error structure knowledge

**4. Proactive permission checking (ERROR-01)**
- Rationale: Catch permission issues BEFORE attempting writes for better UX
- Implementation: checkWritePermission checks file if exists, parent directory if not

**5. Line ending detection defaults to LF for new files**
- Rationale: Unix-first approach, most modern tools default to LF
- Behavior: detectLineEnding returns 'LF' if file doesn't exist

**6. normalizeLineEnding handles mixed line endings**
- Rationale: Real files may have mixed CRLF/LF from different editors
- Implementation: Normalize to LF first, then convert to target ending

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed smoothly with comprehensive test coverage.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for integration:**
- Spinner utilities available for CLI commands (discovery, embedding)
- ActionableError ready for error handling throughout CLI
- Line ending utilities ready for integration with file-safety module
- Permission checking ready for proactive validation

**Integration points:**
- CLI commands should use withSpinner() for operations like discovery and embedding
- Error handlers should use ActionableError for user-facing errors
- safeWrite should integrate line ending detection/preservation
- All file operations should call checkWritePermission before attempting writes

**XPLAT-04 coverage confirmed:**
- Symlink handling verified via Phase 1 discovery module (fast-glob followSymlinks)
- No additional symlink code needed in this plan

**No blockers or concerns.**

---
*Phase: 04-cli-polish*
*Completed: 2026-02-04*
