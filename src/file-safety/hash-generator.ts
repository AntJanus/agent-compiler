import crypto from 'crypto';

/**
 * Generate a SHA-256 hash from content string
 * Returns first 16 characters of hex digest for unique identification
 */
export function generateContentHash(content: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(content, 'utf8');
  const digest = hash.digest('hex');
  return digest.substring(0, 16);
}

/**
 * Generate backup filename with timestamp and content hash
 * Format: {baseName}_{timestamp}_{hash}.md
 * Example: CLAUDE_2026-02-03T12-30-45.123Z_a3b2c1d4e5f67890.md
 */
export function generateBackupFilename(
  originalName: string,
  timestamp: Date,
  hash: string
): string {
  // Remove .md extension from original name if present
  const baseName = originalName.replace(/\.md$/i, '');

  // Format timestamp as ISO 8601 with colons replaced by hyphens for filesystem safety
  const timestampStr = timestamp.toISOString().replace(/:/g, '-');

  // Construct filename
  return `${baseName}_${timestampStr}_${hash}.md`;
}
