import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { runGit } from '../scripts/utils';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_menu');

describe('Jules Menu CLI Unit Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    runGit(['init'], TEST_DIR);
    runGit(['config', 'user.name', 'Test User'], TEST_DIR);
    runGit(['config', 'user.email', 'test@example.com'], TEST_DIR);
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('jules_menu.js without arguments should output CLI discovery JSON metadata', () => {
    const res = spawnSync('node', [path.join(process.cwd(), 'dist', 'jules_menu.js')], {
      cwd: TEST_DIR,
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0);
    try {
      const parsed = JSON.parse(res.stdout);
      assert.strictEqual(parsed.name, 'Jules Companion AI Interface');
      assert.ok(parsed.commands);
      assert.ok(parsed.commands['--deploy']);
    } catch (err) {
      assert.fail('Output was not valid JSON: ' + res.stdout);
    }
  });

  test('jules_menu.js --monitor should check session status cleanly', () => {
    const res = spawnSync('node', [path.join(process.cwd(), 'dist', 'jules_menu.js'), '--monitor'], {
      cwd: TEST_DIR,
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('No active sessions found') || res.stdout.includes('Checking active sessions'));
  });

  test('jules_menu.js --setup should run setup cleanly', () => {
    const res = spawnSync('node', [path.join(process.cwd(), 'dist', 'jules_menu.js'), '--setup'], {
      cwd: TEST_DIR,
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0);
    assert.ok(res.stdout.includes('success') || res.stdout.includes('setup'));
  });
});
