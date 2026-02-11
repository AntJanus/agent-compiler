import { readFile } from 'fs/promises';
import { splitContent } from './section-extractor.js';
import { generateSkillsSection, generateCommandsSection } from './section-generator.js';
import { generateTemplate } from './template-generator.js';
import { safeWrite } from '../file-safety/safe-writer.js';
import { atomicWrite } from '../file-safety/atomic-writer.js';
import { generateContentHash } from '../file-safety/hash-generator.js';
import type { ParsedSkill, ParsedCommand } from '../types/index.js';

/**
 * Options for merging embedded content into target file
 */
export interface MergeOptions {
  /** Path to target file (CLAUDE.md or AGENTS.md) */
  targetPath: string;
  /** Parsed skills to embed */
  skills: ParsedSkill[];
  /** Parsed commands to embed */
  commands: ParsedCommand[];
  /** Directory for backups */
  backupDir: string;
}

/**
 * Result of merge operation
 */
export interface MergeResult {
  /** Whether operation succeeded */
  success: boolean;
  /** True if write skipped due to identical content */
  skipped: boolean;
  /** Path to backup if created */
  backupPath?: string;
  /** Whether file was newly created */
  created: boolean;
  /** User content hash for audit */
  userContentHash: string;
}

/**
 * Normalize content for idempotency comparison
 * - Trim whitespace
 * - Normalize line endings to \n
 * - Collapse 3+ consecutive blank lines to 2
 */
function normalizeForComparison(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Merge embedded content into target file with idempotency and validation.
 *
 * Flow:
 * 1. Read or create content (use template if file doesn't exist)
 * 2. Split content to extract user content and embedded sections
 * 3. Generate new embedded sections from skills/commands
 * 4. Assemble merged content (user content + separator + embedded sections)
 * 5. Check idempotency (skip write if content identical)
 * 6. Write with safeWrite (backup + atomic write + validation)
 * 7. Validate user content preserved (hash comparison)
 *
 * @param options - MergeOptions with target path, skills, commands, and backup directory
 * @returns MergeResult with success status, paths, and metadata
 * @throws Error if file read fails (except ENOENT)
 * @throws Error if user content validation fails after write
 * @throws Error if safeWrite fails
 */
export async function mergeEmbeddedContent(options: MergeOptions): Promise<MergeResult> {
  const { targetPath, skills, commands, backupDir } = options;

  // Step 1: Read or create content
  let existingContent: string;
  let created = false;

  try {
    existingContent = await readFile(targetPath, 'utf8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - generate template
      const includeSkills = skills.length > 0;
      const includeCommands = commands.length > 0;
      existingContent = generateTemplate({ includeSkills, includeCommands });
      created = true;
    } else {
      // Other read error - rethrow with context
      throw new Error(`Failed to read target file ${targetPath}: ${error.message}`);
    }
  }

  // Step 2: Split content to extract user content
  const split = splitContent(existingContent);
  const userContentHash = split.userContentHash;

  // Step 3: Generate new embedded sections
  const skillsSection = await generateSkillsSection(skills);
  const commandsSection = await generateCommandsSection(commands);

  // Step 4: Assemble merged content
  const parts: string[] = [];

  // Add user content
  if (split.userContent) {
    parts.push(split.userContent.trim());
    parts.push(''); // Blank line after user content
  }

  // Add separator (only if user content doesn't already end with one)
  const userContentEndsWithSeparator = split.userContent.trim().endsWith('---');
  if (!userContentEndsWithSeparator) {
    parts.push('---');
    parts.push(''); // Blank line after separator
  }

  // Add skills section
  if (skillsSection) {
    parts.push(skillsSection);
  }

  // Add blank line between sections if both exist
  if (skillsSection && commandsSection) {
    parts.push(''); // Blank line between sections
  }

  // Add commands section
  if (commandsSection) {
    parts.push(commandsSection);
  }

  const mergedContent = parts.join('\n').trim();

  // Step 5: Check idempotency
  // If file exists and content is identical, skip write
  if (!created) {
    const normalizedExisting = normalizeForComparison(existingContent);
    const normalizedNew = normalizeForComparison(mergedContent);

    const existingHash = generateContentHash(normalizedExisting);
    const newHash = generateContentHash(normalizedNew);

    if (existingHash === newHash) {
      // Content identical - skip write
      return {
        success: true,
        skipped: true,
        created: false,
        userContentHash,
      };
    }
  }

  // Step 6: Write with appropriate method
  // For new files: use atomicWrite (nothing to backup)
  // For existing files: use safeWrite (backup + atomic write + validation)
  let backupPath: string | undefined;

  if (created) {
    // New file - use atomicWrite directly
    await atomicWrite(targetPath, mergedContent);
  } else {
    // Existing file - use safeWrite for backup + validation
    const writeResult = await safeWrite(targetPath, mergedContent, {
      backupDir,
      validate: true,
    });

    if (!writeResult.success) {
      throw new Error(
        `Safe write failed for ${targetPath}. ` +
        `Backup available at: ${writeResult.backupPath}`
      );
    }

    backupPath = writeResult.backupPath;
  }

  // Step 7: Validate user content preserved (only for existing files)
  // This is a critical safety check - if our section detection has bugs,
  // this will catch them before user loses content
  // Skip for new files since there's no user content to preserve
  if (!created) {
    const writtenContent = await readFile(targetPath, 'utf8');
    const writtenSplit = splitContent(writtenContent);

    if (writtenSplit.userContentHash !== userContentHash) {
      const errorMsg = `CRITICAL: User content corrupted during merge.\n` +
        `Expected hash: ${userContentHash}\n` +
        `Actual hash: ${writtenSplit.userContentHash}\n`;

      throw new Error(
        errorMsg +
        `Backup available at: ${backupPath}\n` +
        `Restore with: cp "${backupPath}" "${targetPath}"`
      );
    }
  }

  // Success
  return {
    success: true,
    skipped: false,
    backupPath,
    created,
    userContentHash,
  };
}
