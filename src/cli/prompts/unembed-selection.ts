import { groupMultiselect, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import type { EmbeddedItem } from '../../types/index.js';

export async function selectItemsToRemove(
  items: EmbeddedItem[]
): Promise<EmbeddedItem[] | null> {
  // Handle empty items array
  if (items.length === 0) {
    return [];
  }

  // Group items by section type
  const skillItems = items.filter((i) => i.type === 'SKILLS');
  const commandItems = items.filter((i) => i.type === 'COMMANDS');

  // Build options object for groupMultiselect
  // Only include groups that have items
  const options: Record<
    string,
    Array<{ value: EmbeddedItem; label: string }>
  > = {};

  if (skillItems.length > 0) {
    options['SKILLS'] = skillItems.map((item) => ({
      value: item,
      label: item.location
        ? `${item.location === 'global' ? pc.blue('(global)') : pc.green('(project)')} ${item.name}`
        : item.name,
    }));
  }

  if (commandItems.length > 0) {
    options['COMMANDS'] = commandItems.map((item) => ({
      value: item,
      label: item.name,
    }));
  }

  const result = await groupMultiselect({
    message: 'Select items to REMOVE:',
    options,
    required: false,
  });

  if (isCancel(result)) {
    return null;
  }

  return result as EmbeddedItem[];
}
