import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { runGit } from '../scripts/utils';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_setup');

describe('Setup Workspace Unit Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    runGit(['init'], TEST_DIR);
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('setup.js should scaffold staging directory structure', async () => {
    const { spawnSync } = await import('child_process');
    const res = spawnSync('node', [path.join(process.cwd(), 'dist', 'setup.js')], {
      cwd: TEST_DIR,
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0);
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.jules-companion')));
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'docs', 'jules-reviews')));
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.gitignore')));
  });
});
