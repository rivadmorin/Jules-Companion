import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { runGit, loadSessions, saveSessions, SessionRecord, getProjectDirs } from '../scripts/utils';
import { spawnSync } from 'child_process';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir');

describe('Utils Tests (Real Execution)', () => {
  before(() => {
    // Setup temporary directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    // Cleanup temporary directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('runGit', () => {
    test('should initialize a git repository', () => {
      const resInit = runGit(['init'], TEST_DIR);
      assert.strictEqual(resInit.success, true);
      assert.ok(fs.existsSync(path.join(TEST_DIR, '.git')), '.git directory should exist');

      // Setup minimal git config for commit
      runGit(['config', 'user.name', 'Test User'], TEST_DIR);
      runGit(['config', 'user.email', 'test@example.com'], TEST_DIR);

      fs.writeFileSync(path.join(TEST_DIR, 'test.txt'), 'hello world');
      runGit(['add', 'test.txt'], TEST_DIR);
      const resCommit = runGit(['commit', '-m', 'Initial commit'], TEST_DIR);

      assert.strictEqual(resCommit.success, true);
      assert.ok(resCommit.stdout.includes('Initial commit') || resCommit.stderr.includes('Initial commit') || resCommit.stdout.includes('create mode'), 'Should show commit successful');
    });

    test('should fail gracefully on invalid git command', () => {
      const res = runGit(['invalid-command-123'], TEST_DIR);
      assert.strictEqual(res.success, false);
      assert.ok(res.stderr.includes('invalid-command-123') || res.stdout.includes('invalid-command-123') || res.stderr.includes('is not a git command'), 'Should report invalid command error');
    });
  });

  describe('Session Management', () => {
    test('loadSessions should return empty array if no sessions file exists', () => {
       const sessions = loadSessions(TEST_DIR);
       assert.deepStrictEqual(sessions, []);
    });

    test('saveSessions and loadSessions should work correctly', () => {
      const mockSessions: SessionRecord[] = [
        {
          id: 'test-123',
          agent: 'bolt',
          mode: 'code',
          task: 'optimize test',
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      ];

      saveSessions(mockSessions, TEST_DIR);

      const dirs = getProjectDirs(TEST_DIR);
      assert.ok(fs.existsSync(path.join(dirs.julesDir, 'sessions.json')), 'sessions.json should be created');

      const loadedSessions = loadSessions(TEST_DIR);
      assert.deepStrictEqual(loadedSessions, mockSessions);
    });
  });
});
