import { basename } from 'path';

export interface ParsedCommandContent {
  name: string;
  content: string;
}

/**
 * Parse a command markdown file.
 * Commands are simpler than skills - just markdown content, no frontmatter.
 * Name is derived from filename (without .md extension).
 */
export function parseCommandFile(filepath: string, fileContent: string): ParsedCommandContent {
  // Derive command name from filename: /path/to/my-command.md -> my-command
  const filename = basename(filepath, '.md');

  return {
    name: filename,
    content: fileContent.trim()
  };
}
