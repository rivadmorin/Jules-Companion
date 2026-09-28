const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.resolve(__dirname, '../tests');
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.ts'))
  .sort()
  .map(f => path.join('tests', f));

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCmd, ['tsx', '--test', '--test-concurrency=1', ...testFiles], {
  stdio: 'inherit',
  shell: true
});

process.exit(result.status !== null ? result.status : 1);
