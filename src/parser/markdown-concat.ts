import { readFile } from 'fs/promises';
import { dirname, join, extname } from 'path';

/**
 * Extract relative markdown file references from content.
 * Looks for markdown links: [text](file.md)
 * Skips URLs (http/https), anchors (#), and non-.md files.
 * Preserves document order.
 */
export function extractMarkdownReferences(content: string): string[] {
  // Regex: [text](url) - captures link target
  const linkRegex = /\[([^\[\]]+)\]\(([^)]+)\)/g;
  const references: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkTarget = match[2];

    // Only include relative .md file references
    if (!linkTarget.startsWith('http://') &&
        !linkTarget.startsWith('https://') &&
        !linkTarget.startsWith('#') &&
        extname(linkTarget) === '.md') {
      // Avoid duplicates while preserving order
      if (!references.includes(linkTarget)) {
        references.push(linkTarget);
      }
    }
  }

  return references;
}

/**
 * Concatenate referenced markdown files with the main content.
 * Files are concatenated in the order they appear in references.
 * Adds separator (---) between files for clarity.
 * Fails with clear error if referenced file doesn't exist.
 */
export async function concatenateFiles(
  mainPath: string,
  mainContent: string,
  references: string[]
): Promise<string> {
  if (references.length === 0) {
    return mainContent;
  }

  const baseDir = dirname(mainPath);
  let concatenated = mainContent;

  for (const ref of references) {
    const refPath = join(baseDir, ref);

    try {
      const refContent = await readFile(refPath, 'utf-8');
      concatenated += '\n\n---\n\n' + refContent;
    } catch (error) {
      // Fail fast with clear error if referenced file doesn't exist
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new Error(
          `Referenced file not found: ${ref}\n` +
          `Referenced in: ${mainPath}\n` +
          `Expected at: ${refPath}`
        );
      }
      throw error;
    }
  }

  return concatenated;
}
