import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { runGit, saveSessions, SessionRecord } from '../scripts/utils';
import { rollbackSession, checkSafetyGate } from '../scripts/merge_session';

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
    fs.writeFileSync(path.join(TEST_DIR, 'file.txt'), 'modified content');

    const res = await rollbackSession(undefined, TEST_DIR);
    assert.ok(res.includes('reset to clean state') || res.includes('popped and restored'));

    const content = fs.readFileSync(path.join(TEST_DIR, 'file.txt'), 'utf8');
    assert.strictEqual(content, 'base content');
  });

  test('checkSafetyGate should pass immediately if no sessions exist', async () => {
    saveSessions([], TEST_DIR);
    const pass = await checkSafetyGate({}, TEST_DIR);
    assert.strictEqual(pass, true, 'Safety gate must pass when sessions store is empty');
  });

  test('checkSafetyGate should pass if all sessions are in terminal states', async () => {
    const terminalSessions: SessionRecord[] = [
      {
        id: 'sess-1',
        agent: 'bolt',
        mode: 'code',
        task: 'completed task',
        status: 'completed',
        timestamp: new Date().toISOString()
      },
      {
        id: 'sess-2',
        agent: 'sentinel',
        mode: 'review',
        task: 'merged task',
        status: 'merged',
        timestamp: new Date().toISOString()
      }
    ];
    saveSessions(terminalSessions, TEST_DIR);
    const passed = await checkSafetyGate({}, TEST_DIR);
    assert.strictEqual(passed, true, 'Safety gate must pass when all sessions are terminal');
  });

  test('checkSafetyGate should fail safe (return false) when active session cannot be verified', async () => {
    const activeSessions: SessionRecord[] = [
      {
        id: 'sess-active-mock',
        agent: 'inspector',
        mode: 'code',
        task: 'running task',
        status: 'launched',
        timestamp: new Date().toISOString()
      }
    ];
    saveSessions(activeSessions, TEST_DIR);
    const passed = await checkSafetyGate({ 'X-Goog-Api-Key': 'mock-invalid-key' }, TEST_DIR);
    assert.strictEqual(passed, false, 'Safety gate must block merge when an active session cannot be remotely verified');
  });
});
