import { discoverAll, discoverSkills, discoverCommands } from './dist/discovery/index.js';

// Test all exports available
console.log('Testing exports...');
console.log('discoverSkills:', typeof discoverSkills);
console.log('discoverCommands:', typeof discoverCommands);
console.log('discoverAll:', typeof discoverAll);

// Test discoverAll function
const result = await discoverAll({
  cwd: '/tmp/test-project',
  includeGlobalSkills: false
});

console.log('\nDiscovery result:', JSON.stringify(result, null, 2));

if (result.skills.length > 0 && result.commands.length > 0) {
  console.log('✓ Task 3 verification passed - all exports work, discoverAll found both skills and commands');
  process.exit(0);
} else {
  console.log('✗ Task 3 verification failed');
  process.exit(1);
}
