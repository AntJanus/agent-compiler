import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateContentHash, generateBackupFilename } from './hash-generator.js';

export interface BackupResult {
  backupPath: string;
  originalHash: string;
  verified: boolean;
}

/**
 * Create a backup of the target file with content hash verification
 * @param targetPath - Absolute path to file to backup
 * @param backupDir - Absolute path to backup directory
 * @returns BackupResult with backup path, hash, and verification status
 * @throws Error if backup creation or verification fails
 */
export async function createBackup(
  targetPath: string,
  backupDir: string
): Promise<BackupResult> {
  try {
    // Read current file content
    const content = await readFile(targetPath, 'utf8');

    // Generate content hash
    const hash = generateContentHash(content);

    // Generate backup filename
    const timestamp = new Date();
    const originalName = targetPath.split('/').pop() || 'backup.md';
    const backupFilename = generateBackupFilename(originalName, timestamp, hash);
    const backupPath = join(backupDir, backupFilename);

    // Create backup directory if it doesn't exist
    await mkdir(backupDir, { recursive: true });

    // Write backup file
    await writeFile(backupPath, content, 'utf8');

    // Verify backup
    await verifyBackup(backupPath, hash);

    return {
      backupPath,
      originalHash: hash,
      verified: true,
    };
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === 'ENOSPC') {
        throw new Error(
          `Backup creation failed for ${targetPath}: disk full (ENOSPC)`
        );
      }

      if (nodeError.code === 'EACCES') {
        throw new Error(
          `Backup creation failed for ${targetPath}: permission denied (EACCES)`
        );
      }

      if (nodeError.code === 'ENOENT') {
        throw new Error(
          `Backup creation failed for ${targetPath}: file not found (ENOENT)`
        );
      }
    }

    // Re-throw with context if not already enhanced
    if (error instanceof Error && !error.message.includes(targetPath)) {
      throw new Error(
        `Backup creation failed for ${targetPath}: ${error.message}`
      );
    }

    throw error;
  }
}

/**
 * Verify that a backup file exists and matches expected content hash
 * @param backupPath - Absolute path to backup file
 * @param expectedHash - Expected content hash
 * @throws Error if verification fails
 */
export async function verifyBackup(
  backupPath: string,
  expectedHash: string
): Promise<void> {
  try {
    // Read backup file
    const backupContent = await readFile(backupPath, 'utf8');

    // Generate hash of backup content
    const backupHash = generateContentHash(backupContent);

    // Compare hashes
    if (backupHash !== expectedHash) {
      throw new Error(
        `Backup verification failed: hash mismatch for ${backupPath} ` +
        `(expected ${expectedHash}, got ${backupHash})`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === 'ENOENT') {
        throw new Error(
          `Backup verification failed: cannot read ${backupPath} (file not found)`
        );
      }

      if (nodeError.code === 'EACCES') {
        throw new Error(
          `Backup verification failed: cannot read ${backupPath} (permission denied)`
        );
      }

      // Re-throw verification errors as-is
      if (error.message.includes('Backup verification failed')) {
        throw error;
      }
    }

    throw new Error(
      `Backup verification failed: cannot read ${backupPath}: ${error}`
    );
  }
}
