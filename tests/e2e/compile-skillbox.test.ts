import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtemp, rm, readFile, mkdir, cp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Heading } from 'mdast';
import { discoverSkills } from '../../src/discovery/skill-discovery.js';
import { parseSkillFile } from '../../src/parser/skill-parser.js';
import { mergeEmbeddedContent } from '../../src/embedding/content-merger.js';
import type { ParsedSkill } from '../../src/types/index.js';

describe('compile skillbox into OUTPUT.md', () => {
  let tmpDir: string;
  let workDir: string;
  let outputPath: string;
  let backupDir: string;

  beforeAll(async () => {
    // Create temp directory
    tmpDir = await mkdtemp(join(tmpdir(), 'agent-compiler-test-'));
    workDir = join(tmpDir, 'project');
    outputPath = join(workDir, 'OUTPUT.md');
    backupDir = join(tmpDir, 'backups');

    // Clone skillbox repo (shallow)
    const cloneDir = join(tmpDir, 'skillbox');
    execSync(`git clone --depth 1 https://github.com/AntJanus/skillbox "${cloneDir}"`, {
      stdio: 'pipe',
      timeout: 30_000,
    });

    // Set up project structure matching discovery expectations:
    // workDir/.claude/skills/<skill-name>/SKILL.md
    const skillsDir = join(workDir, '.claude', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });

    // Copy skills from cloned repo into project skills dir
    await cp(join(cloneDir, 'skills'), skillsDir, { recursive: true });
  });

  afterAll(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('discovers, parses, and compiles all skillbox skills into OUTPUT.md', async () => {
    // Step 1: Discover skills
    const discovered = await discoverSkills({
      cwd: workDir,
      includeGlobal: false,
      includeProject: true,
    });

    expect(discovered.length).toBeGreaterThanOrEqual(5);

    // Step 2: Parse each skill
    const skills: ParsedSkill[] = [];
    for (const file of discovered) {
      const content = await readFile(file.path, 'utf8');
      const parsed = parseSkillFile(file.path, content);
      skills.push({
        path: file.path,
        location: file.location,
        metadata: parsed.metadata,
        content: parsed.content,
        referencedFiles: [],
      });
    }

    // Verify all skills parsed with names
    const skillNames = skills.map((s) => s.metadata.name);
    expect(skillNames.every((n) => n.length > 0)).toBe(true);

    // Step 3: Merge into OUTPUT.md
    const result = await mergeEmbeddedContent({
      targetPath: outputPath,
      skills,
      commands: [],
      backupDir,
    });

    expect(result.success).toBe(true);
    expect(result.created).toBe(true);

    // Step 4: Read and assert on OUTPUT.md
    const output = await readFile(outputPath, 'utf8');

    // Contains SKILLS section header
    expect(output).toContain('## SKILLS');

    // Contains a subsection for each discovered skill
    for (const name of skillNames) {
      expect(output).toContain(`### ${name}`);
    }

    // No h1 markdown headings inside skill content (heading transformer should have shifted them)
    // Use remark to parse the AST so we only check actual headings, not # in code blocks
    const afterSkillsHeader = output.split('## SKILLS')[1] ?? '';
    const tree = unified().use(remarkParse).parse(afterSkillsHeader);
    const h1Headings: Heading[] = [];
    visit(tree, 'heading', (node: Heading) => {
      if (node.depth === 1) {
        h1Headings.push(node);
      }
    });
    expect(h1Headings).toHaveLength(0);

    // Content is non-trivial
    expect(output.length).toBeGreaterThan(500);
  });
});
