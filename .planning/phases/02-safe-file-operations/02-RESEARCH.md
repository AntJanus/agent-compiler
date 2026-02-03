# Phase 2: Safe File Operations - Research

**Researched:** 2026-02-03
**Domain:** Atomic file operations, backup/restore mechanisms, content hashing, file safety patterns
**Confidence:** HIGH

## Summary

Phase 2 implements file safety infrastructure for protecting CLAUDE.md and AGENTS.md during write operations. This research focused on identifying battle-tested patterns for atomic writes, backup creation with content verification, and restore functionality in Node.js.

The standard approach uses Node.js native **fs.promises** with the write-to-temp-then-rename pattern for atomic writes, **crypto.createHash** for SHA-256 content verification, and time-based retention with modification time filtering for backup cleanup. The critical insight is that fs.rename() provides atomic guarantees on Unix-like systems but requires same-filesystem temp files, and backup verification should use content hashes rather than just existence checks.

**Primary recommendation:** Implement atomic writes using native Node.js APIs (fs.promises.writeFile + fs.promises.rename) with temp files in the same directory as target files. Use SHA-256 hashes in backup filenames for verification and unique identification. Implement auto-rollback on validation failure by restoring from the most recent backup immediately.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs.promises | Native (v14+) | Asynchronous file operations with async/await | Built-in, no dependencies. fs.promises.writeFile() is recommended for modern Node.js (2026). Supports UTF-8 encoding by default. Used universally. |
| Node.js crypto | Native | SHA-256 hash generation for content verification | Built-in cryptographic module. crypto.createHash('sha256') is the standard for secure hashing. No dependencies. Supports streams for large files. |
| Node.js path | Native | Path manipulation and resolution | Cross-platform path operations. Ensures temp files are created in same directory as target (required for atomic rename). |

### Supporting Utilities

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.randomBytes | Native | Generate unique temporary file identifiers | Creating unpredictable temp file names (e.g., CLAUDE.md.tmp.a3b2c1d4). Cryptographically secure randomness. |
| fs.promises.stat | Native | Get file metadata (mtime, size) | Filtering backups by age for retention policy. Checking file existence before operations. |
| fs.promises.unlink | Native | Delete files | Cleanup of old backups and failed temp files. |
| fs.promises.mkdir | Native | Create backup directories | Use with `recursive: true` for creating `.agent-compiler/backups/` hierarchy. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fs.promises | write-file-atomic npm package | write-file-atomic (v7.0.0, 1.8M weekly downloads) abstracts the pattern but adds dependency. Native approach gives full control and understanding. Only use write-file-atomic if you need chown/fsync options. |
| crypto.createHash | third-party hash libraries | crypto is built-in and cryptographically secure. Third-party libraries add no value for SHA-256. |
| Time-based retention | Content-deduplication with hash storage | Content-addressable storage is more complex. Time-based is simpler and sufficient for backup use case (recent backups matter most). |
| Manual directory walk | fs.promises.readdir with filter | readdir is sufficient for single directory. No need for recursive walk (backups are flat). |

**Installation:**
```bash
# No installation needed - all native Node.js APIs
# Works with Node.js 14+ (fs.promises stable)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── file-safety/              # File safety operations
│   ├── atomic-writer.ts      # Atomic write with temp-then-rename
│   ├── backup-manager.ts     # Create and manage backups
│   ├── restore-manager.ts    # Restore from backup
│   ├── hash-generator.ts     # Generate SHA-256 hashes
│   └── retention-policy.ts   # Cleanup old backups
├── validation/               # Post-write validation
│   ├── markdown-validator.ts # Validate markdown structure
│   └── structure-validator.ts # Validate expected sections
└── types/
    ├── backup.ts             # Backup metadata types
    └── write-result.ts       # Write operation result types
```

### Pattern 1: Atomic Write with Temp-Then-Rename

**What:** Write content to temporary file in same directory, then atomically rename to target filename.

**When to use:** Any write operation that modifies CLAUDE.md or AGENTS.md. Prevents partial writes from corrupting files.

**Example:**
```typescript
// Source: Node.js fs.promises documentation + write-file-atomic pattern
import { writeFile, rename, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';

async function atomicWrite(targetPath: string, content: string): Promise<void> {
  // Generate unique temp filename in same directory (required for atomic rename)
  const dir = dirname(targetPath);
  const tempSuffix = randomBytes(8).toString('hex');
  const tempPath = join(dir, `.${basename(targetPath)}.tmp.${tempSuffix}`);

  try {
    // Write to temp file with UTF-8 encoding (enforced)
    await writeFile(tempPath, content, { encoding: 'utf8' });

    // Atomic rename (atomic on POSIX, same-volume Windows)
    await rename(tempPath, targetPath);
  } catch (error) {
    // Cleanup temp file on failure (keep for debugging per CONTEXT.md)
    // Note: Don't auto-delete to preserve debugging info
    throw new Error(`Atomic write failed: ${targetPath}\nReason: ${error.message}`);
  }
}
```

### Pattern 2: Hash-Based Backup with Verification

**What:** Create backup with content hash in filename for verification and unique identification.

**When to use:** Before any write operation. Hash serves dual purpose: verification and deduplication.

**Example:**
```typescript
// Source: Node.js crypto documentation for SHA-256 hashing
import { createHash } from 'crypto';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

function generateContentHash(content: string): string {
  return createHash('sha256')
    .update(content, 'utf8')
    .digest('hex')
    .substring(0, 16); // First 16 chars for filename brevity
}

function generateBackupFilename(originalName: string, timestamp: Date, hash: string): string {
  // ISO 8601 format, filesystem-safe (replace colons with hyphens)
  const isoTimestamp = timestamp.toISOString().replace(/:/g, '-');
  const baseName = originalName.replace(/\.md$/, '');
  return `${baseName}_${isoTimestamp}_${hash}.md`;
}

async function createBackup(targetPath: string, backupDir: string): Promise<string> {
  // Read current content
  const content = await readFile(targetPath, 'utf8');

  // Generate hash for verification
  const hash = generateContentHash(content);

  // Generate backup filename with timestamp and hash
  const filename = generateBackupFilename(
    basename(targetPath),
    new Date(),
    hash
  );

  const backupPath = join(backupDir, filename);

  // Write backup (use atomic write for backups too)
  await writeFile(backupPath, content, { encoding: 'utf8' });

  // Verify backup was written successfully
  const backupExists = await access(backupPath).then(() => true).catch(() => false);
  if (!backupExists) {
    throw new Error(`Backup verification failed: ${backupPath}`);
  }

  // Verify content hash matches
  const backupContent = await readFile(backupPath, 'utf8');
  const backupHash = generateContentHash(backupContent);
  if (backupHash !== hash) {
    throw new Error(`Backup hash mismatch: ${backupPath}`);
  }

  return backupPath;
}
```

### Pattern 3: Time-Based Retention Cleanup

**What:** Delete backups older than configured threshold using modification time filtering.

**When to use:** After successful backup creation or on scheduled maintenance.

**Example:**
```typescript
// Source: Node.js fs.promises.readdir + stat for time-based filtering
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

async function cleanupOldBackups(
  backupDir: string,
  retentionDays: number
): Promise<number> {
  const files = await readdir(backupDir);
  const now = Date.now();
  const maxAge = retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const file of files) {
    // Only process backup files (*.md with timestamp pattern)
    if (!file.match(/\.md$/)) continue;

    const filePath = join(backupDir, file);
    const stats = await stat(filePath);

    // Check if file is old enough to delete
    if (stats.isFile()) {
      const fileAge = now - stats.mtime.getTime();
      if (fileAge > maxAge) {
        await unlink(filePath);
        deletedCount++;
      }
    }
  }

  return deletedCount;
}
```

### Pattern 4: Auto-Rollback on Validation Failure

**What:** After successful write, validate structure. If validation fails, immediately restore from backup.

**When to use:** After every atomic write to ensure written file is valid.

**Example:**
```typescript
// Source: Error handling best practices + atomic operations
async function safeWrite(
  targetPath: string,
  content: string,
  backupPath: string
): Promise<void> {
  // Perform atomic write
  await atomicWrite(targetPath, content);

  try {
    // Validate written file structure
    const writtenContent = await readFile(targetPath, 'utf8');
    await validateMarkdownStructure(writtenContent);
  } catch (validationError) {
    // Validation failed - restore from backup immediately
    console.error(`Validation failed, restoring from backup: ${backupPath}`);

    try {
      const backupContent = await readFile(backupPath, 'utf8');
      await atomicWrite(targetPath, backupContent);
    } catch (restoreError) {
      throw new Error(
        `CRITICAL: Write validation failed AND restore failed.\n` +
        `Original error: ${validationError.message}\n` +
        `Restore error: ${restoreError.message}\n` +
        `Backup location: ${backupPath}`
      );
    }

    throw new Error(
      `Write validation failed. File restored from backup.\n` +
      `Validation error: ${validationError.message}`
    );
  }
}
```

### Pattern 5: Backup Discovery and Selection

**What:** List available backups sorted by timestamp for user selection during restore.

**When to use:** Restore command where user needs to select from available backups.

**Example:**
```typescript
// Source: Node.js readdir + stat for sorting by modification time
interface BackupInfo {
  filename: string;
  path: string;
  timestamp: Date;
  hash: string;
  size: number;
}

async function discoverBackups(
  backupDir: string,
  targetFile: string
): Promise<BackupInfo[]> {
  const files = await readdir(backupDir);
  const baseName = basename(targetFile, '.md');
  const backups: BackupInfo[] = [];

  for (const file of files) {
    // Match backups for this specific file
    if (!file.startsWith(baseName)) continue;

    const filePath = join(backupDir, file);
    const stats = await stat(filePath);

    if (stats.isFile()) {
      // Parse timestamp and hash from filename
      // Format: CLAUDE_2026-02-03T12-30-45.123Z_a3b2c1d4e5f6.md
      const match = file.match(/_(\d{4}-\d{2}-\d{2}T[\d\-\.]+Z)_([a-f0-9]+)\.md$/);
      if (match) {
        backups.push({
          filename: file,
          path: filePath,
          timestamp: new Date(match[1].replace(/-/g, ':')),
          hash: match[2],
          size: stats.size
        });
      }
    }
  }

  // Sort by timestamp descending (newest first)
  return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
```

### Anti-Patterns to Avoid

- **Temp files in different directory:** Don't create temp files in /tmp or different filesystem. fs.rename() is only atomic when source and destination are on same filesystem. Always create temp files in same directory as target.

- **Not validating backup creation:** Don't assume writeFile succeeded. Always verify backup exists and is readable before proceeding with write operation. Hash verification prevents silent corruption.

- **Deleting temp files on write failure:** Keep temp files when write operations fail (per CONTEXT.md decision). They're valuable for debugging why compilation failed.

- **Using fs.access() before operations:** Don't check file existence with fs.access() then read/write. This creates race condition. Instead, attempt operation and handle ENOENT errors.

- **Synchronous file operations in async code:** Never use fs.writeFileSync, fs.renameSync in async functions. They block the event loop. Always use fs.promises API.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic file writes | Custom write + fsync logic | fs.promises.writeFile + rename pattern (or write-file-atomic) | Cross-platform atomicity is hard. Write-then-rename is proven pattern. Handles temp file cleanup, fsync, permissions. |
| Content hashing | Custom hash function or MD5 | crypto.createHash('sha256') | Cryptographically secure built-in. SHA-256 is industry standard. Supports streaming for large files. MD5 is deprecated for security. |
| Unique filename generation | Timestamp alone or Math.random() | crypto.randomBytes(8).toString('hex') | Collisions possible with timestamps (concurrent writes) or Math.random. crypto.randomBytes is cryptographically secure. |
| Disk space checking | Parsing df command output | check-disk-space npm package (1.8M downloads/week) | No built-in Node.js API for disk space. check-disk-space is cross-platform, lightweight, and battle-tested. |
| File locking for concurrent writes | Custom lock files | proper-lockfile npm package | File locking has race conditions and platform differences. proper-lockfile handles stale locks, retries, and cleanup correctly. |

**Key insight:** File operations have non-obvious atomicity guarantees. fs.rename() is atomic on POSIX but only on same filesystem. Temp files must be in target directory. Content hashing prevents silent corruption that timestamp-only backups miss. crypto.randomBytes prevents collisions that timestamp or Math.random can't guarantee.

## Common Pitfalls

### Pitfall 1: Temp Files on Different Filesystem

**What goes wrong:** fs.rename() fails or is not atomic when temp file and target are on different filesystems (e.g., /tmp on separate partition).

**Why it happens:** Developers assume /tmp is always safe place for temp files. rename() falls back to copy-then-delete on different filesystems, losing atomicity.

**How to avoid:**
- Always create temp files in same directory as target file
- Use dirname(targetPath) to get target directory
- Add random suffix to avoid collisions

**Warning signs:**
- Temp files created in /tmp or os.tmpdir()
- rename() wrapped in try-catch without specific error handling
- No tests for atomic rename behavior

**Code example:**
```typescript
// Bad: Temp file in different location (not atomic)
const tempPath = join(os.tmpdir(), 'temp.md');
await writeFile(tempPath, content);
await rename(tempPath, targetPath); // May not be atomic!

// Good: Temp file in same directory (atomic)
const tempPath = join(dirname(targetPath), `.${basename(targetPath)}.tmp.${randomId}`);
await writeFile(tempPath, content);
await rename(tempPath, targetPath); // Atomic on same filesystem
```

### Pitfall 2: ENOSPC (Disk Full) Not Handled Gracefully

**What goes wrong:** Tool crashes with cryptic error when disk is full, leaving temp files and partial writes.

**Why it happens:** Developers don't specifically handle ENOSPC error code. Generic error handler doesn't provide actionable guidance.

**How to avoid:**
- Check error.code === 'ENOSPC' specifically
- Provide clear error message with actionable steps
- Consider checking disk space before large writes
- Clean up temp files on disk full errors

**Warning signs:**
- No specific ENOSPC error handling
- Generic "write failed" messages
- Temp files accumulating after failed writes

**Code example:**
```typescript
// Bad: Generic error handling
try {
  await writeFile(tempPath, content);
} catch (error) {
  throw new Error('Write failed');
}

// Good: Specific ENOSPC handling
try {
  await writeFile(tempPath, content);
} catch (error) {
  if (error.code === 'ENOSPC') {
    throw new Error(
      `Insufficient disk space to write: ${targetPath}\n` +
      `Free up disk space and try again.`
    );
  }
  if (error.code === 'EACCES') {
    throw new Error(
      `Permission denied writing: ${targetPath}\n` +
      `Check file permissions.`
    );
  }
  throw error;
}
```

### Pitfall 3: Backup Directory Creation Race Condition

**What goes wrong:** Multiple concurrent processes try to create backup directory, causing race condition or mkdir failure.

**Why it happens:** mkdir without recursive:true fails if directory exists. Checking existence then creating has race condition.

**How to avoid:**
- Use mkdir with recursive:true (idempotent, handles existing directory)
- Don't check directory existence before creating
- Handle EEXIST error gracefully (directory already exists is success)

**Warning signs:**
- fs.access check before mkdir
- mkdir without recursive option
- No EEXIST error handling

**Code example:**
```typescript
// Bad: Race condition between check and create
if (!(await exists(backupDir))) {
  await mkdir(backupDir);
}

// Good: Idempotent mkdir with recursive
try {
  await mkdir(backupDir, { recursive: true });
} catch (error) {
  if (error.code !== 'EEXIST') {
    throw error;
  }
  // EEXIST is fine - directory already exists
}
```

### Pitfall 4: ISO 8601 Timestamps in Filenames with Colons

**What goes wrong:** Backup filenames with ISO 8601 timestamps fail on Windows (colons invalid in filenames) or create confusing filenames.

**Why it happens:** toISOString() returns format like "2026-02-03T12:30:45.123Z" with colons. Windows doesn't allow colons in filenames.

**How to avoid:**
- Replace colons with hyphens: .replace(/:/g, '-')
- Use compact format: YYYYMMDDTHHmmss
- Always use UTC (Z suffix) for consistent sorting

**Warning signs:**
- Direct use of toISOString() in filenames
- No cross-platform filename testing
- Timestamps without timezone indicator

**Code example:**
```typescript
// Bad: Colons in filename (fails on Windows)
const timestamp = new Date().toISOString(); // "2026-02-03T12:30:45.123Z"
const filename = `backup_${timestamp}.md`; // Invalid on Windows!

// Good: Filesystem-safe timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const filename = `backup_${timestamp}.md`; // "backup_2026-02-03T12-30-45.123Z.md"
```

### Pitfall 5: Not Verifying Backup Before Write

**What goes wrong:** Backup creation appears successful but backup is corrupted or unreadable. Write proceeds, corrupting target file. No recovery possible.

**Why it happens:** Developers trust that writeFile succeeded without verification. Silent corruption or partial writes go undetected.

**How to avoid:**
- Read backup after writing to verify it's readable
- Compare content hash of backup vs original
- Only proceed with write operation after backup verified
- Fail fast if backup verification fails

**Warning signs:**
- No verification after backup creation
- Backup creation in background/async without waiting
- No hash comparison

**Code example:**
```typescript
// Bad: No verification
await writeFile(backupPath, content);
// Trust it worked, proceed with write

// Good: Verify backup before proceeding
await writeFile(backupPath, content, { encoding: 'utf8' });

// Verify backup is readable
const backupContent = await readFile(backupPath, 'utf8');

// Verify content hash matches
const originalHash = generateContentHash(content);
const backupHash = generateContentHash(backupContent);
if (originalHash !== backupHash) {
  throw new Error(`Backup verification failed: hash mismatch for ${backupPath}`);
}

// Now safe to proceed with write operation
```

### Pitfall 6: Race Conditions with Concurrent Writes

**What goes wrong:** Multiple processes write to same file concurrently, causing corruption or lost updates.

**Why it happens:** Node.js file operations are asynchronous but not coordinated. Two writes can interleave, corrupting file.

**How to avoid:**
- For CLI tools, concurrent writes are unlikely (single process)
- If concurrency is possible, use file locking (proper-lockfile)
- Use exclusive write flag: { flag: 'wx' } for create-only writes
- Document that tool doesn't support concurrent execution

**Warning signs:**
- No documentation about concurrent use
- No file locking mechanism
- Tool designed for automated/scheduled use (higher concurrency risk)

**Code example:**
```typescript
// Per CONTEXT.md: Concurrent write handling is Claude's discretion
// Recommendation: For CLI tool, document single-process assumption

// If concurrency needed, use file locking:
import lockfile from 'proper-lockfile';

async function atomicWriteWithLock(targetPath: string, content: string): Promise<void> {
  const release = await lockfile.lock(targetPath, {
    retries: { retries: 5, maxTimeout: 2000 }
  });

  try {
    await atomicWrite(targetPath, content);
  } finally {
    await release();
  }
}
```

## Code Examples

Verified patterns from official sources:

### Complete Atomic Write with Backup and Rollback

```typescript
// Source: Node.js fs.promises API + atomic write pattern
import { writeFile, rename, readFile, mkdir, unlink } from 'fs/promises';
import { dirname, basename, join } from 'path';
import { randomBytes, createHash } from 'crypto';

interface WriteResult {
  success: boolean;
  backupPath: string;
  targetPath: string;
}

async function safeFileWrite(
  targetPath: string,
  content: string,
  backupDir: string
): Promise<WriteResult> {
  // Ensure backup directory exists
  await mkdir(backupDir, { recursive: true });

  // Create backup of current file
  const currentContent = await readFile(targetPath, 'utf8');
  const backupPath = await createBackup(targetPath, currentContent, backupDir);

  // Verify backup
  await verifyBackup(backupPath, currentContent);

  // Generate temp file path
  const dir = dirname(targetPath);
  const tempSuffix = randomBytes(8).toString('hex');
  const tempPath = join(dir, `.${basename(targetPath)}.tmp.${tempSuffix}`);

  try {
    // Atomic write operation
    await writeFile(tempPath, content, { encoding: 'utf8' });
    await rename(tempPath, targetPath);

    // Validate written content
    const writtenContent = await readFile(targetPath, 'utf8');
    await validateMarkdownStructure(writtenContent);

    return {
      success: true,
      backupPath,
      targetPath
    };
  } catch (error) {
    // Restore from backup on any failure
    console.error(`Write or validation failed, restoring from backup`);
    await restoreFromBackup(backupPath, targetPath);

    throw new Error(
      `Write operation failed and was rolled back.\n` +
      `Target: ${targetPath}\n` +
      `Backup: ${backupPath}\n` +
      `Error: ${error.message}`
    );
  }
}

async function createBackup(
  targetPath: string,
  content: string,
  backupDir: string
): Promise<string> {
  const hash = createHash('sha256')
    .update(content, 'utf8')
    .digest('hex')
    .substring(0, 16);

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const baseName = basename(targetPath, '.md');
  const filename = `${baseName}_${timestamp}_${hash}.md`;

  const backupPath = join(backupDir, filename);
  await writeFile(backupPath, content, { encoding: 'utf8' });

  return backupPath;
}

async function verifyBackup(backupPath: string, originalContent: string): Promise<void> {
  const backupContent = await readFile(backupPath, 'utf8');
  const originalHash = createHash('sha256').update(originalContent, 'utf8').digest('hex');
  const backupHash = createHash('sha256').update(backupContent, 'utf8').digest('hex');

  if (originalHash !== backupHash) {
    throw new Error(`Backup verification failed: ${backupPath}`);
  }
}

async function restoreFromBackup(backupPath: string, targetPath: string): Promise<void> {
  const backupContent = await readFile(backupPath, 'utf8');

  const dir = dirname(targetPath);
  const tempSuffix = randomBytes(8).toString('hex');
  const tempPath = join(dir, `.${basename(targetPath)}.tmp.${tempSuffix}`);

  await writeFile(tempPath, backupContent, { encoding: 'utf8' });
  await rename(tempPath, targetPath);
}

async function validateMarkdownStructure(content: string): Promise<void> {
  // Validate markdown is not empty
  if (!content.trim()) {
    throw new Error('Markdown content is empty');
  }

  // Validate basic markdown structure (has headings)
  const hasHeadings = /^#{1,6}\s+.+$/m.test(content);
  if (!hasHeadings) {
    throw new Error('Markdown missing expected headings');
  }
}
```

### Streaming Hash Generation for Large Files

```typescript
// Source: Node.js crypto documentation
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

async function hashFileContent(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath, { encoding: 'utf8' });

  await pipeline(
    stream,
    async function* (source) {
      for await (const chunk of source) {
        hash.update(chunk);
        yield chunk;
      }
    }
  );

  return hash.digest('hex');
}
```

### Time-Based Backup Retention with Detailed Logging

```typescript
// Source: Node.js fs.promises readdir + stat + unlink
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

interface CleanupResult {
  deletedCount: number;
  deletedFiles: string[];
  keptCount: number;
}

async function cleanupOldBackups(
  backupDir: string,
  retentionDays: number = 30
): Promise<CleanupResult> {
  const files = await readdir(backupDir);
  const now = Date.now();
  const maxAge = retentionDays * 24 * 60 * 60 * 1000;

  const result: CleanupResult = {
    deletedCount: 0,
    deletedFiles: [],
    keptCount: 0
  };

  for (const file of files) {
    // Only process backup files (*.md)
    if (!file.endsWith('.md')) continue;

    const filePath = join(backupDir, file);
    const stats = await stat(filePath);

    if (stats.isFile()) {
      const fileAge = now - stats.mtime.getTime();

      if (fileAge > maxAge) {
        try {
          await unlink(filePath);
          result.deletedCount++;
          result.deletedFiles.push(file);
        } catch (error) {
          console.warn(`Failed to delete backup: ${file} - ${error.message}`);
        }
      } else {
        result.keptCount++;
      }
    }
  }

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| fs.writeFile callback API | fs.promises.writeFile with async/await | 2017 (Node.js 10) | Modern async/await syntax, better error handling, cleaner code |
| MD5 for content hashing | SHA-256 via crypto.createHash | 2020s | MD5 deprecated for security. SHA-256 is current standard for integrity verification |
| Custom atomic write implementations | Native fs.rename pattern (or write-file-atomic) | 2015+ | write-file-atomic (7.0.0) standardized pattern. Native approach now well-documented |
| Timestamp-only backup filenames | Timestamp + content hash | 2020s | Hash enables verification and deduplication. Prevents silent corruption |
| Checking fs.access before operations | Attempt operation, handle errors | Node.js best practices | Eliminates race condition. TOCTOU (time-of-check-time-of-use) vulnerability |

**Deprecated/outdated:**
- **fs callback API**: Use fs.promises for all new code (since Node.js 10+)
- **MD5 hashing**: Use SHA-256 for integrity checks (MD5 cryptographically broken)
- **fs.exists()**: Deprecated since Node.js 0.12. Use fs.access() or attempt operation directly
- **Synchronous operations in async code**: Never use fs.writeFileSync in async functions (blocks event loop)

## Open Questions

Things that couldn't be fully resolved:

1. **Question: Optimal backup retention duration?**
   - What we know: User decided time-based retention. Common defaults are 7-30 days for local backups.
   - What's unclear: Whether 7 days (1 week) or 30 days (1 month) is better default for this tool's use case.
   - Recommendation: Start with 30 days (safer, more recovery options). Make configurable. Most backup tools default to 30 days for local backups.

2. **Question: Fallback strategy when backup directory creation fails?**
   - What we know: mkdir with recursive:true should create `.agent-compiler/backups/`. Could fail due to permissions or disk full.
   - What's unclear: Should tool abort (safest) or continue without backup (allows write to succeed)?
   - Recommendation: ABORT write operation if backup directory can't be created. Failing without backup defeats the safety purpose. Error message should explain permission/disk issue.

3. **Question: Should we implement file locking for concurrent writes?**
   - What we know: CLI tools typically run single process. File locking adds complexity (proper-lockfile dependency).
   - What's unclear: Whether users will run tool concurrently (e.g., automated scripts, multiple terminals).
   - Recommendation: For Phase 2, SKIP file locking. Document that concurrent execution is unsupported. Add locking in future phase if users report corruption issues.

4. **Question: Should current file be backed up before restoring?**
   - What we know: Restore replaces current file with backup. Current file might have important changes.
   - What's unclear: Whether to backup-before-restore (safer but clutters backups) or restore directly (user asked for it).
   - Recommendation: YES, backup current file before restore. Use special naming like `CLAUDE_pre-restore_[timestamp]_[hash].md` to distinguish. Prevents accidental data loss.

5. **Question: Proactive disk space checking?**
   - What we know: check-disk-space npm package (1.8M downloads/week) provides cross-platform disk space info. Adds dependency.
   - What's unclear: Whether to check disk space before writes (prevents ENOSPC) or just handle error (simpler).
   - Recommendation: For Phase 2, SKIP proactive checking. Handle ENOSPC errors with clear messages. Add disk space checking in future phase if users frequently hit disk full errors.

## Sources

### Primary (HIGH confidence)

- [Node.js File System API Documentation](https://nodejs.org/api/fs.html) - Official fs.promises.writeFile, rename, mkdir, stat, readdir documentation (v25.6.0)
- [Node.js Crypto API Documentation](https://nodejs.org/api/crypto.html) - Official crypto.createHash, randomBytes documentation (v25.6.0)
- [write-file-atomic GitHub Repository](https://github.com/npm/write-file-atomic) - Authoritative atomic write pattern implementation
- [write-file-atomic npm package](https://www.npmjs.com/package/write-file-atomic) - Version 7.0.0, 1.8M weekly downloads

### Secondary (MEDIUM confidence)

- [Reading and Writing Files in Node.js - The Complete Modern Guide](https://nodejsdesignpatterns.com/blog/reading-writing-files-nodejs/) - Modern file operation patterns
- [Node.js — Calculate a SHA256 Hash](https://futurestud.io/tutorials/node-js-calculate-a-sha256-hash) - Hash generation patterns
- [16 Common Errors in Node.js and How to Fix Them](https://betterstack.com/community/guides/scaling-nodejs/nodejs-errors/) - ENOSPC, EACCES error handling
- [Node.js race conditions](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/) - Race condition patterns and solutions
- [Node.js File Locking with proper-lockfile](https://www.somethingsblog.com/2024/10/22/node-js-file-locking-ensuring-data-integrity-with-proper-lockfile/) - File locking for concurrent writes
- [Understanding Node.js file locking](https://blog.logrocket.com/understanding-node-js-file-locking/) - File locking mechanisms

### Tertiary (LOW confidence - marked for validation)

- [check-disk-space npm package](https://www.npmjs.com/package/check-disk-space) - Disk space checking (1.8M downloads/week, but not verified for accuracy)
- [proper-lockfile npm package](https://www.npmjs.com/package/proper-lockfile) - File locking library (mentioned but API not deeply verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native Node.js APIs, fs.promises and crypto are well-documented and stable
- Architecture patterns: HIGH - Atomic write pattern verified in official docs and write-file-atomic implementation
- Backup/restore approach: HIGH - Time-based retention and hash verification are industry standard patterns
- Error handling: MEDIUM - ENOSPC and EACCES handling verified in Node.js docs, but platform-specific behavior varies
- Concurrent write handling: MEDIUM - File locking patterns verified but recommendation to skip is based on CLI tool assumptions

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable Node.js APIs, no fast-moving changes expected)
