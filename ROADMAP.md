# Roadmap

> Agent Compiler embeds Claude Code skills and commands directly into CLAUDE.md/AGENTS.md files, solving unreliable skill invocation by compiling content where it consistently works.

## Core Features
- **Config-driven compilation** - A `.agent-compiler.json` config file that defines default skills, target file, and options so `compile` can run non-interactively in automated workflows.
- **AGENTS.md support** - Full support for AGENTS.md as a compilation target alongside CLAUDE.md, enabling multi-agent skill embedding.
- **Pre-commit hook integration** - Auto-compile or validate skills before each commit to keep embedded content always in sync with source skills.

## Developer Experience
- **Diff preview** - Show a clear, colorized diff of what will change before applying, improving on the current dry-run output.
- **Selective recompile** - Detect which skills changed since last compile and only update those sections, reducing noise in diffs.

## CI/CD & Automation
- **GitHub Action** - A reusable GitHub Action that validates and/or compiles skills as part of CI pipelines.
- **Drift detection** - A CI-oriented check that fails if embedded content is out of sync with source skill files.

## Quality & Reliability
- **Comprehensive test suite** - Expand unit and e2e test coverage across all modules (discovery, parser, embedding, file-safety, validation, CLI commands).
- **Validation improvements** - Better error messages, additional validation rules, and configurable severity levels.

## Future Ideas
- **Skill dependency resolution** - Skills that declare dependencies on other skills, with automatic ordering and inclusion.
- **Workspace-level config** - Monorepo support with shared base config and per-project overrides for skill sets.

## Out of Scope
- Remote skill registry or URL-based skill fetching
- Watch mode / auto-recompile on file changes
- Skill templating or scaffolding generators
- GUI or web interface

## Completed
- ~~**Compile command**~~ - Discover, select, and embed skills/commands into target files with safe atomic writes. *(Completed: v1.0)*
- ~~**Unembed command**~~ - Interactively remove embedded skills/commands from target files. *(Completed: v1.1, 2026-02-10)*
- ~~**Validation command**~~ - Check skills/commands for quality issues with human-readable and JSON output. *(Completed: v1.1, 2026-02-10)*
- ~~**Export command**~~ - Write skills to separate files with markdown references as an alternative to embedding. *(Completed: v1.1, 2026-02-10)*
- ~~**Heading transformation**~~ - AST-based automatic heading level adjustment during compilation to prevent h1 conflicts. *(Completed: v1.1, 2026-02-10)*
- ~~**Backup & rollback system**~~ - Automatic backup before every write with atomic operations and auto-rollback on failure. *(Completed: v1.0)*
- ~~**Dry-run & force modes**~~ - Preview changes before applying; non-interactive mode for automation. *(Completed: v1.1, 2026-02-10)*
