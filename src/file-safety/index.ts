// Atomic file write operations
export { atomicWrite } from './atomic-writer.js';

// Markdown structure validation
export { validateMarkdownStructure, type ValidationResult } from './markdown-validator.js';

// Hash generation utilities
export { generateContentHash, generateBackupFilename } from './hash-generator.js';

// Backup management
export { createBackup, verifyBackup } from './backup-manager.js';
export type { BackupResult } from './backup-manager.js';

// Retention policy
export { cleanupOldBackups } from './retention-policy.js';
export type { CleanupResult } from './retention-policy.js';

// Safe write orchestrator
export { safeWrite } from './safe-writer.js';
export type { SafeWriteOptions, SafeWriteResult } from '../types/backup.js';

// Restore management
export { discoverBackups, restoreFromBackup } from './restore-manager.js';
export type { BackupInfo } from '../types/backup.js';
