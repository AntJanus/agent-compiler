import pc from 'picocolors';

export function showHelp(): void {
  console.log(`
${pc.bold('agent-compiler')} - Embed Claude skills and commands into CLAUDE.md

${pc.bold('USAGE')}
  ${pc.cyan('npx agent-compiler compile')}          Run interactive wizard
  ${pc.cyan('npx agent-compiler compile --dry-run')} Preview changes without writing
  ${pc.cyan('npx agent-compiler unembed')}           Remove embedded skills and commands
  ${pc.cyan('npx agent-compiler validate')}          Validate skills and commands
  ${pc.cyan('npx agent-compiler validate --json')}   Output validation as JSON
  ${pc.cyan('npx agent-compiler export')}            Export skills to separate file
  ${pc.cyan('npx agent-compiler export --output X')} Export to custom file path
  ${pc.cyan('npx agent-compiler --version')}         Show version number
  ${pc.cyan('npx agent-compiler --help')}            Show this help message

${pc.bold('COMMANDS')}
  ${pc.cyan('compile')}         Embed skills and commands into target file
  ${pc.cyan('unembed')}         Remove embedded skills and commands from target file
  ${pc.cyan('validate')}        Validate all skills and commands before compile
  ${pc.cyan('export')}          Export skills and commands to a separate file

${pc.bold('OPTIONS')}
  ${pc.cyan('--dry-run')}       Preview changes without writing files
  ${pc.cyan('--force, -f')}     Skip confirmation prompt
  ${pc.cyan('--json')}          Output results as JSON (validate command)
  ${pc.cyan('--output, -o')}    Output file path for export (default: COMPILED_SKILLS.md)
  ${pc.cyan('-h, --help')}      Show help message
  ${pc.cyan('-v, --version')}   Show version number

${pc.bold('EXAMPLES')}
  ${pc.dim('# Run the interactive wizard')}
  ${pc.cyan('$ npx agent-compiler compile')}

  ${pc.dim('# Preview what would be changed')}
  ${pc.cyan('$ npx agent-compiler compile --dry-run')}

  ${pc.dim('# Remove embedded content interactively')}
  ${pc.cyan('$ npx agent-compiler unembed')}

  ${pc.dim('# Preview what would be removed')}
  ${pc.cyan('$ npx agent-compiler unembed --dry-run')}

  ${pc.dim('# Remove without confirmation')}
  ${pc.cyan('$ npx agent-compiler unembed --force')}

  ${pc.dim('# Validate all skills and commands')}
  ${pc.cyan('$ npx agent-compiler validate')}

  ${pc.dim('# Validate and output as JSON for CI/CD')}
  ${pc.cyan('$ npx agent-compiler validate --json')}

  ${pc.dim('# Export skills to COMPILED_SKILLS.md')}
  ${pc.cyan('$ npx agent-compiler export')}

  ${pc.dim('# Export to a custom file')}
  ${pc.cyan('$ npx agent-compiler export --output .claude/skills.md')}

  ${pc.dim('# Preview export without writing')}
  ${pc.cyan('$ npx agent-compiler export --dry-run')}

  ${pc.dim('# Export without overwrite confirmation')}
  ${pc.cyan('$ npx agent-compiler export --force')}

  ${pc.dim('# Check the current version')}
  ${pc.cyan('$ npx agent-compiler --version')}

${pc.bold('DOCUMENTATION')}
  See README.md for full documentation
`);
}
