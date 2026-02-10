import type { EmbeddedItem } from '../types/embedded-item.js';

/**
 * Parse individual embedded items from a section's content.
 * Extracts ### headings and their associated content.
 *
 * @param type - Section type (SKILLS or COMMANDS)
 * @param sectionContent - Full section content including ## heading
 * @returns Array of embedded items found in the section
 */
export function parseEmbeddedItems(
  type: 'SKILLS' | 'COMMANDS',
  sectionContent: string
): EmbeddedItem[] {
  const lines = sectionContent.split('\n');
  const items: EmbeddedItem[] = [];

  // Pattern for item headings: ### item-name or ### item-name (location)
  const itemHeadingPattern = /^###\s+(.+)$/;

  // Pattern for extracting location from skill headings: "name (global)" or "name (project)"
  const locationPattern = /^(.+?)\s+\((\w+)\)$/;

  let currentItem: Partial<EmbeddedItem> | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    // Skip the section heading itself (## SKILLS or ## COMMANDS)
    if (/^##\s+(SKILLS|COMMANDS)\s*$/i.test(line)) {
      continue;
    }

    const headingMatch = line.match(itemHeadingPattern);

    if (headingMatch) {
      // Save previous item if exists
      if (currentItem) {
        currentItem.content = contentLines.join('\n').trim();
        items.push(currentItem as EmbeddedItem);
      }

      // Start new item
      const headingText = headingMatch[1].trim();
      currentItem = { type };
      contentLines = [];

      // Extract location for SKILLS section
      if (type === 'SKILLS') {
        const locationMatch = headingText.match(locationPattern);
        if (locationMatch) {
          currentItem.name = locationMatch[1].trim();
          const locationValue = locationMatch[2].toLowerCase();
          if (locationValue === 'global' || locationValue === 'project') {
            currentItem.location = locationValue;
          }
        } else {
          currentItem.name = headingText;
        }
      } else {
        // COMMANDS section - no location
        currentItem.name = headingText;
      }
    } else if (currentItem) {
      // Accumulate content lines for current item
      contentLines.push(line);
    }
  }

  // Save last item if exists
  if (currentItem) {
    currentItem.content = contentLines.join('\n').trim();
    items.push(currentItem as EmbeddedItem);
  }

  return items;
}
