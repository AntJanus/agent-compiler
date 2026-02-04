// Section extraction
export { splitContent, detectSectionBoundary, extractUserContent } from './section-extractor.js';

// Section generation
export { generateSkillsSection, generateCommandsSection } from './section-generator.js';

// Template generation
export { generateTemplate, TEMPLATE_HEADER_COMMENT } from './template-generator.js';

// Main merge API
export { mergeEmbeddedContent } from './content-merger.js';

// Re-export types
export type { SectionBoundary, SplitContent, EmbeddedSection } from '../types/embedding.js';
export type { MergeOptions, MergeResult } from './content-merger.js';
