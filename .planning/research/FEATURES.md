# Feature Research

**Domain:** CLI Developer Tools - Compilation/Embedding/Bundling
**Researched:** 2026-01-30
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Error handling & validation** | All modern CLI tools fail fast with clear error messages | LOW | Must validate file existence, format, permissions before processing |
| **File backups** | Users expect safety net before destructive operations | LOW | Create `.bak` files or timestamped backups before overwriting |
| **Progress indicators** | Long operations need visual feedback (spinners/progress bars) | LOW | Use ora, cli-progress, or similar libraries |
| **Color-coded output** | Modern CLIs use color for success/error/info messages | LOW | Chalk remains the standard (25M+ weekly downloads) |
| **Help documentation** | `--help` flag with clear usage examples | LOW | Commander.js auto-generates from command definitions |
| **Interactive prompts** | Wizard-style interfaces for complex workflows | MEDIUM | Inquirer.js is the standard (25M+ downloads) |
| **File discovery** | Automatic detection of relevant files in standard locations | MEDIUM | Must search both global (`~/.claude/`) and project (`./.claude/`) paths |
| **Parsing structured files** | Handle YAML frontmatter and markdown body | MEDIUM | gray-matter library is standard for frontmatter parsing |
| **Idempotent operations** | Re-running should be safe and produce same result | MEDIUM | Remove old embedded sections before adding new ones |
| **Clear error messages** | Actionable errors that explain what went wrong and how to fix | LOW | Include file paths, line numbers, expected format examples |
| **Exit codes** | Proper exit codes (0 for success, non-zero for errors) | LOW | Critical for CI/CD integration |
| **Version flag** | `--version` shows current tool version | LOW | Standard across all CLI tools |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smart conflict resolution** | Detect and handle embedded section conflicts intelligently | HIGH | If existing SKILLS section has custom content, prompt to merge vs replace |
| **Preview/dry-run mode** | Show what will change without making changes (`--dry-run`) | MEDIUM | Critical for trust - users want to see before committing |
| **Content compression** | Reduce token count by removing whitespace, comments | MEDIUM | Future feature per README - compress embedded content for efficiency |
| **Undo functionality** | Quick rollback to previous state (`undo` command) | MEDIUM | Restore from backups with simple command |
| **Diff view** | Show side-by-side comparison of changes before applying | MEDIUM | Helps users understand what embedding will do |
| **Watch mode** | Auto-recompile when source skills change | HIGH | `--watch` flag for development workflow |
| **Template system** | Customizable output format for embedded sections | MEDIUM | Allow users to control structure of SKILLS/COMMANDS sections |
| **Selective updates** | Update only specific skills without full recompile | MEDIUM | `compile --update skill-name` for incremental changes |
| **Dependency tracking** | Track which skills reference which files | MEDIUM | Detect when referenced files change and prompt recompile |
| **Global config file** | Store user preferences (default paths, format options) | LOW | `~/.agent-compiler/config.json` for defaults |
| **Multi-file output** | Generate both CLAUDE.md and AGENTS.md simultaneously | LOW | Useful for projects using both formats |
| **Verification checks** | Validate output file integrity after compilation | LOW | Check for broken references, malformed markdown |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **GUI mode** | "I want visual interface" | Adds massive complexity, defeats CLI purpose | Excellent TUI with Inquirer.js is sufficient |
| **Overly complex configuration** | "I want to customize everything" | Creates maintenance burden, steep learning curve | Sensible defaults with minimal required config |
| **Embed everything by default** | "Just include all skills" | Creates bloated files, slows Claude response time | Force intentional selection via interactive wizard |
| **Auto-commit to git** | "Automatically commit changes" | Dangerous - users should review before commit | Provide git integration hints but don't auto-commit |
| **Remote skill fetching** | "Download skills from registry" | Security risk, network dependency, version conflicts | Focus on local skills only |
| **Binary executable distribution** | "Avoid Node.js requirement" | Loses npm ecosystem, harder to maintain | Embrace npx - it's the standard for Node CLIs |
| **Real-time collaboration** | "Multiple users editing same file" | Massive complexity, out of scope for compilation tool | This is a git/version control problem, not compiler problem |
| **Skill marketplace integration** | "Browse and install skills from UI" | Scope creep - this is a different product | Keep focused on compilation, not distribution |
| **Automatic skill updates** | "Auto-update embedded skills from source" | Breaks reproducibility, unexpected changes | Explicit recompile command maintains control |
| **Format conversion** | "Convert to JSON/YAML/TOML output" | Markdown is the Claude standard - don't fight it | Stick with markdown, it's what Claude expects |

## Feature Dependencies

```
[File Discovery]
    └──requires──> [Path Resolution]
                       └──requires──> [Permission Checks]

[Parsing YAML Frontmatter]
    └──requires──> [File Reading]
                       └──requires──> [Validation]

[Interactive Wizard] ──enhances──> [File Discovery]
[Interactive Wizard] ──requires──> [Validation]

[Preview Mode] ──requires──> [Diff Generation]
                                └──requires──> [Backup Creation]

[Backup Creation] ──required-by──> [File Overwriting]

[Watch Mode] ──conflicts──> [One-time Compilation]
[Watch Mode] ──requires──> [File Discovery] + [Change Detection]

[Content Compression] ──modifies──> [Embedding Output]
                                      └──potentially-breaks──> [Readability]

[Undo Functionality] ──requires──> [Backup Creation]
                                    └──requires──> [Version Tracking]
```

### Dependency Notes

- **File Discovery requires Path Resolution:** Must resolve both absolute paths (`~/.claude/`) and relative paths (`./.claude/`) before searching
- **Backup Creation required by File Overwriting:** Never overwrite without backup - this is non-negotiable for user trust
- **Watch Mode conflicts with One-time Compilation:** These are mutually exclusive modes - watch runs continuously, compile runs once
- **Content Compression potentially breaks Readability:** Must balance token efficiency vs human readability when compressing
- **Preview Mode requires Diff Generation:** Can't preview without comparing current vs proposed state

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed to validate the concept.

- [x] **File discovery (global + project)** — Essential for finding skills to embed
- [x] **YAML frontmatter parsing** — Required to extract skill metadata
- [x] **Interactive wizard** — Core UX, differentiates from simple merge tools
- [x] **Markdown concatenation** — The actual compilation logic
- [x] **Backup creation** — Safety net prevents data loss
- [x] **Section replacement** — Idempotent updates require removing old embeds
- [x] **Error handling & validation** — Table stakes for CLI tools
- [x] **Progress indicators** — User feedback during longer operations
- [x] **Color-coded output** — Modern CLI standard
- [x] **Help documentation** — Required for usability

### Add After Validation (v1.x)

Features to add once core is working and users provide feedback.

- [ ] **Preview/dry-run mode** — High value, medium complexity - wait for user demand
- [ ] **Undo functionality** — Natural next step after backups are working
- [ ] **Global config file** — Add when users request default behavior customization
- [ ] **Selective updates** — Wait to see if users need incremental updates vs full recompile
- [ ] **Diff view** — Enhanced preview mode - add if basic preview isn't sufficient
- [ ] **Verification checks** — Add if users report corrupted output issues
- [ ] **Template system** — Only if users need customization beyond default format

### Future Consideration (v2.0+)

Features to defer until product-market fit is established.

- [ ] **Content compression** — Already noted in README as future feature
- [ ] **Watch mode** — Complex feature, wait for clear use case validation
- [ ] **Smart conflict resolution** — High complexity, defer until conflict patterns emerge
- [ ] **Dependency tracking** — Nice to have, but adds significant complexity
- [ ] **Multi-file output** — Wait to see if users actually use both CLAUDE.md and AGENTS.md
- [ ] **Non-markdown skill support** — Noted in README as future, requires script execution logic

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| File discovery | HIGH | MEDIUM | P1 |
| Interactive wizard | HIGH | MEDIUM | P1 |
| Backup creation | HIGH | LOW | P1 |
| Error handling | HIGH | LOW | P1 |
| YAML parsing | HIGH | LOW | P1 |
| Section replacement | HIGH | MEDIUM | P1 |
| Progress indicators | MEDIUM | LOW | P1 |
| Color output | MEDIUM | LOW | P1 |
| Help documentation | HIGH | LOW | P1 |
| Preview/dry-run mode | HIGH | MEDIUM | P2 |
| Undo functionality | MEDIUM | MEDIUM | P2 |
| Global config file | MEDIUM | LOW | P2 |
| Diff view | MEDIUM | MEDIUM | P2 |
| Verification checks | MEDIUM | LOW | P2 |
| Content compression | LOW | MEDIUM | P3 |
| Watch mode | LOW | HIGH | P3 |
| Smart conflict resolution | MEDIUM | HIGH | P3 |
| Template system | LOW | MEDIUM | P3 |
| Dependency tracking | LOW | HIGH | P3 |
| Multi-file output | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (table stakes + core differentiators)
- P2: Should have, add when possible (high-value enhancements)
- P3: Nice to have, future consideration (complex or low-demand features)

## Competitor Feature Analysis

| Feature | concat-md | merge-markdown | mdmerge | Agent Compiler (Ours) |
|---------|-----------|----------------|---------|----------------------|
| **Table of contents** | ✅ Auto-generated | ✅ Configurable | ✅ Optional | ❌ Not needed (embedding, not docs) |
| **Relative link resolution** | ✅ Yes | ✅ Advanced | ✅ Basic | ⚠️ Consider for nested skills |
| **Title level adjustment** | ✅ Decrease all | ❌ No | ✅ Yes | ⚠️ May need for consistent hierarchy |
| **Interactive selection** | ❌ No | ❌ No | ❌ No | ✅ **Our differentiator** |
| **YAML frontmatter parsing** | ❌ No | ❌ No | ❌ No | ✅ **Our differentiator** |
| **Backup creation** | ❌ No | ❌ No | ❌ No | ✅ **Our differentiator** |
| **Section replacement (idempotent)** | ❌ No | ❌ No | ❌ No | ✅ **Our differentiator** |
| **Multiple output formats** | ❌ Markdown only | ✅ HTML, PDF, Word | ✅ Markdown only | ❌ Markdown only (by design) |
| **Docker support** | ❌ No | ✅ Yes | ❌ No | ❌ Not needed (npx handles distribution) |
| **Manifest/config file** | ❌ No | ✅ YAML/JSON | ❌ No | ⚠️ Consider for v1.x |
| **Custom sort function** | ✅ Yes | ❌ No | ❌ No | ⚠️ User-driven selection > sorting |
| **Async processing** | ✅ Yes | ✅ Yes | ❌ No | ✅ Required for performance |

### Competitive Positioning

**Our Strengths:**
1. **Interactive wizard** - None of the competitors offer guided selection
2. **Context-aware** - Understands Claude Code ecosystem (skills, agents, commands)
3. **Idempotent** - Can safely re-run without manual cleanup
4. **Safety-first** - Backups and validation built-in

**Gaps to Address:**
1. **Relative link resolution** - merge-markdown has advanced resolution, we should match this for nested skills
2. **Title level adjustment** - May be needed to maintain consistent heading hierarchy
3. **Config file support** - merge-markdown's manifest approach could be valuable for v1.x

**Deliberate Omissions:**
1. **Multi-format output** - We're Claude-focused, markdown is the format
2. **Docker support** - npx handles distribution, no need for containers
3. **Table of contents** - Embedding is different from documentation generation

## Implementation Complexity Notes

### LOW Complexity Features
- **Backup creation:** Simple file copy with timestamp
- **Color output:** Chalk library is 2-line integration
- **Progress indicators:** ora/cli-progress are plug-and-play
- **Error handling:** Standard try/catch with descriptive messages
- **Exit codes:** Built into Node.js
- **Version flag:** Read from package.json
- **Help documentation:** Commander.js auto-generates
- **YAML parsing:** gray-matter is mature and simple
- **Global config file:** JSON read/write to `~/.config/`

### MEDIUM Complexity Features
- **File discovery:** Must handle multiple paths, glob patterns, symlinks
- **Interactive wizard:** Inquirer.js reduces complexity, but flow logic is non-trivial
- **Section replacement:** Regex-based markdown section detection and replacement
- **Preview mode:** Generate diff, display formatted comparison
- **Undo functionality:** Track backup history, restore mechanism
- **Selective updates:** Requires tracking what's embedded, partial regeneration
- **Diff view:** Use diff library, format for terminal display
- **Template system:** Parse template language, inject variables
- **Content compression:** AST parsing to remove whitespace safely

### HIGH Complexity Features
- **Smart conflict resolution:** Semantic diff, merge strategies, conflict UI
- **Watch mode:** File watching, debouncing, incremental recompile, state management
- **Dependency tracking:** Build dependency graph, change detection across files
- **Title level adjustment:** Parse markdown AST, adjust heading levels consistently

## Domain-Specific Considerations

### Claude Code Ecosystem Requirements

**File Structure Understanding:**
- Global skills: `~/.claude/skills/<skill-name>/SKILL.md`
- Project skills: `./.claude/skills/<skill-name>/SKILL.md`
- Commands: `./.claude/commands/<command-name>.md`
- Agents: `./.claude/agents/<agent-name>.md`
- Target files: `CLAUDE.md` or `AGENTS.md` at project root

**Metadata Preservation:**
- SKILL.md has YAML frontmatter (name, description, trigger words, etc.)
- Need to extract metadata but embed only instructions
- Some skills reference additional files (templates/, resources/)
- Must concatenate multi-file skills intelligently

**Output Requirements:**
- Embedded sections must be clearly demarcated (## SKILLS, ## COMMANDS)
- Original content must be preserved above embedded sections
- Removing old embedded sections must be surgical (don't touch user content)
- Markdown formatting must be valid after compilation

### Token Efficiency Considerations

**Why This Matters:**
- Claude has token limits per request
- Embedding many skills can bloat CLAUDE.md
- Larger files = slower Claude response times
- Users need intentional selection, not "embed everything"

**Design Implications:**
- Interactive wizard forces deliberate choices
- Future compression feature reduces token count
- Verification checks can warn about overly large outputs
- Consider showing estimated token count during selection

### Version Control Integration

**Current State:**
- Users will commit compiled CLAUDE.md to git
- Changes to source skills should trigger recompilation
- Backups should not be committed (add to .gitignore)

**Considerations:**
- Should tool auto-update .gitignore for backups?
- Should tool suggest git workflow (commit source skills separately)?
- Watch mode could detect git branch changes and recompile
- Verification could check if compiled output matches source skills

## Research Quality Assessment

### Source Quality

| Topic | Primary Sources | Confidence | Notes |
|-------|----------------|------------|-------|
| **CLI UX Best Practices** | Command Line Interface Guidelines (clig.dev), Evil Martians CLI UX | HIGH | Well-established patterns from 2023-2026 |
| **Bundler Features** | Vite, webpack, esbuild, rollup official docs | HIGH | Direct comparison from official sources |
| **Interactive Prompts** | Inquirer.js, Commander.js docs (25M+ downloads each) | HIGH | Industry standard libraries |
| **Progress Indicators** | ora, cli-progress npm packages + UX research | HIGH | Academic research + proven libraries |
| **Markdown Processing** | Glow, concat-md, merge-markdown tools | MEDIUM | Tools exist but niche use case |
| **Color Output** | Chalk official docs (25M+ weekly downloads) | HIGH | Dominant solution in ecosystem |
| **Configuration Management** | TechTarget, InfoQ, clig.dev best practices | HIGH | Enterprise + CLI-specific guidance |
| **Error Handling** | Multiple developer blogs + Microsoft Learn | MEDIUM | General patterns, not CLI-specific |
| **Preview/Dry-run** | rsync, semantic-release, CloudFormation examples | HIGH | Widespread pattern across major tools |
| **Versioning** | Semantic Versioning spec, semantic-release | HIGH | Official specification + automation tools |

### Coverage Gaps

**Areas with LOW Confidence:**
- **Skill compression techniques:** No existing tools compress markdown for LLM consumption - will need experimentation
- **Claude-specific token optimization:** Limited public research on embedding strategies for Claude
- **Multi-file skill resolution:** Nested skill patterns are project-specific, need real-world testing

**Unresolved Questions:**
1. Optimal size for embedded CLAUDE.md files (token count threshold)?
2. Best way to handle skill updates when source changes?
3. Should embedded content be minified or human-readable?
4. How to detect conflicts between user content and embedded sections?

**Next Steps for Validation:**
- Build MVP and test with real Claude Code skills
- Measure Claude response time with varying CLAUDE.md sizes
- Survey Claude Code users about skill embedding preferences
- Test with complex nested skills to validate concatenation logic

## Sources

### CLI Tools & Best Practices
- [7 Modern CLI Tools You Must Try in 2026](https://medium.com/the-software-journal/7-modern-cli-tools-you-must-try-in-2026-c4ecab6a9928)
- [17 Modern CLI Tools You Should Try in 2026](https://blog.stackademic.com/17-modern-cli-tools-you-should-try-in-2026-theyll-change-how-you-work-621d75d4e149)
- [Command Line Interface Guidelines](https://clig.dev/)
- [CLI UX Best Practices: Progress Displays](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)

### Bundlers & Build Tools
- [Vite vs Webpack in 2026](https://dev.to/pockit_tools/vite-vs-webpack-in-2026-a-complete-migration-guide-and-deep-performance-analysis-5ej5)
- [JavaScript Bundlers Comparison 2025](https://www.landskill.com/blog/javascript-bundlers-transpilers-25/)
- [Beyond Webpack: esbuild, Vite, Rollup, SWC](https://medium.com/ekino-france/beyond-webpack-esbuild-vite-rollup-swc-and-snowpack-97911a7175cf)
- [Vite Official Documentation](https://vite.dev/guide/why)

### Interactive CLI Libraries
- [Inquirer.js GitHub](https://github.com/SBoudrias/Inquirer.js)
- [Commander.js Guide](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/)
- [How to Create Interactive Command-line Prompts](https://www.digitalocean.com/community/tutorials/nodejs-interactive-command-line-prompts)

### Progress Indicators & Styling
- [ora vs cli-spinners vs progress comparison](https://npm-compare.com/cli-progress,cli-spinners,ora,progress)
- [Chalk GitHub](https://github.com/chalk/chalk)
- [How to use NPM Chalk](https://geshan.com.np/blog/2022/10/npm-chalk/)

### Configuration & Error Handling
- [8 Best Practices for Configuration File Management](https://www.techtarget.com/searchdatacenter/tip/Best-practices-for-configuration-file-management)
- [5 Configuration Management Best Practices](https://www.infoq.com/articles/5-config-mgmt-best-practices/)
- [Error Handling Guidelines](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-error-handling-guidelines)

### Preview & Dry-Run Features
- [CLI Tools That Support Dry Runs](https://nickjanetakis.com/blog/cli-tools-that-support-previews-dry-runs-or-non-destructive-actions)
- [semantic-release Configuration](https://semantic-release.gitbook.io/semantic-release/usage/configuration)

### Versioning
- [Semantic Versioning 2.0.0](https://semver.org/)
- [semantic-release GitHub](https://github.com/semantic-release/semantic-release)
- [Semantic Versioning: Securing Software Evolution](https://edana.ch/en/2026/01/17/semantic-versioning-a-key-tool-to-secure-your-software-evolution/)

### Markdown Processing Tools
- [Glow - Render Markdown on CLI](https://github.com/charmbracelet/glow)
- [concat-md npm package](https://www.npmjs.com/package/concat-md)
- [merge-markdown GitHub](https://github.com/knennigtri/merge-markdown)
- [MarkdownTools (mdmerge)](https://github.com/JeNeSuisPasDave/MarkdownTools)

### AI CLI Coding Agents
- [Top 5 CLI Coding Agents in 2026](https://dev.to/lightningdev123/top-5-cli-coding-agents-in-2026-3pia)
- [Agentic CLI Tools Compared](https://research.aimultiple.com/agentic-cli/)
- [7 Best CLI AI Coding Agents in 2026](https://www.scriptbyai.com/best-cli-ai-coding-agents/)

---
*Feature research for: CLI Developer Tools - Compilation/Embedding/Bundling*
*Researched: 2026-01-30*
