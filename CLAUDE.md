# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Compiler is a Node.js CLI tool that embeds Claude Code skills and commands directly into CLAUDE.md or AGENTS.md files. It solves unreliable skill invocation by embedding functionality where it consistently works.

## Commands

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Run the CLI locally (after build)
node dist/cli/cli.js compile
./dist/cli/cli.js compile --dry-run

# Run via npx (when published)
npx agent-compiler compile
```

## Architecture

### Module Structure

```
src/
├── cli/           # CLI entry point and user interaction
│   ├── cli.ts          # Main entry, uses node:util parseArgs
│   ├── commands/       # Command implementations (compile.ts)
│   ├── prompts/        # @clack/prompts based selection UI
│   └── output/         # Spinner (ora) and message formatting
├── discovery/     # Find skills/commands from filesystem
├── parser/        # Parse SKILL.md (YAML frontmatter + markdown)
├── embedding/     # Merge content into target files
├── file-safety/   # Backup, atomic writes, validation
├── types/         # TypeScript interfaces
└── utils/         # Path resolution utilities
```

### Data Flow

1. **Discovery** (`discovery/`) - Scans `~/.claude/skills/` (global) and `./.claude/skills/` (project) for `*/SKILL.md` files; commands from `./.claude/commands/*.md`
2. **Parsing** (`parser/`) - Extracts YAML frontmatter metadata and markdown content using `gray-matter`
3. **Selection** (`cli/prompts/`) - Interactive multi-select for skills/commands
4. **Embedding** (`embedding/`) - Splits existing content, generates sections, merges back
5. **Safe Write** (`file-safety/`) - Backup → atomic write → validation → auto-rollback on failure

### Key Types

```typescript
// Parsed skill from SKILL.md
interface ParsedSkill {
  path: string;
  location: 'global' | 'project';
  metadata: { name: string; description: string };
  content: string;
}

// Safe write result
interface SafeWriteResult {
  success: boolean;
  backupPath: string;
  rolledBack: boolean;
}
```

### Safety Pipeline (file-safety/)

The `safeWrite()` function is the main file modification API:
1. Check write permissions (target + backup directory)
2. Detect original line ending (preserve LF/CRLF)
3. Create backup before modification
4. Atomic write (temp file → rename)
5. Validate markdown structure
6. Auto-rollback from backup if validation fails

Backups go to `.agent-compiler-backups/` with format: `{basename}_{ISO8601}_{hash}.md`

## Conventions

### ES Modules

This project uses ES modules (`"type": "module"` in package.json). All imports must include `.js` extension:

```typescript
// Correct
import { discoverSkills } from './discovery/skill-discovery.js';

// Wrong - will fail at runtime
import { discoverSkills } from './discovery/skill-discovery';
```

### Exit Handling

Use `process.exitCode = 1` instead of `process.exit(1)` to avoid truncating stdout.

### Error Handling

Use `ActionableError` for user-facing errors with resolution steps:

```typescript
throw new ActionableError(
  'Cannot write to file',
  { path: targetPath, reason: 'Permission denied' },
  ['Check file permissions', 'Run with sudo if needed']
);
```

### Section Detection

Embedded sections use regex-based detection (case-insensitive):
- `## SKILLS` / `## Skills`
- `## COMMANDS` / `## Commands`

Section boundaries respect heading depth (## only, not ###).

## Do Not

- Do not use `process.exit()` - use `process.exitCode` instead
- Do not import without `.js` extension in TypeScript files
- Do not skip backup creation before file modifications
- Do not use `commander` - use built-in `node:util parseArgs`
