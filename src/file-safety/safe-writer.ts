import { readFile } from 'fs/promises';
import { createBackup } from './backup-manager.js';
import { atomicWrite } from './atomic-writer.js';
import { validateMarkdownStructure } from './markdown-validator.js';
import { checkWritePermission } from './permissions.js';
import { ActionableError, createPermissionError } from '../cli/output/messages.js';
import type { SafeWriteOptions, SafeWriteResult } from '../types/backup.js';

/**
 * Safely write content to a file with backup, validation, and auto-rollback.
 *
 * This is the main API for file modifications - ensuring every write is protected
 * by backup, validated after completion, and automatically rolled back if validation fails.
 *
 * Flow:
 * 1. Create backup of current file (SAFETY-04: halt if backup fails)
 * 2. Perform atomic write to target file
 * 3. Validate written content (if options.validate is true, default)
 * 4. Auto-rollback from backup if validation fails
 *
 * @param targetPath - Absolute path to file to write
 * @param content - Content to write
 * @param options - SafeWriteOptions with backupDir and optional validate flag
 * @returns SafeWriteResult with success status, paths, and rollback indicator
 * @throws Error if backup creation fails (operation halts before any modification)
 * @throws Error if write fails (backup exists for manual recovery)
 * @throws Error if rollback fails after validation failure (critical error)
 */
export async function safeWrite(
  targetPath: string,
  content: string,
  options: SafeWriteOptions
): Promise<SafeWriteResult> {
  // Default validate to true if not specified
  const shouldValidate = options.validate !== false;

  // Step 0: Check write permissions before any operations
  const permCheck = await checkWritePermission(targetPath);
  if (!permCheck.canWrite) {
    const error = createPermissionError(targetPath);
    // Add the specific reason from permission check to context
    error.context.details = permCheck.reason || 'Unknown permission issue';
    throw error;
  }

  // Check backup directory permissions too
  const backupDirCheck = await checkWritePermission(options.backupDir + '/test');
  if (!backupDirCheck.canWrite) {
    throw new ActionableError(
      'Cannot create backups',
      {
        directory: options.backupDir,
        reason: backupDirCheck.reason || 'No write permission'
      },
      [
        'Check backup directory permissions',
        'Ensure directory exists and is writable',
        `Try: mkdir -p "${options.backupDir}"`
      ]
    );
  }

  // Step 1: Create backup before any modification
  // If this fails, we halt immediately (SAFETY-04)
  let backupPath: string;
  try {
    const backupResult = await createBackup(targetPath, options.backupDir);
    backupPath = backupResult.backupPath;
  } catch (error: any) {
    throw new Error(`Cannot proceed without backup: ${error.message}`);
  }

  // Step 2: Perform atomic write
  // If this fails, backup exists for manual recovery
  try {
    await atomicWrite(targetPath, content);
  } catch (error: any) {
    throw new Error(
      `Write failed. Backup available at: ${backupPath}\n` +
      `Reason: ${error.message}`
    );
  }

  // Step 3: Validate written content (if enabled)
  if (shouldValidate) {
    try {
      // Read the written file
      const writtenContent = await readFile(targetPath, 'utf8');

      // Validate markdown structure
      const validationResult = validateMarkdownStructure(writtenContent);

      if (!validationResult.valid) {
        // Step 4: Auto-rollback on validation failure
        console.error(
          `Validation failed, restoring from backup: ${validationResult.errors.join(', ')}`
        );

        try {
          // Read backup content
          const backupContent = await readFile(backupPath, 'utf8');

          // Restore original content using atomic write
          await atomicWrite(targetPath, backupContent);

          // Return failure result with rollback indicator
          return {
            success: false,
            targetPath,
            backupPath,
            rolledBack: true
          };
        } catch (restoreError: any) {
          // Critical error: validation failed AND restore failed
          throw new Error(
            `CRITICAL: Validation failed and restore failed.\n` +
            `Target file: ${targetPath}\n` +
            `Backup file: ${backupPath}\n` +
            `Restore error: ${restoreError.message}\n` +
            `Manual intervention required.`
          );
        }
      }
    } catch (error: any) {
      // If we can't read or validate, treat as validation failure
      if (!error.message.includes('CRITICAL')) {
        console.error(`Validation error, attempting rollback: ${error.message}`);

        try {
          const backupContent = await readFile(backupPath, 'utf8');
          await atomicWrite(targetPath, backupContent);

          return {
            success: false,
            targetPath,
            backupPath,
            rolledBack: true
          };
        } catch (restoreError: any) {
          throw new Error(
            `CRITICAL: Validation error and restore failed.\n` +
            `Target file: ${targetPath}\n` +
            `Backup file: ${backupPath}\n` +
            `Validation error: ${error.message}\n` +
            `Restore error: ${restoreError.message}\n` +
            `Manual intervention required.`
          );
        }
      }

      // Re-throw critical errors
      throw error;
    }
  }

  // Success: write completed and validation passed (or validation disabled)
  return {
    success: true,
    targetPath,
    backupPath,
    rolledBack: false
  };
}
