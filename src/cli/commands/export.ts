import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { intro, outro, log, confirm, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { discoverAll } from '../../discovery/index.js';
import { parseSkillFile, parseCommandFile } from '../../parser/index.js';
import { generateExportContent } from '../../embedding/index.js';
import { selectContentTypes, selectSkills, selectCommands } from '../prompts/index.js';
import { withSpinner, ActionableError } from '../output/index.js';
import { safeWrite } from '../../file-safety/safe-writer.js';
import { scanForRelativeReferences } from '../../utils/reference-detector.js';
import type { ParsedSkill, ParsedCommand } from '../../types/index.js';

export interface ExportOptions {
  output?: string;
  dryRun?: boolean;
  force?: boolean;
  cwd?: string;
}

/**
 * Run the export command - interactive wizard for exporting skills/commands to a separate file
 */
export async function runExport(options: ExportOptions = {}): Promise<void> {
  try {
    intro(pc.bgCyan(pc.black(' agent-compiler ')));

    // Step 1: Discover skills and commands
    const discovery = await withSpinner('Discovering skills and commands...', async () => {
      const result = await discoverAll({ cwd: options.cwd });
      return result;
    });

    // Check if anything was found
    if (discovery.skills.length === 0 && discovery.commands.length === 0) {
      log.warn('No skills or commands found');
      outro(pc.yellow('Nothing to export'));
      return;
    }

    // Step 2: Parse discovered skills
    const parsedSkills: ParsedSkill[] = [];
    if (discovery.skills.length > 0) {
      await withSpinner('Parsing skills...', async () => {
        for (const skillFile of discovery.skills) {
          try {
            // Read file content first
            const fileContent = await readFile(skillFile.path, 'utf8');
            // parseSkillFile returns {metadata, content, warnings}
            const parseResult = parseSkillFile(skillFile.path, fileContent);

            // Log warnings if any
            for (const warning of parseResult.warnings) {
              log.warn(warning);
            }

            // Convert to ParsedSkill structure
            parsedSkills.push({
              path: skillFile.path,
              location: skillFile.location,
              metadata: parseResult.metadata,
              content: parseResult.content,
              referencedFiles: []  // TODO: extract references if needed
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log.error(`Failed to parse ${skillFile.path}: ${message}`);
            // Continue parsing other skills
          }
        }
      });
    }

    // Step 3: Parse discovered commands
    const parsedCommands: ParsedCommand[] = [];
    if (discovery.commands.length > 0) {
      await withSpinner('Parsing commands...', async () => {
        for (const commandFile of discovery.commands) {
          try {
            // Read file content first
            const fileContent = await readFile(commandFile.path, 'utf8');
            // parseCommandFile returns {name, content}
            const parseResult = parseCommandFile(commandFile.path, fileContent);

            // Convert to ParsedCommand structure
            parsedCommands.push({
              path: commandFile.path,
              name: parseResult.name,
              content: parseResult.content
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log.error(`Failed to parse ${commandFile.path}: ${message}`);
            // Continue parsing other commands
          }
        }
      });
    }

    // Check if we have any successfully parsed content
    if (parsedSkills.length === 0 && parsedCommands.length === 0) {
      log.error('Failed to parse any skills or commands');
      outro(pc.red('Export failed'));
      process.exitCode = 1;
      return;
    }

    // Step 4: Prompt for content types
    const contentTypes = await selectContentTypes();
    if (!contentTypes) {
      outro(pc.yellow('Cancelled'));
      return;
    }

    // Step 5: Prompt for skill selection if needed
    let selectedSkills: ParsedSkill[] = [];
    if (contentTypes.includes('skills') && parsedSkills.length > 0) {
      const skillSelection = await selectSkills(parsedSkills);
      if (!skillSelection) {
        outro(pc.yellow('Cancelled'));
        return;
      }
      selectedSkills = skillSelection;
    }

    // Step 6: Prompt for command selection if needed
    let selectedCommands: ParsedCommand[] = [];
    if (contentTypes.includes('commands') && parsedCommands.length > 0) {
      const commandSelection = await selectCommands(parsedCommands);
      if (!commandSelection) {
        outro(pc.yellow('Cancelled'));
        return;
      }
      selectedCommands = commandSelection;
    }

    // Check if anything was selected
    if (selectedSkills.length === 0 && selectedCommands.length === 0) {
      log.warn('No skills or commands selected');
      outro(pc.yellow('Nothing to export'));
      return;
    }

    // Step 7: Determine output path
    const outputPath = options.output
      ? resolve(options.cwd || process.cwd(), options.output)
      : resolve(options.cwd || process.cwd(), 'COMPILED_SKILLS.md');

    // Step 8: Check existing file (unless --force or --dry-run)
    if (existsSync(outputPath) && !options.force && !options.dryRun) {
      const shouldOverwrite = await confirm({
        message: `${outputPath} already exists. Overwrite?`,
      });
      if (isCancel(shouldOverwrite) || !shouldOverwrite) {
        outro(pc.yellow('Cancelled'));
        return;
      }
    }

    // Step 9: Scan for relative references
    const relativeRefs = scanForRelativeReferences(selectedSkills, selectedCommands);

    // Step 10: Handle dry-run mode
    if (options.dryRun) {
      log.info(pc.yellow('Dry run mode - no files will be written'));
      log.info('');
      log.info(`Output: ${outputPath}`);
      log.info(`Skills: ${selectedSkills.length}`);
      log.info(`Commands: ${selectedCommands.length}`);
      log.info('');

      // Show what would be exported
      if (selectedSkills.length > 0) {
        log.info(pc.bold('Skills:'));
        for (const skill of selectedSkills) {
          const locationColor = skill.location === 'global' ? pc.blue : pc.green;
          log.info(`  ${locationColor('●')} ${skill.metadata.name} (${skill.location})`);
        }
      }

      if (selectedCommands.length > 0) {
        log.info('');
        log.info(pc.bold('Commands:'));
        for (const command of selectedCommands) {
          log.info(`  ● ${command.name}`);
        }
      }

      // Show include reference
      const projectRoot = options.cwd || process.cwd();
      const relativePath = relative(projectRoot, outputPath);
      log.info('');
      log.info(pc.bold('Add this to your CLAUDE.md:'));
      log.info('');
      log.info(`  ${pc.cyan('@' + relativePath)}`);

      // Show relative reference warnings if any
      if (relativeRefs.length > 0) {
        log.info('');
        log.warn(pc.yellow(`Found ${relativeRefs.length} relative file reference${relativeRefs.length === 1 ? '' : 's'} that may not resolve correctly when exported:`));
        for (const ref of relativeRefs) {
          const typeLabel = ref.type === 'link' ? 'Link' : ref.type === 'image' ? 'Image' : 'Include';
          log.info(`  ${pc.dim(typeLabel + ':')} ${ref.path} ${pc.dim('in')} ${ref.sourceName} ${pc.dim('(' + ref.sourceType + ')')}`);
        }
        log.info('');
        log.info(pc.dim('These paths were relative to the original skill/command location.'));
        log.info(pc.dim('Consider using absolute paths if they do not resolve from the export location.'));
      }

      outro(pc.yellow('Dry run complete - no changes made'));
      return;
    }

    // Step 11: Generate content
    const content = generateExportContent(selectedSkills, selectedCommands);

    // Step 12: Write with safeWrite
    const result = await withSpinner('Exporting to file...', async () => {
      return await safeWrite(outputPath, content, {
        backupDir: '.agent-compiler-backups',
        validate: true
      });
    });

    // Step 13: Display success summary
    log.info('');
    if (result.success) {
      log.success(`Exported ${selectedSkills.length} skill${selectedSkills.length === 1 ? '' : 's'} and ${selectedCommands.length} command${selectedCommands.length === 1 ? '' : 's'}`);
      if (result.backupPath) {
        log.info(pc.dim(`Backup created: ${result.backupPath}`));
      }

      // Display @ include reference
      const projectRoot = options.cwd || process.cwd();
      const relativePath = relative(projectRoot, outputPath);
      log.info('');
      log.info(pc.bold('Add this to your CLAUDE.md:'));
      log.info('');
      log.info(`  ${pc.cyan('@' + relativePath)}`);
      log.info('');
      log.info(pc.dim('This will include the exported content when Claude reads your CLAUDE.md.'));

      // Display relative reference warnings if any
      if (relativeRefs.length > 0) {
        log.info('');
        log.warn(pc.yellow(`Found ${relativeRefs.length} relative file reference${relativeRefs.length === 1 ? '' : 's'} that may not resolve correctly when exported:`));
        for (const ref of relativeRefs) {
          const typeLabel = ref.type === 'link' ? 'Link' : ref.type === 'image' ? 'Image' : 'Include';
          log.info(`  ${pc.dim(typeLabel + ':')} ${ref.path} ${pc.dim('in')} ${ref.sourceName} ${pc.dim('(' + ref.sourceType + ')')}`);
        }
        log.info('');
        log.info(pc.dim('These paths were relative to the original skill/command location.'));
        log.info(pc.dim('Consider using absolute paths if they do not resolve from the export location.'));
      }
    } else {
      log.error('Export failed - file rolled back');
      process.exitCode = 1;
    }

    outro(pc.green('Done!'));

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
