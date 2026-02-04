import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { atomicWrite } from './atomic-writer.js';
import { generateContentHash, generateBackupFilename } from './hash-generator.js';
import type { BackupInfo } from '../types/backup.js';

/**
 * Discover available backups for a target file
 *
 * @param backupDir - Directory where backups are stored
 * @param targetFilename - Original filename to find backups for (e.g., "CLAUDE.md")
 * @returns Array of BackupInfo sorted by timestamp descending (newest first)
 */
export async function discoverBackups(
  backupDir: string,
  targetFilename: string
): Promise<BackupInfo[]> {
  try {
    // Get base name without extension for matching
    const baseName = targetFilename.replace(/\.md$/i, '');

    // Read backup directory contents
    const files = await readdir(backupDir);

    // Filter to backups matching target file
    // Backup filename pattern: {baseName}_{timestamp}_{hash}.md
    const backupFiles = files.filter(file =>
      file.startsWith(baseName + '_') && file.endsWith('.md')
    );

    // Parse each backup file to extract metadata
    const backups: BackupInfo[] = [];

    for (const file of backupFiles) {
      try {
        // Parse filename to extract timestamp and hash
        // Format: {baseName}_{ISO8601}_{hash}.md
        // Example: CLAUDE_2026-02-03T12-30-45.123Z_a3b2c1d4e5f67890.md
        const withoutExtension = file.replace(/\.md$/i, '');
        const parts = withoutExtension.split('_');

        if (parts.length >= 3) {
          // Last part is hash, everything between baseName and hash is timestamp
          const hash = parts[parts.length - 1];
          const timestampParts = parts.slice(1, -1);
          const timestampStr = timestampParts.join('_');

          // Convert filesystem-safe timestamp back to ISO 8601
          const isoTimestamp = timestampStr.replace(/-/g, ':');
          const timestamp = new Date(isoTimestamp);

          // Get file size
          const backupPath = join(backupDir, file);
          const fileStats = await stat(backupPath);

          backups.push({
            filename: targetFilename,
            path: backupPath,
            timestamp,
            hash,
            size: fileStats.size
          });
        }
      } catch (error) {
        // Skip files that don't parse correctly
        console.warn(`Skipping invalid backup file: ${file}`);
      }
    }

    // Sort by timestamp descending (newest first)
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return backups;
  } catch (error: any) {
    // If backup directory doesn't exist, return empty array (not an error)
    if (error.code === 'ENOENT') {
      return [];
    }

    // Re-throw other errors
    throw new Error(
      `Failed to discover backups in ${backupDir}: ${error.message}`
    );
  }
}

/**
 * Restore a file from a backup
 *
 * Creates a backup of the current file before restoring (pre-restore backup)
 * to prevent accidental loss if user restores wrong version.
 *
 * @param backupPath - Absolute path to the backup file to restore from
 * @param targetPath - Absolute path to the file to restore to
 * @param backupDir - Directory where backups are stored (for pre-restore backup)
 * @throws Error if backup cannot be read or restore fails
 */
export async function restoreFromBackup(
  backupPath: string,
  targetPath: string,
  backupDir: string
): Promise<void> {
  try {
    // First: create backup of CURRENT file before restore
    // This prevents accidental loss if user restores wrong version
    try {
      const currentContent = await readFile(targetPath, 'utf8');
      const currentHash = generateContentHash(currentContent);
      const timestamp = new Date();

      // Use special prefix for pre-restore backups
      const targetBasename = basename(targetPath).replace(/\.md$/i, '');
      const preRestoreFilename = generateBackupFilename(
        `${targetBasename}_pre-restore`,
        timestamp,
        currentHash
      );
      const preRestorePath = join(backupDir, preRestoreFilename);

      await atomicWrite(preRestorePath, currentContent);
    } catch (error: any) {
      // If current file doesn't exist, that's okay (first-time restore)
      if (error.code !== 'ENOENT') {
        throw new Error(
          `Failed to create pre-restore backup: ${error.message}`
        );
      }
    }

    // Read backup content
    const backupContent = await readFile(backupPath, 'utf8');

    // Use atomic write to restore backup content to target
    await atomicWrite(targetPath, backupContent);
  } catch (error: any) {
    // Provide clear error message
    if (error.code === 'ENOENT') {
      throw new Error(
        `Cannot restore from ${backupPath}: backup file not found`
      );
    }

    if (error.code === 'EACCES') {
      throw new Error(
        `Cannot restore from ${backupPath}: permission denied`
      );
    }

    // Re-throw with context if not already enhanced
    if (error.message.includes('Failed to') || error.message.includes('Cannot restore')) {
      throw error;
    }

    throw new Error(
      `Restore from ${backupPath} failed: ${error.message}`
    );
  }
}
