import type { ParsedSkill, ParsedCommand } from '../types/index.js';

export interface RelativeReference {
  type: 'link' | 'image' | 'include';
  sourceName: string;
  sourceType: 'skill' | 'command';
  path: string;
  text: string | undefined;
  line: number | undefined;
}

/**
 * Scan content for relative file references (./ and ../)
 * Returns array of found references with source attribution
 */
function scanContent(
  content: string,
  sourceName: string,
  sourceType: 'skill' | 'command'
): RelativeReference[] {
  const references: RelativeReference[] = [];

  // Pattern 1: Markdown links [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, text, path] = match;

    // Skip absolute paths and URLs
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      continue;
    }

    // Only include relative paths
    if (path.startsWith('./') || path.startsWith('../')) {
      const line = content.substring(0, match.index).split('\n').length;
      references.push({
        type: 'link',
        sourceName,
        sourceType,
        path,
        text,
        line,
      });
    }
  }

  // Pattern 2: Markdown images ![alt](path)
  const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g;

  while ((match = imageRegex.exec(content)) !== null) {
    const [fullMatch, alt, path] = match;

    // Skip absolute paths and URLs
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      continue;
    }

    // Only include relative paths
    if (path.startsWith('./') || path.startsWith('../')) {
      const line = content.substring(0, match.index).split('\n').length;
      references.push({
        type: 'image',
        sourceName,
        sourceType,
        path,
        text: alt || undefined,
        line,
      });
    }
  }

  // Pattern 3: @ includes @path
  const includeRegex = /@([^\s]+)/g;

  while ((match = includeRegex.exec(content)) !== null) {
    const [fullMatch, path] = match;

    // Skip absolute paths and URLs
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      continue;
    }

    // Only include relative paths
    if (path.startsWith('./') || path.startsWith('../')) {
      const line = content.substring(0, match.index).split('\n').length;
      references.push({
        type: 'include',
        sourceName,
        sourceType,
        path,
        text: undefined,
        line,
      });
    }
  }

  return references;
}

/**
 * Scan all skills and commands for relative file references
 * Returns aggregated array of all found references
 */
export function scanForRelativeReferences(
  skills: ParsedSkill[],
  commands: ParsedCommand[]
): RelativeReference[] {
  const allReferences: RelativeReference[] = [];

  // Scan all skills
  for (const skill of skills) {
    const refs = scanContent(skill.content, skill.metadata.name, 'skill');
    allReferences.push(...refs);
  }

  // Scan all commands
  for (const command of commands) {
    const refs = scanContent(command.content, command.name, 'command');
    allReferences.push(...refs);
  }

  return allReferences;
}
