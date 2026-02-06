# 1.0.0 (2026-02-06)


### Bug Fixes

* **04:** revise plans based on checker feedback ([e01d62f](https://github.com/antjanus/agent-compiler/commit/e01d62f0c11df0e5c6451950b4127f6a44f94cc1))
* disable body-max-line-length for semantic-release ([6171142](https://github.com/antjanus/agent-compiler/commit/6171142c46ff60f5fbf5b0c9452002ace644d9bd))


### Features

* **01-01:** create type definitions for skills, commands, and discovery ([53442a3](https://github.com/antjanus/agent-compiler/commit/53442a3644ae5f2d53b84a16ba2ed13a110eebc0))
* **01-01:** implement path resolution utilities with tilde expansion ([a315478](https://github.com/antjanus/agent-compiler/commit/a315478f3f020d4ac7f7f0c2fc0d0946c3e0bc98))
* **01-02:** create discovery module index with combined discovery ([c25f9e4](https://github.com/antjanus/agent-compiler/commit/c25f9e4c250bf37b181f5e526a3b9b1bc605f461))
* **01-02:** implement command discovery ([26cea47](https://github.com/antjanus/agent-compiler/commit/26cea473d9d2749d103b09a9fff38ac4634f4a22))
* **01-02:** implement skill discovery from global and project locations ([e9babdd](https://github.com/antjanus/agent-compiler/commit/e9babdde246e8c995bee7fa11698bd190b6b9c7b))
* **01-03:** implement command parser and parser module index ([ce68cef](https://github.com/antjanus/agent-compiler/commit/ce68cefcedfa2896f058b5ece78c599d465feb91))
* **01-03:** implement markdown reference extraction and concatenation ([2abd0fd](https://github.com/antjanus/agent-compiler/commit/2abd0fd0b0d22ec4986ca9ea9541bc39cc18d913))
* **01-03:** implement SKILL.md parser with safe YAML frontmatter ([816c4b1](https://github.com/antjanus/agent-compiler/commit/816c4b1c7056ac949b3c9a0884b6100bf3661b61))
* **02-01:** create backup manager with creation and verification ([28a66d0](https://github.com/antjanus/agent-compiler/commit/28a66d0daa08f7a07fb4a093aa77f93225c4db62))
* **02-01:** create hash generator and backup filename utilities ([7310586](https://github.com/antjanus/agent-compiler/commit/7310586281b8cbd1b20c725b728b8aeeca8d3ffa))
* **02-01:** create retention policy and module index ([3b8af29](https://github.com/antjanus/agent-compiler/commit/3b8af2930a2dbdcfc7cefdf48b5f2c7731cf260a))
* **02-02:** add markdown structure validator and module index ([7744fec](https://github.com/antjanus/agent-compiler/commit/7744fec120fa27264d374a3d4113b15239270342))
* **02-02:** implement atomic write with temp-then-rename pattern ([2a9e124](https://github.com/antjanus/agent-compiler/commit/2a9e124048c6538f1db75d5d668af1fadce220aa))
* **02-03:** create restore manager with backup discovery and restoration ([af28882](https://github.com/antjanus/agent-compiler/commit/af28882adcc41a948afea404855321eabe3d883e))
* **02-03:** create safe writer with backup, validation, and auto-rollback ([9ef129a](https://github.com/antjanus/agent-compiler/commit/9ef129afaa5f278fd7e1d3a4386f8ed9b04106e5))
* **03-01:** create embedding types for section detection ([588b573](https://github.com/antjanus/agent-compiler/commit/588b57307595880d71d3c04637c7159cdbfc8e88))
* **03-01:** implement section boundary detection and content splitting ([93bcbcc](https://github.com/antjanus/agent-compiler/commit/93bcbcc650c747100e9ca620e75b035b6bcd212c))
* **03-02:** implement section generators for skills and commands ([3647493](https://github.com/antjanus/agent-compiler/commit/3647493bfc5b7453276d06010dc4081b53a346d3))
* **03-02:** implement template generator for new CLAUDE.md files ([b3fa450](https://github.com/antjanus/agent-compiler/commit/b3fa4509a324dd2e89429d04b151747126a5dd3f))
* **03-03:** create embedding module index with unified exports ([744a6b7](https://github.com/antjanus/agent-compiler/commit/744a6b7410b654e05b652b09097b4cd7157e855d))
* **03-03:** implement merge orchestrator with idempotency and validation ([d497126](https://github.com/antjanus/agent-compiler/commit/d497126affdcd7097e55218c2c4aed066e423933))
* **04-01:** add CLI entry point with argument parsing ([7cc9ead](https://github.com/antjanus/agent-compiler/commit/7cc9ead579cf2aa6dc9b7b8039f6cfc1c3160b54))
* **04-01:** implement help and version display ([3a1356d](https://github.com/antjanus/agent-compiler/commit/3a1356ddcf86bfb8aa28844a8dc6d025a5c891ad))
* **04-02:** create skill and command selection prompts with visual markers ([2be2f53](https://github.com/antjanus/agent-compiler/commit/2be2f53e94d00684de7cb3604a260023be2480b6))
* **04-02:** create target and content type selection prompts ([866a08e](https://github.com/antjanus/agent-compiler/commit/866a08e37c89481acfda39a0c0b9057fcffda4de))
* **04-03:** add line ending detection and permission checking utilities ([d029fda](https://github.com/antjanus/agent-compiler/commit/d029fdab81f5d5231d595c1779c720fc04b3f6b7))
* **04-03:** create spinner and actionable error utilities ([443f804](https://github.com/antjanus/agent-compiler/commit/443f804978385ad5a4a98b6890bbd69a8d67f9e1))
* **04-04:** implement compile command with full interactive flow ([56d3faf](https://github.com/antjanus/agent-compiler/commit/56d3fafd70c2a50e897f6d31fdde999baed878de))
* **04-04:** wire compile command into CLI entry point ([1befdb2](https://github.com/antjanus/agent-compiler/commit/1befdb2c968cd4cab0df86a25fe42c8be018dfb8))
* **04-05:** integrate line ending preservation into safeWrite ([abb2268](https://github.com/antjanus/agent-compiler/commit/abb2268ed2981e3dce8ed9c7513b7b57a661a853))
* **04-05:** integrate permission checking into safeWrite ([ce431e2](https://github.com/antjanus/agent-compiler/commit/ce431e254c22218243800ec0187a2654ac11f5d3))
* initial release of agent-compiler cli ([673dc6f](https://github.com/antjanus/agent-compiler/commit/673dc6f2823c4b3ab2bbd874466c7db1aae10b8c))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-01

### Added

- Initial release
- CLI tool to discover and compile Claude skills and commands
- Support for local and global markdown-based skills
- Support for local and global commands and agents
- Embedding/compiling nested skills (skills that refer to multiple files)
- Step-by-step compiler wizard/TUI with interactive selection
- Safe file writing with backup and auto-rollback on failure
- Line ending preservation (LF/CRLF)
