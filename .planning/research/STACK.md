# Stack Research

**Domain:** Node.js/TypeScript CLI Tools with Interactive Prompts and File Parsing
**Researched:** 2026-01-30
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | v24 LTS | Runtime environment | Latest LTS (released Oct 2025), supports native TypeScript type stripping by default, receives support until April 2028. Native .ts execution with `node index.ts` eliminates build step for development. |
| TypeScript | 5.8+ | Type safety and developer experience | TypeScript 5.8+ introduces `--erasableSyntaxOnly` for Node.js compatibility. With Node.js 24 LTS, type stripping is default - no ts-node needed. Strict mode recommended for maximum type safety. |
| commander.js | 12.x | CLI framework and argument parsing | Zero dependencies, 27.9k GitHub stars, complete solution for CLI interfaces. Strict parsing with typo suggestions, automated help generation, excellent TypeScript support. Preferred for hierarchical subcommands (git-style CLIs). |
| @clack/prompts | 1.x | Interactive prompts and TUI | 80% smaller than alternatives (Inquirer), beautiful out-of-the-box styling, modern async/await API. Includes text, password, confirm, select, multiselect, and spinner components. Used by modern CLI tools for lightweight interactive experiences. |
| gray-matter | 4.x | YAML frontmatter parsing | Industry standard for frontmatter parsing (used by Eleventy, Gatsby, Netlify). Handles YAML, JSON, TOML, and Coffee frontmatter. Doesn't use regex (faster, more reliable). Can stringify back to frontmatter for updates. Handles complex markdown with embedded code blocks. |
| fast-glob | 3.x | File system discovery and globbing | 79M+ downloads/week, 10-20% faster than node-glob, TypeScript definitions included. Supports multiple patterns, negative patterns, Promise/Stream/Sync APIs. Used by Prettier and 5,000+ projects. Efficient for directories with thousands of files. |

### Build and Publishing

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| tsdown | Latest | TypeScript bundler powered by Rolldown (Rust) | PRIMARY CHOICE: Active development (tsup abandoned in 2025), ESM-first, faster than tsup, better type generation. Bundles TS to JS with dual CJS/ESM output for npm publishing. |
| tsx | 4.x | TypeScript executor for development | Development/testing only. Runs .ts files without compilation step. Replacement for ts-node. Not needed for production (Node.js 24 has native type stripping). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | 1.x | Terminal colors | 14x smaller and 2x faster than chalk. Essential coloring only. Used by PostCSS, SVGO, Stylelint. Choose this over chalk for minimal size. |
| ora | 9.x | Loading spinners | Elegant terminal spinner with 46M+ downloads. Auto-handles concurrent writes, customizable success/failure states. For single task progress indicators. |
| remark | 15.x | Markdown parsing and transformation | If you need to parse/transform markdown content beyond frontmatter. Part of unified ecosystem (312 projects, 68k GitHub stars). Parses to AST (mdast) per CommonMark spec. Compatible with Node.js 16+. |
| remark-frontmatter | Latest | Extract frontmatter blocks in remark | Use WITH remark if you need unified pipeline. gray-matter alone is sufficient for simple frontmatter extraction. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @types/node | Type definitions for Node.js API | Required for TypeScript projects |
| tsx | Run TypeScript files in development | `tsx src/cli.ts` for quick testing |
| tsdown | Build for production | Dual ESM/CJS output, type definitions |
| ESLint (flat config) | Code linting | 2025 standard is flat config format |
| Prettier | Code formatting | Industry standard formatter |

## Installation

```bash
# Core dependencies
npm install commander @clack/prompts gray-matter fast-glob picocolors ora

# Markdown parsing (optional - only if transforming content)
npm install remark remark-frontmatter

# Dev dependencies
npm install -D typescript @types/node tsdown tsx eslint prettier

# TypeScript 5.8+ required
npm install -D typescript@^5.8.0
```

## Package.json Configuration for npx

```json
{
  "name": "agent-compiler",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "agent-compiler": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsdown",
    "prepublishOnly": "npm run build"
  }
}
```

**Critical for npx compatibility:**
- `bin` field points to compiled JS (not .ts source)
- Shebang `#!/usr/bin/env node` at top of CLI entry file
- `files` array includes only `dist` directory
- Use `npm publish --access public` for scoped packages

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| commander.js | yargs | If you need extensive validation, middleware system, or complex option dependencies. Note: yargs has 16 dependencies vs commander's zero. |
| @clack/prompts | @inquirer/prompts | If you need extensive customization or custom prompt types. Inquirer is larger but more feature-rich. Note: original inquirer is maintenance-only; @inquirer/prompts is the active version. |
| gray-matter | js-yaml | Only if you're parsing YAML exclusively (no frontmatter). gray-matter is purpose-built for frontmatter and handles edge cases better. |
| fast-glob | node-glob | Never. fast-glob is faster, more efficient, and has TypeScript support built-in. |
| picocolors | chalk | If you need truecolor support or more comprehensive styling API. Chalk is 6x larger and 2x slower but more feature-rich. |
| tsdown | tsup | Never. tsup was abandoned in 2025; maintainers recommend tsdown. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ts-node | Superseded by tsx and native Node.js type stripping | tsx for development, Node.js 24 native type stripping |
| tsup | No longer actively maintained as of 2025 | tsdown (actively maintained successor) |
| inquirer (original) | Legacy version in maintenance-only mode | @inquirer/prompts (active development) or @clack/prompts (smaller) |
| yargs | 16 dependencies, larger bundle size, overkill for simple CLIs | commander.js for most use cases |
| minimist | Too low-level, lacks features like help generation | commander.js or yargs |
| prompts | Less active than alternatives | @clack/prompts for modern CLIs |
| Babel for type stripping | Node.js 24+ has native support | Native Node.js type stripping |

## Stack Patterns by Variant

**If building a simple CLI with few commands:**
- commander.js + @clack/prompts + picocolors
- Skip ora if no long-running operations
- Skip remark if not transforming markdown

**If building complex CLI with validation:**
- yargs (instead of commander) + @clack/prompts
- Add custom validation middleware
- Consider zod for schema validation

**If parsing AND transforming markdown:**
- gray-matter + remark + remark plugins
- Use unified pipeline for transformations
- gray-matter for frontmatter, remark for content

**If just extracting frontmatter:**
- gray-matter alone is sufficient
- No need for remark/unified overhead

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Node.js 24 LTS | TypeScript 5.8+ | TypeScript 5.8 introduces `--erasableSyntaxOnly` for Node.js compatibility |
| commander.js 12.x | TypeScript 5.8+ | Full TypeScript definitions included |
| @clack/prompts | Node.js 16+ | ESM-only package |
| remark 15.x | Node.js 16+ | Unified ecosystem uses ESM |
| gray-matter 4.x | Node.js any | CJS package, widely compatible |
| fast-glob 3.x | Node.js any | Both CJS and ESM support |
| tsdown | TypeScript 5.x | Designed for modern TypeScript |

## Architecture Notes

**ESM vs CJS in 2025:**
- Use `"type": "module"` in package.json (ESM-first)
- Bundle with tsdown for dual CJS/ESM output
- Node.js 24 ecosystem is ESM-native
- Most modern CLI tools are ESM

**Binary Structure:**
```
src/
  cli.ts          # Entry point with shebang
  commands/       # Subcommand handlers
  utils/          # Shared utilities
  types.ts        # TypeScript types
dist/
  cli.js          # Compiled with tsdown
  cli.d.ts        # Type definitions
```

**npx Flow:**
1. User runs `npx agent-compiler`
2. npm installs package temporarily
3. Reads `bin` field from package.json
4. Executes `dist/cli.js` with Node.js
5. Shebang line ensures Node.js runtime

## Confidence Levels

| Category | Recommendation | Confidence | Reason |
|----------|---------------|------------|---------|
| Runtime | Node.js 24 LTS + TypeScript 5.8+ | HIGH | Official LTS release, native TypeScript support verified in docs |
| CLI Framework | commander.js | HIGH | Industry standard, zero dependencies, 27.9k stars, widely adopted |
| Interactive Prompts | @clack/prompts | HIGH | Modern successor to older libraries, significantly smaller, active development |
| Frontmatter Parsing | gray-matter | HIGH | De facto standard for frontmatter (used by Gatsby, Eleventy, Netlify) |
| File Globbing | fast-glob | HIGH | Performance leader, TypeScript support, 79M+/week downloads |
| Bundler | tsdown | MEDIUM | New but actively maintained, recommended by tsup maintainers. Some projects still using tsup successfully but it's deprecated. |
| Colors | picocolors | HIGH | Performance and size leader, used by major tools (PostCSS, SVGO) |
| Spinner | ora | HIGH | Most popular spinner library, 46M+ downloads |
| Markdown Parsing | remark | HIGH | Only if needed beyond frontmatter. Unified ecosystem is industry standard. |

## Sources

### Primary Sources (HIGH Confidence)
- [Node.js v25 TypeScript Documentation](https://nodejs.org/api/typescript.html) - Native TypeScript support
- [Node.js v24 LTS Release](https://nodejs.org/en/blog/release/v22.18.0) - LTS version information
- [commander.js GitHub Repository](https://github.com/tj/commander.js) - 27.9k stars, feature documentation
- [tsdown Official Documentation](https://tsdown.dev/guide/) - Bundler for TypeScript libraries
- [Clack Prompts Documentation](https://www.clack.cc/) - Official @clack/prompts guide
- [gray-matter GitHub Repository](https://github.com/jonschlinkert/gray-matter) - Battle-tested frontmatter parser
- [fast-glob GitHub Repository](https://github.com/mrmlnc/fast-glob) - Performance benchmarks
- [remark GitHub Repository](https://github.com/remarkjs/remark) - Unified ecosystem
- [picocolors GitHub Repository](https://github.com/alexeyraspopov/picocolors) - Benchmarks vs chalk
- [ora GitHub Repository](https://github.com/sindresorhus/ora) - Terminal spinner

### Secondary Sources (MEDIUM Confidence)
- [A Modern Node.js + TypeScript Setup for 2025](https://dev.to/woovi/a-modern-nodejs-typescript-setup-for-2025-nlk) - Best practices
- [Node.js in 2025: Modern Features That Matter](https://medium.com/@uyanhewagetr/node-js-in-2025-modern-features-that-matter-7e0e6eca581d) - Feature overview
- [Building Modern CLI Tool with Node.js and TypeScript](https://www.nanagaisie.com/blog/building-modern-cli-tool) - Architecture patterns
- [TypeScript in 2025 with ESM and CJS](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) - Publishing challenges
- [Switching from tsup to tsdown](https://alan.norbauer.com/articles/tsdown-bundler/) - Migration rationale
- [Mastering npm & npx in 2025](https://jewelhuq.medium.com/mastering-npm-npx-in-2025-the-definitive-guide-to-node-js-86b2c8e2a39d) - npx compatibility
- [Comparison of CLI Frameworks](https://www.oreateai.com/blog/indepth-comparison-of-cli-frameworks-technical-features-and-application-scenarios-of-yargs-commander-and-oclif/24440ae03bfbae6c4916c403a728f6da) - Commander vs Yargs
- [Comparison of Node.js Terminal Color Libraries](https://dev.to/webdiscus/comparison-of-nodejs-libraries-to-colorize-text-in-terminal-4j3a) - Picocolors benchmarks
- [Elevate Your CLI Tools with @clack/prompts](https://www.blacksrc.com/blog/elevate-your-cli-tools-with-clack-prompts) - Clack features

### Ecosystem Discovery (MEDIUM Confidence)
- npm-compare.com comparisons for various library categories
- Multiple 2025-dated blog posts and tutorials verified key trends

---
*Stack research for: Agent Compiler CLI Tool*
*Researched: 2026-01-30*
