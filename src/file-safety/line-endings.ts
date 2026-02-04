import { readFile } from 'node:fs/promises';

/**
 * Line ending types
 */
export type LineEnding = 'LF' | 'CRLF';

/**
 * Detects the line ending style used in a file
 * @param filePath Path to file to check
 * @returns 'CRLF' if file contains Windows line endings, 'LF' otherwise (default for Unix)
 */
export async function detectLineEnding(filePath: string): Promise<LineEnding> {
  try {
    const content = await readFile(filePath, 'utf8');
    // Check for CRLF first (more specific)
    return content.includes('\r\n') ? 'CRLF' : 'LF';
  } catch {
    // Default to LF for new files on Unix
    return 'LF';
  }
}

/**
 * Detects line ending from content string
 * @param content String content to check
 * @returns 'CRLF' if content contains Windows line endings, 'LF' otherwise
 */
export function detectFromContent(content: string): LineEnding {
  return content.includes('\r\n') ? 'CRLF' : 'LF';
}

/**
 * Normalizes content to specified line ending style
 * @param content Content to normalize
 * @param ending Target line ending style
 * @returns Content with normalized line endings
 */
export function normalizeLineEnding(content: string, ending: LineEnding): string {
  // Normalize to LF first (handles mixed line endings)
  const normalized = content.replace(/\r\n/g, '\n');
  // Convert to target
  return ending === 'CRLF'
    ? normalized.replace(/\n/g, '\r\n')
    : normalized;
}
