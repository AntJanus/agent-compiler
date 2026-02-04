import { writeFile, rename } from 'fs/promises';
import { dirname, basename, join } from 'path';
import { randomBytes } from 'crypto';

/**
 * Atomically writes content to a file using the write-to-temp-then-rename pattern.
 *
 * This ensures that file modifications either completely succeed or completely fail,
 * preventing partial writes that could corrupt CLAUDE.md or AGENTS.md files.
 *
 * Pattern:
 * 1. Generate unique temp filename with random hex suffix
 * 2. Write content to temp file in same directory as target (required for atomic rename)
 * 3. Atomically rename temp file to target (atomic on same filesystem)
 *
 * On success: temp file is gone (renamed to target)
 * On failure: temp file remains for debugging (per SAFETY-04)
 *
 * @param targetPath - Absolute path to the file to write
 * @param content - Content to write (will be encoded as UTF-8)
 * @throws Error with descriptive message including path and specific reason
 */
export async function atomicWrite(targetPath: string, content: string): Promise<void> {
  // Generate unique temp filename in same directory as target
  // Format: .{basename}.tmp.{randomHex}
  // Example: .CLAUDE.md.tmp.a3b2c1d4e5f67890
  const dir = dirname(targetPath);
  const base = basename(targetPath);
  const randomHex = randomBytes(8).toString('hex');
  const tempPath = join(dir, `.${base}.tmp.${randomHex}`);

  try {
    // Write content to temp file with UTF-8 encoding (SAFETY-05)
    await writeFile(tempPath, content, { encoding: 'utf8' });

    // Atomically rename temp file to target
    // This is atomic on Unix-like systems when on same filesystem
    await rename(tempPath, targetPath);

    // Success: temp file is now the target file
  } catch (error: any) {
    // Provide specific, actionable error messages
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

    if (error.code === 'ENOENT') {
      throw new Error(
        `Directory does not exist: ${dir}\n` +
        `Create the directory first.`
      );
    }

    // Generic error with path and reason
    throw new Error(
      `Write failed: ${targetPath}\n` +
      `Reason: ${error.message}`
    );
  }

  // Note: On failure, temp file is intentionally NOT deleted
  // This preserves debugging information per CONTEXT.md (SAFETY-04)
}
