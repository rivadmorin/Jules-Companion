import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { runGit } from '../scripts/utils';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_deploy');

describe('Deploy Session Unit Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Init git repository with remote origin for deployment checks
    runGit(['init'], TEST_DIR);
    runGit(['config', 'user.name', 'Test User'], TEST_DIR);
    runGit(['config', 'user.email', 'test@example.com'], TEST_DIR);
    runGit(['remote', 'add', 'origin', 'https://github.com/rivadmorin/Jules-Companion.git'], TEST_DIR);
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('deploy_session.js should display usage help when missing arguments', async () => {
    const { spawnSync } = await import('child_process');
    const res = spawnSync('node', ['dist/deploy_session.js'], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    assert.notStrictEqual(res.status, 0);
    assert.ok(res.stdout.includes('Jules Session Deployment Helper') || res.stderr.includes('Usage'));
  });

  test('deploy_session.js should reject invalid mode options', async () => {
    const { spawnSync } = await import('child_process');
    const res = spawnSync('node', ['dist/deploy_session.js', '--type', 'start', '--agents', 'bolt', '--task', 'test', '--mode', 'invalid_mode'], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    assert.notStrictEqual(res.status, 0);
    assert.ok(res.stderr.includes("Invalid mode 'invalid_mode'"));
  });

  test('deploy_session.js should reject invalid agent names', async () => {
    const { spawnSync } = await import('child_process');
    const res = spawnSync('node', ['dist/deploy_session.js', '--type', 'start', '--agents', 'fake_agent_123', '--task', 'test'], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    assert.notStrictEqual(res.status, 0);
    assert.ok(res.stderr.includes("Invalid agent name(s) specified: fake_agent_123"));
  });
});
