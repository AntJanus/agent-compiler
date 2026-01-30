# Agent Compiler

## What This Is

A Node.js CLI tool that embeds Claude Code skills and commands directly into CLAUDE.md or AGENTS.md files. It solves the problem of unreliable skill invocation by embedding functionality directly into agent instruction files where it consistently works.

## Core Value

The tool must reliably embed selected skills/commands into CLAUDE.md or AGENTS.md, so that functionality that fails as external skills works consistently when embedded.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CLI invokable via `npx agent-compiler compile`
- [ ] Interactive wizard with step-by-step prompts (Next.js create-app style)
- [ ] Wizard asks: reuse existing CLAUDE.md/AGENTS.md or create new
- [ ] Wizard asks: embed SKILLS, COMMANDS, or both (checkbox selection)
- [ ] Tool discovers global skills from `~/.claude/skills/`
- [ ] Tool discovers project skills from `./.claude/skills/`
- [ ] Tool discovers commands from `./.claude/commands/`
- [ ] Selection UI differentiates global vs project skills visually
- [ ] Filterable/scrollable list for selecting skills and commands
- [ ] Tool parses SKILL.md files (YAML frontmatter + markdown body)
- [ ] Tool concatenates markdown files from skill directories
- [ ] Tool skips non-markdown files (scripts, JSON, binaries)
- [ ] Tool preserves original CLAUDE.md/AGENTS.md content
- [ ] Tool removes previously embedded sections (## SKILLS, ## COMMANDS, ## AGENTS)
- [ ] Tool creates backups before overwriting files
- [ ] Generated files have proper section structure
- [ ] Tool fails fast with clear error messages for malformed files or missing dependencies

### Out of Scope

- Embedding agents — deferred to v2
- Non-markdown skill support (scripts) — future feature per README
- CRUD operations on existing embeds — future feature per README
- Compression of embedded content — future feature per README
- Monorepo nested skill discovery — complex, defer to future version
- Interactive editing mode — v1 is compilation-only

## Context

**Problem**: Claude Code skills are unreliable - they don't get triggered even with trigger phrases, and don't behave as expected. However, when functionality is embedded directly in CLAUDE.md or AGENTS.md files, it works consistently.

**Research backing**: Vercel published research showing that docs embedded in AGENTS.md outperform skills in agent evaluations.

**Claude Code ecosystem**:
- Skills live in `~/.claude/skills/<skill-name>/SKILL.md` (global) and `./.claude/skills/<skill-name>/SKILL.md` (project)
- Each SKILL.md has YAML frontmatter (name, description, metadata) and markdown instructions
- Skills can have supporting files (reference.md, templates/, resources/)
- Commands live in `./.claude/commands/*.md` (legacy, being deprecated)
- CLAUDE.md and AGENTS.md are instruction files that guide AI agent behavior

**Target structure** after compilation:
```markdown
# CLAUDE.md

[Original user content preserved]

## SKILLS

### Skill Name 1
[Embedded skill content]

### Skill Name 2
[Embedded skill content]

## COMMANDS

### Command Name 1
[Embedded command content]
```

## Constraints

- **Tech stack**: Node.js/TypeScript — must be npm-publishable and npx-compatible
- **UX**: Lightweight TUI similar to create-next-app — no heavy TUI frameworks
- **Distribution**: Publishable npm package — others need to be able to install and use it
- **Error handling**: Fail fast with clear messages — don't crash silently or continue with corrupted state

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use lightweight TUI (prompts-style) | Matches Next.js generator UX, simpler than full TUI frameworks | — Pending |
| Concatenate only markdown files | Non-markdown files (scripts, JSON) aren't embeddable instructions | — Pending |
| Create backups before overwriting | Safety net prevents data loss | — Pending |
| Parse YAML frontmatter from SKILL.md | Needed to extract skill metadata and separate from instructions | — Pending |

---
*Last updated: 2026-01-30 after initialization*
