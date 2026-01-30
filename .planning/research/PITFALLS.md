# Pitfalls Research

**Domain:** CLI File Manipulation Tools
**Researched:** 2026-01-30
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: File Overwrite Without Reading First

**What goes wrong:**
CLI tools that modify user files overwrite entire files instead of making surgical edits, resulting in catastrophic data loss. This is the most severe failure mode for file manipulation tools.

**Why it happens:**
Developers use destructive write operations (write_file, fs.writeFileSync) without first reading and understanding existing file contents. The pattern of "assume empty → write from scratch" is faster to implement than proper file editing logic.

**How to avoid:**
- ALWAYS read file contents before any write operation
- Never use write operations unless explicitly creating new files
- Implement read-modify-write pattern with explicit confirmation
- Add pre-write validation that compares expected vs actual file state

**Warning signs:**
- Using write APIs without corresponding read operations
- No diff preview shown before file modification
- Missing backup creation before writes
- Tool doesn't validate file structure before modifying

**Phase to address:**
Phase 1 (Core File Operations): Establish read-first pattern as architectural requirement. All file modification functions must accept current state as parameter to prevent accidental overwrites.

**Real-world examples:**
- GitHub Copilot's edit_file tool (2026) caused 54% file deletion by completely replacing 3000+ line files instead of surgical edits
- Gemini CLI agent (2026) used write_file without reading first, representing critical safety protocol failure

---

### Pitfall 2: Non-Atomic File Writes (Race Conditions & Corruption)

**What goes wrong:**
Files get corrupted when writes fail mid-operation (crash, SIGKILL, disk full) or when multiple processes write simultaneously. Users lose data because partial writes leave files in inconsistent state.

**Why it happens:**
Developers use direct file writes instead of atomic write-then-rename pattern. POSIX write() allows partial reads during writes across processes, and file systems don't guarantee atomicity for regular write operations.

**How to avoid:**
- Use write-to-temp-then-rename pattern (guaranteed atomic on POSIX)
- Write to `.tmp` file in SAME directory (can't atomically rename across filesystems)
- Only rename temp file over target after successful write and validation
- Handle rename failures gracefully (keep temp file for recovery)

**Warning signs:**
- Direct writes to target file without temp file
- No fsync/flush before considering write complete
- Writing to different directory than target file
- No validation of written content before finalizing

**Phase to address:**
Phase 2 (Backup & Safety): Implement atomic file operations pattern. All file writes must use temp-file-then-rename to prevent corruption.

**Technical details:**
On Linux, os.Rename is atomic; on Windows it is NOT atomic. Both paths must reside on same filesystem for atomicity guarantee. Cannot atomically rename across filesystem boundaries.

---

### Pitfall 3: Backup Failure = Data Loss

**What goes wrong:**
Backup creation fails (permissions, disk space, path issues) but tool proceeds with overwrite anyway, leaving users with no recovery path. Backup might also overwrite previous backup, losing version history.

**Why it happens:**
Backup logic added as afterthought without proper error handling. Developers assume backup operations will succeed and don't validate backup integrity before proceeding.

**How to avoid:**
- Create backup BEFORE any file modification
- Validate backup file exists and is readable after creation
- HALT operation if backup fails (fail-fast principle)
- Use timestamped backups to preserve history (.backup-1234567890)
- Test backup restoration in automated tests

**Warning signs:**
- Backup creation in try/catch with empty catch block
- No verification of backup file after creation
- Backup errors logged but not treated as fatal
- Single backup file (no versioning/rotation)
- Backup happens AFTER modification starts

**Phase to address:**
Phase 2 (Backup & Safety): Backup must be first operation with validation gate. No file modifications allowed until verified backup exists.

**Real-world examples:**
- OneDrive sync client bug (2026) overwrote files with older versions when items.sqlite3 missing, and backup wasn't created if certain options enabled
- Default OneDrive config renames conflicting files as backup, but specific configurations disable this safety net

---

### Pitfall 4: YAML Parsing Edge Cases Cause Silent Failures

**What goes wrong:**
YAML frontmatter parses incorrectly due to version differences (1.1 vs 1.2), special value interpretation (Norway problem: "no" → false), or type coercion (013 → octal 11, 22:22 → sexagesimal 1342). Tool silently corrupts user data or fails to preserve values.

**Why it happens:**
YAML spec has dangerous implicit type coercions and version incompatibilities. Developers don't know about edge cases like "no" parsing as boolean false, or that numbers starting with 0 are octal.

**How to avoid:**
- Use YAML 1.2 parsers (removed sexagesimal literals, more conservative type coercion)
- Force string parsing for values that might be coerced (quote all user values)
- Validate parsed YAML matches expected schema before using
- Preserve exact string representation when round-tripping (don't re-serialize)
- Handle malformed YAML gracefully with clear error messages

**Warning signs:**
- Using YAML 1.1 parser (especially with Kubernetes files)
- No validation of parsed frontmatter structure
- Re-serializing YAML instead of preserving original format
- No error handling for parse failures
- Parser configured for "flexible" parsing mode

**Phase to address:**
Phase 1 (Core File Operations): Use strict YAML 1.2 parser with explicit type validation. Phase 3 (Validation): Add comprehensive YAML edge case tests.

**Edge cases to handle:**
- Boolean interpretation: "no", "off", "n", "false" → false (YAML 1.1 only)
- Octal numbers: 013 → 11 (leading zero triggers octal)
- Sexagesimal: 22:22 → 1342 (colon-separated base-60 in YAML 1.1)
- Anchors/aliases: `*anchor` fails if `&anchor` never defined
- UTF-8 BOM and invisible characters (recent parsers strip these)
- Indentation: tabs not supported, only spaces
- Special chars: lines starting with `?`, `:`, `#` need quoting

---

### Pitfall 5: Cross-Platform Encoding & Line Ending Issues

**What goes wrong:**
Files corrupted or unreadable when tool runs on different platform. Windows uses CRLF, Linux/Mac use LF. Terminal encoding differences (Windows CP437/CP850 vs UTF-8) cause display issues. Scripts with CRLF fail on Linux with "bad interpreter" error.

**Why it happens:**
Developers test on single platform and don't consider encoding differences. Platform-specific defaults leak into file operations. Many tools don't normalize line endings or encoding.

**How to avoid:**
- Always read/write files with explicit UTF-8 encoding
- Normalize line endings on read (convert CRLF → LF internally)
- Preserve original line endings on write (detect and maintain)
- Or: use platform-specific line endings (os.EOL) consistently
- Test on all three platforms (Windows, Linux, macOS)

**Warning signs:**
- No explicit encoding parameter in file operations
- Using platform default encoding (process.env.LANG)
- No line ending normalization
- Scripts fail with "bad interpreter" error on Linux
- Display garbled characters in terminal output

**Phase to address:**
Phase 1 (Core File Operations): Set UTF-8 as default encoding for all operations. Phase 4 (Cross-platform): Test on Windows, Linux, macOS with different line ending scenarios.

**Technical details:**
- Windows default terminal: CP437, CP850, or Windows-1252
- Linux/Mac default: UTF-8
- Tools like dos2unix/unix2dos convert line endings
- Maven warns about platform encoding if not configured

---

### Pitfall 6: Permission Errors Not Handled Gracefully

**What goes wrong:**
Tool crashes with cryptic error when files/directories lack read/write permissions. Users don't understand what went wrong or how to fix it. Tool might attempt to write to root-owned directories without proper error messages.

**Why it happens:**
Developers test with full permissions and don't anticipate permission-denied scenarios. Error handling added reactively after user complaints rather than proactively designed.

**How to avoid:**
- Check read/write permissions BEFORE attempting operations
- Provide clear, actionable error messages with fix instructions
- Suggest specific solutions (chmod commands, ownership issues)
- Never require root/admin access for normal operations
- Fail gracefully with clear exit codes and messages

**Warning signs:**
- No pre-flight permission checks
- Raw error stack traces shown to users
- Generic "operation failed" messages
- Tool requires sudo/admin without explanation
- No diagnostic commands suggested

**Phase to address:**
Phase 3 (Validation & Error Handling): Add permission checks before all file operations. Provide user-friendly error messages with resolution steps.

**Error message best practices:**
```
❌ Bad: "Error: EACCES: permission denied, open '/path/file'"
✅ Good: "Cannot write to /path/file (permission denied)

   Fix: Run 'chmod u+w /path/file' to add write permission
   Or: Change ownership with 'chown $USER /path/file'"
```

---

### Pitfall 7: Symlink/Junction Handling Breaks Cross-Platform

**What goes wrong:**
Tool follows symlinks and modifies target files unintentionally. Or tool breaks on Windows where symlinks require admin privileges. Hardlinks cause infinite recursion or unexpected behavior. File operations fail when crossing filesystem boundaries.

**Why it happens:**
Symlinks and hardlinks behave differently across platforms. Windows has junctions (directories only), hardlinks (files only), and symlinks (requires admin). Linux/Mac have symlinks (files + dirs) and hardlinks (files only, same filesystem).

**How to avoid:**
- Detect symlinks before operations (fs.lstatSync, not fs.statSync)
- Ask user intent: follow symlink or operate on link itself
- Document symlink behavior clearly
- Never assume symlinks are supported (Windows restrictions)
- Use realpath to resolve symlinks when needed
- Test with symlinked directories and files

**Warning signs:**
- Using fs.statSync (follows symlinks) instead of fs.lstatSync
- No symlink detection logic
- Hardlink operations without same-filesystem check
- No documentation of symlink behavior
- Tool fails silently on Windows symlinks

**Phase to address:**
Phase 4 (Cross-platform): Add symlink detection and handling strategy. Document behavior and test on Windows with junctions.

**Platform differences:**
- Windows: Hardlinks (files only, same filesystem), Junctions (dirs only, no relative paths), Symlinks (requires admin)
- Linux/Mac: Hardlinks (files only, same filesystem), Symlinks (files + dirs, cross-filesystem)
- Hardlinks maintain data if original deleted; symlinks become broken
- Cannot create hardlinks across filesystems/partitions

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct file writes without temp files | Simpler code, faster writes | File corruption on crash, race conditions | Never (atomic writes are table-stakes) |
| Single backup file (no versioning) | Less disk space, simpler logic | No recovery from backup corruption, no history | Only for MVP with clear warnings |
| Skipping encoding validation | Works on developer's platform | Cross-platform corruption issues | Never (UTF-8 is standard) |
| Generic error messages | Faster to implement | Users can't self-service issues | Only for truly unexpected errors |
| No pre-flight permission checks | Fewer operations before action | Cryptic failures, poor UX | Never (checks are cheap) |
| Re-serializing YAML instead of preserving | Cleaner code, normalized format | Loses comments, formatting, subtle values | Only if explicitly reformatting |
| Using platform-default line endings | "Native" behavior | Files corrupted when moved cross-platform | Only if explicitly documented |
| Sync operations (blocking) | Simpler error handling | Unresponsive UI, no progress indication | Small files only (<100KB) |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| File system access | Assuming paths are portable (hardcoded separators) | Use path.join(), path.resolve() for cross-platform compatibility |
| Git integration | Not checking for uncommitted changes before modifying | Check git status, warn about dirty working directory |
| Editor integration | Modifying files open in editor (lost on save) | Detect open files, warn user or wait for close |
| YAML parsers | Using js-yaml (YAML 1.1) for Kubernetes configs | Use js-yaml with schema: FAILSAFE_SCHEMA for safer parsing |
| Markdown parsers | Not preserving exact formatting on round-trip | Use remark-stringify with exact: true or preserve original |
| Glob patterns | Accidentally matching .git directories | Add explicit exclusions: !.git, !node_modules |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading entire file into memory | Simple buffer operations | Stream processing for large files | Files >100MB, or multiple concurrent files |
| Synchronous file operations | Blocking, no progress indication | Use async operations with progress callbacks | Files >10MB or slow disks |
| No file size validation | Tool hangs or crashes | Check file size before loading, reject oversized files | Files >1GB |
| Reading all files upfront | Fast startup time | Lazy loading, pagination | Projects with >1000 files |
| No caching of parsed data | Always accurate | Cache parsed YAML/frontmatter with invalidation | Parsing >100 files repeatedly |
| Regex on entire file content | Works for small files | Line-by-line processing or streaming | Files with >100K lines |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Following symlinks blindly | Symlink to /etc/passwd allows reading sensitive files | Check fs.lstatSync(), don't follow symlinks outside project dir |
| No path traversal validation | User input "../../../etc/passwd" escapes project dir | Use path.resolve() and verify result is within project boundary |
| Executing arbitrary YAML code | YAML 1.1 allows code execution on parse | Use safe YAML parser (js-yaml with safeLoad) or YAML 1.2 |
| Writing to predictable temp file paths | Race condition allows attacker to hijack file | Use crypto.randomBytes() for temp filenames, not predictable names |
| No input validation on file paths | Malformed Unicode crashes parser | Validate path characters, reject control characters and invalid UTF-8 |
| Preserving execute permissions | Backup preserves +x on malicious script | Strip execute permissions or warn user when restoring backups |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication for slow operations | Users think tool crashed | Print status every 100ms, show progress bar for >1s operations |
| Cryptic error messages with stack traces | Users can't self-service, file support tickets | Catch expected errors, show actionable messages with resolution steps |
| No dry-run/preview mode | Users scared to run tool (might break things) | Add --dry-run flag to preview changes without applying |
| No diff preview before overwrite | Users don't know what will change | Show unified diff, require confirmation for destructive operations |
| Using color as only error indicator | Colorblind users miss errors | Combine color with text prefixes (❌ Error:, ✅ Success:) |
| No undo/rollback mechanism | Users permanently lose data on mistake | Keep backups, provide restore command |
| Silent failures | Users think operation succeeded | Always print success/failure message with summary |
| Operations take >100ms with no feedback | Tool feels broken/unresponsive | Print "Working..." within 100ms, even if operation continues |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Backup creation:** Often missing validation that backup was successful — verify backup exists and is readable before proceeding
- [ ] **YAML parsing:** Often missing edge case handling (Norway problem, octal numbers, sexagesimal) — test with "no", "off", "013", "22:22"
- [ ] **Error messages:** Often missing actionable recovery steps — verify every error message suggests next action
- [ ] **File writes:** Often missing atomic operations — verify write-to-temp-then-rename pattern used everywhere
- [ ] **Permission checks:** Often missing pre-flight validation — verify permissions checked before operations, not during
- [ ] **Line endings:** Often missing cross-platform handling — verify CRLF/LF preserved or normalized consistently
- [ ] **UTF-8 BOM:** Often missing BOM stripping — verify UTF-8 BOM bytes removed before parsing
- [ ] **Symlink handling:** Often missing detection logic — verify fs.lstatSync used, not fs.statSync
- [ ] **Concurrent writes:** Often missing file locking — verify only one process can write to file at a time
- [ ] **Malformed input:** Often missing validation — verify tool handles empty files, binary files, invalid YAML gracefully

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| File overwritten without backup | HIGH (manual recovery) | 1. Check for OS backup (.tmp files, trash, shadow copy) 2. Check git history if in repo 3. Check editor auto-save files 4. Data may be permanently lost |
| Corrupted file from non-atomic write | MEDIUM (depends on corruption) | 1. Check for .tmp file in same directory 2. Restore from backup if available 3. Attempt repair with format-specific tools (YAML linter, JSON.parse with try/catch) |
| YAML parsing corruption | LOW (if backup exists) | 1. Restore from backup 2. Manually fix YAML values (quote strings, fix indentation) 3. Use stricter parser going forward |
| Wrong line endings committed | LOW (automated fix) | 1. Run dos2unix or unix2dos to normalize 2. Configure .gitattributes for future 3. Re-commit fixed files |
| Permission denied error | LOW (user action required) | 1. chmod u+w file or chown $USER file 2. Run tool with appropriate permissions 3. Move file to user-writable location |
| Symlink followed to wrong location | MEDIUM (depends on damage) | 1. Restore affected files from backup 2. Remove or redirect symlink 3. Re-run tool with corrected paths |
| Partial backup rotation (lost history) | HIGH (history gone) | 1. Increase backup retention count 2. Use version control for important files 3. Cannot recover lost backup versions |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| File overwrite without reading | Phase 1: Core File Operations | All file modification functions require current content as parameter |
| Non-atomic writes | Phase 2: Backup & Safety | All writes use temp-file-then-rename pattern verified in tests |
| Backup failure proceeding anyway | Phase 2: Backup & Safety | Integration tests verify operation halts if backup fails |
| YAML parsing edge cases | Phase 1: Core File Operations, Phase 3: Validation | Unit tests cover Norway problem, octal, sexagesimal, BOM, anchors |
| Cross-platform encoding/line endings | Phase 1: Core File Operations, Phase 4: Cross-platform | Tests run on Windows, Linux, macOS with different line ending fixtures |
| Permission errors not handled | Phase 3: Validation & Error Handling | Error message tests verify actionable guidance provided |
| Symlink/junction handling | Phase 4: Cross-platform Testing | Tests with symlinked files and directories on all platforms |
| No progress indication | Phase 5: User Experience Polish | User testing confirms no operation feels "hung" or unresponsive |
| No diff preview | Phase 5: User Experience Polish | Manual QA verifies diff shown before all destructive operations |
| Malformed file handling | Phase 3: Validation | Fuzz testing with corrupted, empty, binary, and invalid files |

## Sources

### Critical Data Loss Issues
- [Critical Data Loss: Gemini agent overwrote user file](https://github.com/google-gemini/gemini-cli/issues/3823)
- [Critical: edit_file tool causes massive data loss in large files (54% file deleted)](https://github.com/orgs/community/discussions/178656)

### YAML Parsing Edge Cases
- [The yaml document from hell](https://ruudvanasseldonk.com/2023/01/11/the-yaml-document-from-hell)
- [YAML is confusing for edge cases (true/false, quoting)](https://news.ycombinator.com/item?id=34352033)
- [The yaml document from hell — JavaScript edition](https://philna.sh/blog/2023/02/02/yaml-document-from-hell-javascript-edition/)
- [7 YAML gotchas to avoid—and how to avoid them](https://www.infoworld.com/article/2336307/7-yaml-gotchas-to-avoidand-how-to-avoid-them.html)
- [YAML: probably not so great after all](https://www.arp242.net/yaml-config.html)
- [Fix: handle YAML parsing edge cases in CustomModesManager](https://github.com/RooCodeInc/Roo-Code/pull/5099)

### Atomic File Operations
- [A way to do atomic writes](https://lwn.net/Articles/789600/)
- [Safely and atomically write to a file](https://code.activestate.com/recipes/579097-safely-and-atomically-write-to-a-file/)
- [Avoid Race Conditions](https://tldp.org/HOWTO/Secure-Programs-HOWTO/avoid-race.html)
- [POSIX write() is not atomic in the way that you might like](https://utcc.utoronto.ca/~cks/space/blog/unix/WriteNotVeryAtomic)
- [Atomic file operations: Replace, AtomicMove](https://github.com/bobvanderlinden/sharpfilesystem/issues/8)

### Cross-Platform Encoding & Line Endings
- [Cross-platform Node.js guide: Character encoding](https://github.com/ehmicky/cross-platform-node-guide/blob/main/docs/2_file_encoding/character_encoding.md)
- [How do you handle different line endings and character encodings in cross-platform shell scripts?](https://www.linkedin.com/advice/0/how-do-you-handle-different-line-endings-character)
- [Filename encoding and interoperability problems](https://cloud.google.com/storage/docs/gsutil/addlhelp/Filenameencodingandinteroperabilityproblems)

### Backup Strategies
- [OneDrive sync overwriting local files](https://github.com/abraunegg/onedrive/discussions/1813)
- [Command-line interface for Backup Manager](https://documentation.n-able.com/covedataprotection/USERGUIDE/documentation/Content/backup-manager/backup-manager-guide/command-line.htm)
- [Make Your Own Backup System – Part 1: Strategy Before Scripts](https://it-notes.dragas.net/2025/07/18/make-your-own-backup-system-part-1-strategy-before-scripts/)

### Symlinks & Cross-Platform Issues
- [symlinks on Windows - why do hardlinks and junctions recurse?](https://github.com/ember-cli/ember-cli/issues/4047)
- [Symlinks - MSYS2](https://www.msys2.org/docs/symlinks/)
- [pnpm/symlink-dir: Cross-platform directory symlinking](https://github.com/pnpm/symlink-dir)
- [question: symlinks vs. hardlinks](https://github.com/treeverse/dvc/issues/2459)

### CLI UX & Error Handling
- [Command Line Interface Guidelines](https://clig.dev/)
- [Error Handling in CLI Tools: A Practical Pattern That's Worked for Me](https://medium.com/@czhoudev/error-handling-in-cli-tools-a-practical-pattern-thats-worked-for-me-6c658a9141a9)
- [UX patterns for CLI tools](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html)
- [Best Practices Building a CLI Tool for Your Service](https://zapier.com/engineering/how-to-cli/)
- [How to Write Helpful Error Messages to Improve Your App's User Experience](https://www.freecodecamp.org/news/how-to-write-helpful-error-messages-to-improve-your-apps-ux/)

### Permission Errors
- [Permission Denied: How to Overcome 'Access Denied' Errors](https://dev.to/fitehal/permission-denied-how-to-overcome-access-denied-errors-44fe)
- [Fix File Permission Errors on Windows, macOS, and Linux](https://www.sixmedium.com/fix-file-permission-errors-windows-mac-linux/)

### Frontmatter Parsing
- [GitHub: FrontYAML - YAML Front matter parser](https://github.com/mnapoli/FrontYAML)
- [Frontmatter | MDX](https://mdxjs.com/guides/frontmatter/)
- [Front Matter | Jekyll](https://jekyllrb.com/docs/front-matter/)
- [remarkjs/remark-frontmatter](https://github.com/remarkjs/remark-frontmatter)

---
*Pitfalls research for: CLI File Manipulation Tools*
*Researched: 2026-01-30*
