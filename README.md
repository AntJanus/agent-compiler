# Agent Compiler

What it does:

- takes all of your skills, agents, and commands
- lets you pick which ones you want to use for a project
- combines CLAUDE.md or AGENTS.md with the skills, agents, and commands picked
- compiles the final result

Essentially, the Agent Compiler embeds skills, agents, and commands in the CLAUDE.md or AGENTS.md directly in order to prioritize those tasks rather than relying on self-invokation.

## Why?

According Vercel, [docs embedded in AGENTS.md outpeform skills](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals). I've found this to be a case for me as well:

- skills don't get triggered even using trigger phrases
- skills don't behave how I'd expect them to
- agents/claude.md still wins over any "implied" functionality

## Installation

```sh
npx agent-compiler compile
```

Then, go through the step-by-step process to pick the skills, agents, and commands you want to embed and once you approve the setup, the AGENTS.md or CLAUDE.md will be generated

## How?

For now, agent-compiler supports only markdown files. Here's what it does:

- the agent reads all of your globally-available skills and local skills (as well as agents and commands)
- the agent asks what you'd want to embed -- it's impractical to embed everything
- the agent then creates a section in the AGENTS.md or CLAUDE.md where it embeds the skills directly

Because it creates a new section, the agent-compiler is able to update/add/remove skills dynamically as well.

Typical structure:

```md
# CLAUDE.md

Your usual CLAUDE.md

## SKILLS

### Skill name

embedded compressed content of the skill as well as invokation logic.

## AGENTS

### Agent name

## COMMANDS

### Command name

```

## Roadmap

Currently supported:

- [x] local and global markdown-based skills
- [x] local and global commands
- [x] local and global agents
- [x] embedding/compiling nested skills (skills that refer to multiple files)
- [x] step-by-step compiler wizard/TUI


Future features:

- [ ] non-markdown based skills (with scripts)
- [ ] embedding CRUD -- allowing adding, removing, updating embeds
- [ ] skill/command/agent compression

## Development

### Setup

```sh
git clone https://github.com/antjanus/agent-compiler.git
cd agent-compiler
npm install
npm run build
```

### Commands

```sh
npm run build    # Build TypeScript
npm run dev      # Watch mode
npm run clean    # Remove dist/
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commits must follow the format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `refactor:` - Code change that neither fixes nor adds
- `perf:` - Performance improvement
- `test:` - Adding/updating tests
- `build:` - Build system or dependencies
- `ci:` - CI configuration
- `chore:` - Maintenance tasks

**Breaking Changes:** Add `BREAKING CHANGE:` in the commit body to trigger a major version bump.

### Releases

Releases are automated via semantic-release when commits are pushed to `main`:
1. Version is determined from commit messages
2. CHANGELOG.md is updated
3. Package is published to npm
4. GitHub release is created

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and commit using conventional commits
4. Push and open a pull request against `main`

## License

MIT
