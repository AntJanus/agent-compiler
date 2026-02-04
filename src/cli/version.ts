import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export async function showVersion(): Promise<void> {
  // Compute package.json path using ESM pattern
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const pkgPath = join(__dirname, '../../package.json');

  // Read and parse package.json
  const pkgContent = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);

  console.log(`v${pkg.version}`);
}
