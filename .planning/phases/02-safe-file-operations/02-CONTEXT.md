# Phase 2: Safe File Operations - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement backup and atomic write mechanisms to prevent data loss when modifying CLAUDE.md or AGENTS.md files. This phase delivers file safety infrastructure: creating timestamped backups before writes, validating backup success, using atomic write operations (write-to-temp-then-rename), and providing restore functionality.

</domain>

<decisions>
## Implementation Decisions

### Backup Strategy
- Store backups in dedicated backup folder: `.agent-compiler/backups/` in the project
- Hash-based naming convention: include content hash for verification in filename
- Time-based retention: delete backups older than a configured threshold (implementation determines exact duration)
- Backup folder creation failure: Claude's discretion (determine safest fallback strategy)

### Atomic Write Approach
- Write temporary files in same directory as target file (e.g., `CLAUDE.md.tmp.randomId` next to `CLAUDE.md`)
- Keep temp files for debugging when write operation fails (don't auto-delete)
- Concurrent write handling: Claude's discretion (determine if concurrency matters for this tool)
- After successful rename, read and validate structure: ensure valid markdown and expected sections present

### Error Handling
- Backup failure errors: file path and reason only (concise, no diagnostic dumps)
- Validation failure after write: restore from backup immediately (auto-rollback to known good state)
- Disk full errors: Claude's discretion (determine helpful error content without overcomplicating)
- Exit codes for scripting: Claude's discretion (determine if distinct codes add value)

### Restore Mechanism
- Backup discovery approach: Claude's discretion (design user-friendly discovery method)
- Restore command interface: Claude's discretion (design intuitive restore flow)
- No validation of backup file before restoring (trust backup is good, restore directly)
- Backup current file before restore: Claude's discretion (determine safe restore behavior)

### Claude's Discretion
- Exact backup retention duration (time-based, but how many days/weeks?)
- Fallback strategy when backup folder creation fails
- Whether to handle concurrent writes and how
- Error message detail level for disk full scenarios
- Exit code design (if any)
- How users discover and select backups for restore
- Whether to backup current file before restoring from backup

</decisions>

<specifics>
## Specific Ideas

- Hash in filename serves dual purpose: verification and unique identification
- Failed write temp files help debugging — "why did my compilation fail?"
- Auto-rollback on validation failure prevents shipping broken files
- Keep error messages concise — just path and reason, not diagnostic overload

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-safe-file-operations*
*Context gathered: 2026-02-03*
