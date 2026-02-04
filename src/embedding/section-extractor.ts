import type { SectionBoundary, SplitContent } from '../types/embedding.js';
import { generateContentHash } from '../file-safety/hash-generator.js';

/**
 * Detect boundaries for a specific section (SKILLS or COMMANDS)
 * Returns null if section not found
 *
 * Section detection rules:
 * - Section starts: Line matching ^##\s+(SKILLS|COMMANDS) (case-insensitive)
 * - Section ends: Next line matching ^##\s+ (same depth heading) OR EOF
 * - Only matches depth 2 headings (##), not subsections (###)
 */
export function detectSectionBoundary(
  content: string,
  sectionName: 'SKILLS' | 'COMMANDS'
): SectionBoundary | null {
  const lines = content.split('\n');

  // Regex: ^##\s+{SECTIONNAME}\s*$ (case-insensitive)
  const sectionHeadingPattern = new RegExp(
    `^##\\s+${sectionName}\\s*$`,
    'i'
  );

  // Find section start
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (sectionHeadingPattern.test(lines[i])) {
      startLine = i;
      break;
    }
  }

  if (startLine === -1) {
    return null; // Section not found
  }

  // Find section end (next ## heading at same depth, or EOF)
  let endLine = lines.length;
  const sameLevelHeadingPattern = /^##\s+/; // Any ## heading

  for (let i = startLine + 1; i < lines.length; i++) {
    if (sameLevelHeadingPattern.test(lines[i])) {
      endLine = i;
      break;
    }
  }

  // Extract section content (including heading line)
  const sectionLines = lines.slice(startLine, endLine);

  return {
    sectionName,
    startLine,
    endLine,
    content: sectionLines.join('\n'),
  };
}

/**
 * Extract user content by removing embedded section ranges
 * Preserves user content exactly (no normalization except final trim)
 */
export function extractUserContent(
  content: string,
  embeddedRanges: Array<{ start: number; end: number }>
): string {
  const lines = content.split('\n');
  const userLines: string[] = [];

  // Sort ranges by start line
  const sortedRanges = [...embeddedRanges].sort((a, b) => a.start - b.start);

  let currentLine = 0;

  for (const range of sortedRanges) {
    // Add user lines before this embedded section
    userLines.push(...lines.slice(currentLine, range.start));
    currentLine = range.end;
  }

  // Add remaining user lines after last embedded section
  userLines.push(...lines.slice(currentLine));

  return userLines.join('\n').trim();
}

/**
 * Split content into user content and embedded sections
 * Detects both SKILLS and COMMANDS sections, extracts user content,
 * and generates hash for validation
 */
export function splitContent(content: string): SplitContent {
  // Handle empty content
  if (!content || content.trim() === '') {
    return {
      userContent: '',
      userContentHash: generateContentHash(''),
      embeddedSections: new Map(),
      hasEmbeddedSections: false,
    };
  }

  // Detect embedded sections
  const skillsSection = detectSectionBoundary(content, 'SKILLS');
  const commandsSection = detectSectionBoundary(content, 'COMMANDS');

  const embeddedSections = new Map<'SKILLS' | 'COMMANDS', string>();
  const embeddedRanges: Array<{ start: number; end: number }> = [];

  // Track SKILLS section
  if (skillsSection) {
    embeddedRanges.push({
      start: skillsSection.startLine,
      end: skillsSection.endLine,
    });
    embeddedSections.set('SKILLS', skillsSection.content);
  }

  // Track COMMANDS section
  if (commandsSection) {
    embeddedRanges.push({
      start: commandsSection.startLine,
      end: commandsSection.endLine,
    });
    embeddedSections.set('COMMANDS', commandsSection.content);
  }

  // Extract user content (everything except embedded sections)
  const userContent = extractUserContent(content, embeddedRanges);

  // Generate hash for validation
  const userContentHash = generateContentHash(userContent);

  return {
    userContent,
    userContentHash,
    embeddedSections,
    hasEmbeddedSections: embeddedSections.size > 0,
  };
}
