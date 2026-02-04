import { readFile } from 'node:fs/promises';
import { intro, outro, log } from '@clack/prompts';
import pc from 'picocolors';
import { discoverAll } from '../../discovery/index.js';
import { parseSkillFile } from '../../parser/index.js';
import { parseCommandFile } from '../../parser/index.js';
import { mergeEmbeddedContent } from '../../embedding/index.js';
import { selectTargetFile, selectContentTypes, selectSkills, selectCommands } from '../prompts/index.js';
import { withSpinner, ActionableError } from '../output/index.js';
import type { ParsedSkill, ParsedCommand } from '../../types/index.js';

export interface CompileOptions {
  dryRun?: boolean;
  cwd?: string;
}

/**
 * Run the compile command - interactive wizard for embedding skills/commands
 */
export async function runCompile(options: CompileOptions = {}): Promise<void> {
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
      outro(pc.yellow('Nothing to compile'));
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
      outro(pc.red('Compilation failed'));
      process.exitCode = 1;
      return;
    }

    // Step 4: Prompt for target file
    const target = await selectTargetFile(options.cwd);
    if (!target) {
      outro(pc.yellow('Cancelled'));
      return;
    }

    // Step 5: Prompt for content types
    const contentTypes = await selectContentTypes();
    if (!contentTypes) {
      outro(pc.yellow('Cancelled'));
      return;
    }

    // Step 6: Prompt for skill selection if needed
    let selectedSkills: ParsedSkill[] = [];
    if (contentTypes.includes('skills') && parsedSkills.length > 0) {
      const skillSelection = await selectSkills(parsedSkills);
      if (!skillSelection) {
        outro(pc.yellow('Cancelled'));
        return;
      }
      selectedSkills = skillSelection;
    }

    // Step 7: Prompt for command selection if needed
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
      outro(pc.yellow('Nothing to compile'));
      return;
    }

    // Step 8: Handle dry-run mode
    if (options.dryRun) {
      log.info(pc.yellow('Dry run mode - no files will be modified'));
      log.info('');
      log.info(`Target: ${target.path}`);
      log.info(`Skills: ${selectedSkills.length}`);
      log.info(`Commands: ${selectedCommands.length}`);
      log.info('');

      // Show what would be embedded
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

      outro(pc.yellow('Dry run complete - no changes made'));
      return;
    }

    // Step 9: Perform embedding
    const result = await withSpinner('Embedding content...', async () => {
      return await mergeEmbeddedContent({
        targetPath: target.path,
        skills: selectedSkills,
        commands: selectedCommands,
        backupDir: '.agent-compiler-backups'
      });
    });

    // Step 10: Show success summary
    log.info('');
    if (result.skipped) {
      log.info(pc.dim('Content unchanged - skipped write'));
    } else {
      log.success(`Embedded ${selectedSkills.length} skill${selectedSkills.length === 1 ? '' : 's'} and ${selectedCommands.length} command${selectedCommands.length === 1 ? '' : 's'}`);
      if (result.backupPath) {
        log.info(pc.dim(`Backup created: ${result.backupPath}`));
      }
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
