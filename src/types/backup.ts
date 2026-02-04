/**
 * Information about a discovered backup file
 */
export interface BackupInfo {
  /** Original filename (e.g., "CLAUDE.md") */
  filename: string;
  /** Absolute path to the backup file */
  path: string;
  /** Backup creation timestamp */
  timestamp: Date;
  /** Content hash identifier */
  hash: string;
  /** File size in bytes */
  size: number;
}

/**
 * Options for safe write operation
 */
export interface SafeWriteOptions {
  /** Directory where backups are stored */
  backupDir: string;
  /** Whether to validate markdown structure after write (default: true) */
  validate?: boolean;
}

/**
 * Result of a safe write operation
 */
export interface SafeWriteResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Path to the target file that was written */
  targetPath: string;
  /** Path to the backup that was created */
  backupPath: string;
  /** Whether the write was rolled back due to validation failure */
  rolledBack: boolean;
}
