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
