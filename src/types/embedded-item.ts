/**
 * Represents a single embedded item (skill or command) parsed from an embedded section
 */
export interface EmbeddedItem {
  /** Section type this item belongs to */
  type: 'SKILLS' | 'COMMANDS';
  /** Item name (from ### heading) */
  name: string;
  /** For skills: global or project. For commands: undefined */
  location?: 'global' | 'project';
  /** Item content (everything after ### heading until next ### or section end) */
  content: string;
}
