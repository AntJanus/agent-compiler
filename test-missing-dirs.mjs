import { discoverAll } from './dist/discovery/index.js';

// Test on a directory with no .claude folder
const result = await discoverAll({
  cwd: '/tmp/empty-test-project-xyz',
  includeGlobalSkills: false
});

console.log('Discovery result on missing directory:', JSON.stringify(result, null, 2));

if (result.skills.length === 0 && result.commands.length === 0) {
  console.log('✓ Missing directory handling passed - returned empty arrays without errors');
  process.exit(0);
} else {
  console.log('✗ Unexpected results from missing directory');
  process.exit(1);
}
