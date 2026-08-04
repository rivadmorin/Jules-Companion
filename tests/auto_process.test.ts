import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { saveSessions } from '../scripts/utils';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_autoprocess');

describe('Auto Process Unit Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('auto_process.js should exit cleanly when no sessions file exists', async () => {
    const { spawnSync } = await import('child_process');
    const res = spawnSync('node', [path.join(process.cwd(), 'dist', 'auto_process.js'), '--all'], {
      cwd: TEST_DIR,
      env: { ...process.env, JULES_API_KEY: 'mock_key' },
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('No registered sessions found'));
  });

  test('auto_process.js should handle empty sessions list gracefully', async () => {
    saveSessions([], TEST_DIR);
    const { spawnSync } = await import('child_process');
    const res = spawnSync('node', [path.join(process.cwd(), 'dist', 'auto_process.js'), '--all'], {
      cwd: TEST_DIR,
      env: { ...process.env, JULES_API_KEY: 'mock_key' },
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('No registered sessions found'));
  });
});
