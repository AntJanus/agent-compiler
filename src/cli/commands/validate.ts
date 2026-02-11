import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { intro, outro, log } from '@clack/prompts';
import pc from 'picocolors';
import { discoverAll } from '../../discovery/index.js';
import { validateSkills, validateCommands, formatJsonOutput } from '../../validation/index.js';
import { withSpinner, ActionableError } from '../output/index.js';
import type { ValidationSummary } from '../../types/index.js';

export interface ValidateOptions {
  json?: boolean;
  cwd?: string;
}

/**
 * Run the validate command - validate all skills and commands
 */
export async function runValidate(options: ValidateOptions = {}): Promise<void> {
  try {
    // Show intro only in human-readable mode
    if (!options.json) {
      intro(pc.bgCyan(pc.black(' agent-compiler validate ')));
    }

    // Step 1: Discover all skills and commands
    const discovery = options.json
      ? await discoverAll({ cwd: options.cwd })
      : await withSpinner('Discovering skills and commands...', async () => {
          return await discoverAll({ cwd: options.cwd });
        });

    // Check if anything was found
    if (discovery.skills.length === 0 && discovery.commands.length === 0) {
      if (options.json) {
        // Output empty JSON result
        const emptyResult: ValidationSummary = {
          skills: { valid: true, fileCount: 0, errors: 0, warnings: 0, issues: [] },
          commands: { valid: true, fileCount: 0, errors: 0, warnings: 0, issues: [] },
          totalFiles: 0,
          totalErrors: 0,
          totalWarnings: 0
        };
        // Read version for JSON output
        const __dirname = fileURLToPath(new URL('.', import.meta.url));
        const pkgPath = join(__dirname, '../../../package.json');
        const pkgContent = await readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgContent);
        const output = formatJsonOutput(emptyResult, pkg.version);
        console.log(output);
      } else {
        log.warn('No skills or commands found');
        outro(pc.yellow('Nothing to validate'));
      }
      return;
    }

    // Step 2: Validate skills and commands
    const skillResults = await validateSkills(discovery.skills);
    const commandResults = await validateCommands(discovery.commands);

    // Step 3: Build validation summary
    const summary: ValidationSummary = {
      skills: skillResults,
      commands: commandResults,
      totalFiles: discovery.skills.length + discovery.commands.length,
      totalErrors: skillResults.errors + commandResults.errors,
      totalWarnings: skillResults.warnings + commandResults.warnings
    };

    // Step 4: Output results
    if (options.json) {
      // JSON mode: Read version and output JSON
      const __dirname = fileURLToPath(new URL('.', import.meta.url));
      const pkgPath = join(__dirname, '../../../package.json');
      const pkgContent = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const output = formatJsonOutput(summary, pkg.version);
      console.log(output);
    } else {
      // Human-readable mode: Show formatted results
      log.info(`Found ${summary.totalFiles} files (${discovery.skills.length} skills, ${discovery.commands.length} commands)`);

      // Check if there are any issues
      const allIssues = [...skillResults.issues, ...commandResults.issues];

      if (allIssues.length > 0) {
        log.info('');

        // Group issues by severity - show errors first
        const errors = allIssues.filter(issue => issue.severity === 'error');
        const warnings = allIssues.filter(issue => issue.severity === 'warning');

        if (errors.length > 0) {
          log.error(pc.bold('Errors:'));
          for (const issue of errors) {
            log.error(`  ${pc.dim(issue.file)}`);
            log.error(`  ${issue.message}`);
            log.error('');
          }
        }

        if (warnings.length > 0) {
          log.warn(pc.bold('Warnings:'));
          for (const issue of warnings) {
            log.warn(`  ${pc.dim(issue.file)}`);
            log.warn(`  ${issue.message}`);
            log.warn('');
          }
        }

        // Show summary
        const symbol = summary.totalErrors > 0 ? '✖' : '⚠';
        const color = summary.totalErrors > 0 ? pc.red : pc.yellow;
        outro(color(`${symbol} ${summary.totalErrors} error(s), ${summary.totalWarnings} warning(s)`));
      } else {
        // No issues at all
        outro(pc.green('✓ All files valid!'));
      }
    }

    // Step 5: Set exit code
    // 0 = success (warnings are OK)
    // 1 = validation errors found
    process.exitCode = summary.totalErrors > 0 ? 1 : 0;

  } catch (error) {
    // Runtime errors: exit code 2
    if (options.json) {
      // Output error as JSON to stderr
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ error: errorMessage }, null, 2));
    } else {
      // Human-readable error
      if (error instanceof ActionableError) {
        console.error(error.format());
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.error(pc.red(`Error: ${message}`));
      }
    }
    process.exitCode = 2;
  }
}
