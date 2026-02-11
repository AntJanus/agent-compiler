#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { showHelp } from './help.js';
import { showVersion } from './version.js';
import { runCompile } from './commands/compile.js';
import { runUnembed } from './commands/unembed.js';
import { runValidate } from './commands/validate.js';

async function main(): Promise<void> {
  try {
    const { values, positionals } = parseArgs({
      options: {
        version: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
        'dry-run': { type: 'boolean' },
        force: { type: 'boolean', short: 'f' },
        json: { type: 'boolean' },
      },
      allowPositionals: true,
    });

    // Handle --version flag
    if (values.version) {
      await showVersion();
      process.exitCode = 0;
      return;
    }

    // Handle --help flag
    if (values.help) {
      showHelp();
      process.exitCode = 0;
      return;
    }

    const command = positionals[0];

    // Handle 'compile' command
    if (command === 'compile') {
      await runCompile({
        dryRun: values['dry-run'],
        cwd: process.cwd()
      });
      return;
    }

    // Handle 'unembed' command
    if (command === 'unembed') {
      await runUnembed({
        dryRun: values['dry-run'],
        force: values.force,
        cwd: process.cwd()
      });
      return;
    }

    // Handle 'validate' command
    if (command === 'validate') {
      await runValidate({
        json: values.json,
        cwd: process.cwd()
      });
      return;
    }

    // Unknown or missing command - show help and exit with error
    if (!command) {
      console.error('Error: No command specified\n');
    } else {
      console.error(`Error: Unknown command '${command}'\n`);
    }
    showHelp();
    process.exitCode = 1;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

// Run the CLI
main();
