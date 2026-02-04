import pc from 'picocolors';

export function showHelp(): void {
  console.log(`
${pc.bold('agent-compiler')} - Embed Claude skills and commands into CLAUDE.md

${pc.bold('USAGE')}
  ${pc.cyan('npx agent-compiler compile')}          Run interactive wizard
  ${pc.cyan('npx agent-compiler compile --dry-run')} Preview changes without writing
  ${pc.cyan('npx agent-compiler --version')}         Show version number
  ${pc.cyan('npx agent-compiler --help')}            Show this help message

${pc.bold('OPTIONS')}
  ${pc.cyan('--dry-run')}       Preview changes without writing files
  ${pc.cyan('-h, --help')}      Show help message
  ${pc.cyan('-v, --version')}   Show version number

${pc.bold('EXAMPLES')}
  ${pc.dim('# Run the interactive wizard')}
  ${pc.cyan('$ npx agent-compiler compile')}

  ${pc.dim('# Preview what would be changed')}
  ${pc.cyan('$ npx agent-compiler compile --dry-run')}

  ${pc.dim('# Check the current version')}
  ${pc.cyan('$ npx agent-compiler --version')}

${pc.bold('DOCUMENTATION')}
  See README.md for full documentation
`);
}
