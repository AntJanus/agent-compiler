/**
 * Boundary information for a detected section
 */
export interface SectionBoundary {
  /** Section type (SKILLS or COMMANDS) */
  sectionName: 'SKILLS' | 'COMMANDS';
  /** Line number where section starts (0-indexed) */
  startLine: number;
  /** Line number where section ends (exclusive, 0-indexed) */
  endLine: number;
  /** Raw content of the section including heading */
  content: string;
}

/**
 * Result of splitting content into user and embedded portions
 */
export interface SplitContent {
  /** User content with embedded sections removed */
  userContent: string;
  /** Hash of user content for validation */
  userContentHash: string;
  /** Detected embedded sections */
  embeddedSections: Map<'SKILLS' | 'COMMANDS', string>;
  /** Whether any embedded sections were found */
  hasEmbeddedSections: boolean;
}

/**
 * Represents a single embedded section to be generated
 */
export interface EmbeddedSection {
  type: 'SKILLS' | 'COMMANDS';
  content: string;
}
