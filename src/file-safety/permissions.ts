import { access, constants } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Result of permission check
 */
export interface PermissionCheckResult {
  canWrite?: boolean;
  canRead?: boolean;
  reason?: string;
}

/**
 * Checks if a file path has write permission
 * For existing files, checks the file itself
 * For non-existent files, checks parent directory
 * @param filePath Path to check
 * @returns Object with canWrite boolean and optional reason string
 */
export async function checkWritePermission(filePath: string): Promise<PermissionCheckResult> {
  try {
    // Try to check the file itself first
    await access(filePath, constants.W_OK);
    return { canWrite: true };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - check parent directory
      const dir = dirname(filePath);
      try {
        await access(dir, constants.W_OK);
        return { canWrite: true };
      } catch (dirError: any) {
        if (dirError.code === 'ENOENT') {
          return { canWrite: false, reason: `Directory does not exist: ${dir}` };
        }
        if (dirError.code === 'EACCES') {
          return { canWrite: false, reason: `No write permission for directory: ${dir}` };
        }
        return { canWrite: false, reason: dirError.message };
      }
    }
    if (error.code === 'EACCES') {
      return { canWrite: false, reason: `No write permission for file: ${filePath}` };
    }
    return { canWrite: false, reason: error.message };
  }
}

/**
 * Checks if a file path has read permission
 * @param filePath Path to check
 * @returns Object with canRead boolean and optional reason string
 */
export async function checkReadPermission(filePath: string): Promise<PermissionCheckResult> {
  try {
    await access(filePath, constants.R_OK);
    return { canRead: true };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { canRead: false, reason: `File does not exist: ${filePath}` };
    }
    if (error.code === 'EACCES') {
      return { canRead: false, reason: `No read permission for file: ${filePath}` };
    }
    return { canRead: false, reason: error.message };
  }
}
