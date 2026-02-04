import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

export interface CleanupResult {
  deletedCount: number;
  deletedFiles: string[];
  keptCount: number;
}

/**
 * Clean up old backup files based on retention period
 * @param backupDir - Absolute path to backup directory
 * @param retentionDays - Number of days to keep backups (default: 30)
 * @returns CleanupResult with counts and deleted filenames
 */
export async function cleanupOldBackups(
  backupDir: string,
  retentionDays: number = 30
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedCount: 0,
    deletedFiles: [],
    keptCount: 0,
  };

  try {
    // Read backup directory
    const files = await readdir(backupDir);

    // Calculate cutoff time
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    // Process each .md file
    for (const filename of files) {
      // Only process .md files
      if (!filename.endsWith('.md')) {
        continue;
      }

      const filePath = join(backupDir, filename);

      try {
        // Check file modification time
        const fileStats = await stat(filePath);
        const fileTime = fileStats.mtimeMs;

        if (fileTime < cutoffTime) {
          // File is older than retention period, delete it
          try {
            await unlink(filePath);
            result.deletedCount++;
            result.deletedFiles.push(filename);
          } catch (deleteError) {
            // Warn but continue processing other files
            console.warn(
              `Warning: Failed to delete ${filename}: ${deleteError}`
            );
          }
        } else {
          // File is within retention period, keep it
          result.keptCount++;
        }
      } catch (statError) {
        // Warn but continue if we can't stat a file
        console.warn(`Warning: Failed to stat ${filename}: ${statError}`);
      }
    }

    return result;
  } catch (error) {
    // Handle missing directory gracefully
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        // Directory doesn't exist, return zeros without throwing
        return result;
      }
    }

    // Re-throw other errors
    throw error;
  }
}
