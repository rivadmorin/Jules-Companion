import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { runGit, saveSessions } from '../scripts/utils';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_merge');

describe('Merge Session Unit Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    runGit(['init'], TEST_DIR);
    runGit(['config', 'user.name', 'Test User'], TEST_DIR);
    runGit(['config', 'user.email', 'test@example.com'], TEST_DIR);
    fs.writeFileSync(path.join(TEST_DIR, 'file.txt'), 'base content');
    runGit(['add', '.'], TEST_DIR);
    runGit(['commit', '-m', 'Initial commit'], TEST_DIR);
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('rollbackSession should reset uncommitted changes cleanly', async () => {
    const { rollbackSession } = await import('../scripts/merge_session');
    fs.writeFileSync(path.join(TEST_DIR, 'file.txt'), 'modified content');

    const res = await rollbackSession(undefined, TEST_DIR);
    assert.ok(res.includes('reset to clean state') || res.includes('popped and restored'));

    const content = fs.readFileSync(path.join(TEST_DIR, 'file.txt'), 'utf8');
    assert.strictEqual(content, 'base content');
  });

  test('checkSafetyGate should pass if no active sessions exist', async () => {
    const { checkSafetyGate } = await import('../scripts/merge_session');
    saveSessions([], TEST_DIR);
    const pass = await checkSafetyGate({});
    assert.strictEqual(pass, true);
  });
});
