import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { intro, outro, log, confirm, select, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { splitContent } from '../../embedding/index.js';
import { parseEmbeddedItems } from '../../embedding/index.js';
import { mergeEmbeddedContent } from '../../embedding/index.js';
import { selectItemsToRemove } from '../prompts/index.js';
import { withSpinner, ActionableError } from '../output/index.js';
import type { EmbeddedItem } from '../../types/index.js';
import type { ParsedSkill, ParsedCommand } from '../../types/index.js';

export interface UnembedOptions {
  dryRun?: boolean;
  force?: boolean;
  cwd?: string;
}

/**
 * Convert EmbeddedItem back to ParsedSkill format for mergeEmbeddedContent
 */
function convertToSkill(item: EmbeddedItem): ParsedSkill {
  return {
    path: '',  // Not needed for merge
    location: item.location || 'global',
    metadata: { name: item.name, description: '' },
    content: item.content,
    referencedFiles: []
  };
}

/**
 * Convert EmbeddedItem back to ParsedCommand format for mergeEmbeddedContent
 */
function convertToCommand(item: EmbeddedItem): ParsedCommand {
  return {
    path: '',  // Not needed for merge
    name: item.name,
    content: item.content
  };
}

/**
 * Run the unembed command - interactive wizard for removing embedded content
 */
export async function runUnembed(options: UnembedOptions = {}): Promise<void> {
  try {
    intro(pc.bgCyan(pc.black(' agent-compiler ')));

    // Step 1: Check for files with embedded content
    const claudePath = resolve(options.cwd || process.cwd(), 'CLAUDE.md');
    const agentsPath = resolve(options.cwd || process.cwd(), 'AGENTS.md');

    const candidates: Array<{ path: string; hasSkills: boolean; hasCommands: boolean }> = [];

    for (const filePath of [claudePath, agentsPath]) {
      if (existsSync(filePath)) {
        const content = await readFile(filePath, 'utf8');
        const split = splitContent(content);
        if (split.hasEmbeddedSections) {
          candidates.push({
            path: filePath,
            hasSkills: split.embeddedSections.has('SKILLS'),
            hasCommands: split.embeddedSections.has('COMMANDS')
          });
        }
      }
    }

    if (candidates.length === 0) {
      log.warn('No files with embedded content found');
      outro(pc.yellow('Nothing to unembed'));
      return;
    }

    // Step 2: Select target file
    let targetPath: string;
    if (candidates.length === 1) {
      targetPath = candidates[0].path;
      log.info(`Target: ${targetPath}`);
    } else {
      // Use select prompt for multiple files
      const result = await select({
        message: 'Select file to modify:',
        options: candidates.map(c => ({
          value: c.path,
          label: c.path.split('/').pop() || c.path,
          hint: `${c.hasSkills ? 'SKILLS' : ''}${c.hasSkills && c.hasCommands ? ', ' : ''}${c.hasCommands ? 'COMMANDS' : ''}`
        }))
      });

      if (isCancel(result)) {
        outro(pc.yellow('Cancelled'));
        return;
      }
      targetPath = result as string;
    }

    // Step 3: Read file and parse embedded sections
    const fileContent = await readFile(targetPath, 'utf8');
    const split = splitContent(fileContent);

    // Step 4: Parse individual items from BOTH sections
    const allItems: EmbeddedItem[] = [];

    if (split.embeddedSections.has('SKILLS')) {
      const skillsContent = split.embeddedSections.get('SKILLS')!;
      const skillItems = parseEmbeddedItems('SKILLS', skillsContent);
      allItems.push(...skillItems);
    }

    if (split.embeddedSections.has('COMMANDS')) {
      const commandsContent = split.embeddedSections.get('COMMANDS')!;
      const commandItems = parseEmbeddedItems('COMMANDS', commandsContent);
      allItems.push(...commandItems);
    }

    // Step 5: Check if any embedded items exist
    if (allItems.length === 0) {
      log.warn('No embedded items found');
      outro(pc.yellow('Nothing to unembed'));
      return;
    }

    // Step 6: Prompt user to select items to remove
    const selectedItems = await selectItemsToRemove(allItems);
    if (selectedItems === null) {
      outro(pc.yellow('Cancelled'));
      return;
    }

    // Step 7: Check if any items selected
    if (selectedItems.length === 0) {
      log.warn('No items selected');
      outro(pc.yellow('Nothing to unembed'));
      return;
    }

    // Step 8: Show preview of items to be removed
    log.warn(pc.yellow('The following will be REMOVED:'));
    log.info('');

    // Preview skills
    const skillsToRemove = selectedItems.filter(i => i.type === 'SKILLS');
    if (skillsToRemove.length > 0) {
      log.info(pc.bold('  Skills:'));
      for (const item of skillsToRemove) {
        const locationTag = item.location ? pc.dim(`(${item.location})`) : '';
        log.info(`    ${pc.red('x')} ${item.name} ${locationTag}`);
      }
    }

    // Preview commands
    const commandsToRemove = selectedItems.filter(i => i.type === 'COMMANDS');
    if (commandsToRemove.length > 0) {
      log.info(pc.bold('  Commands:'));
      for (const item of commandsToRemove) {
        log.info(`    ${pc.red('x')} ${item.name}`);
      }
    }
    log.info('');

    // Step 9: DRY-RUN MODE - exit after preview
    if (options.dryRun) {
      outro(pc.yellow('Dry run complete - no changes made'));
      return;
    }

    // Step 10: FORCE MODE - skip confirmation, otherwise prompt
    if (!options.force) {
      const shouldContinue = await confirm({
        message: 'Remove these items?',
      });
      if (isCancel(shouldContinue) || !shouldContinue) {
        outro(pc.yellow('Cancelled'));
        return;
      }
    }

    // Step 11: Filter remaining items (items NOT selected for removal)
    const selectedNames = new Set(selectedItems.map(i => `${i.type}:${i.name}`));
    const remainingItems = allItems.filter(
      item => !selectedNames.has(`${item.type}:${item.name}`)
    );

    // Step 12: Convert remaining items back to ParsedSkill/ParsedCommand format
    const remainingSkills = remainingItems
      .filter(i => i.type === 'SKILLS')
      .map(convertToSkill);

    const remainingCommands = remainingItems
      .filter(i => i.type === 'COMMANDS')
      .map(convertToCommand);

    // Step 13: Call mergeEmbeddedContent with remaining items
    // Empty arrays will result in section headings being removed
    const mergeResult = await withSpinner(
      'Creating backup and removing items...',
      async () => {
        return await mergeEmbeddedContent({
          targetPath,
          skills: remainingSkills,
          commands: remainingCommands,
          backupDir: '.agent-compiler-backups'
        });
      }
    );

    // Step 14: Show success message with backup path
    if (mergeResult.backupPath) {
      log.success(`Backup created: ${mergeResult.backupPath}`);
    }
    outro(pc.green(`Removed ${selectedItems.length} item(s)`));

  } catch (error) {
    // Handle errors gracefully
    if (error instanceof ActionableError) {
      console.error(error.format());
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(`Error: ${message}`));
    }
    process.exitCode = 1;
  }
}
