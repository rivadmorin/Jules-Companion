import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const TEST_DIR = path.join(process.cwd(), 'temp_e2e_dir');
const DIST_DIR = path.join(process.cwd(), 'dist');

describe('E2E CLI Workflow', () => {
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

  test('setup.js should initialize workspace correctly', () => {
    const res = spawnSync('node', [path.join(DIST_DIR, 'setup.js')], { cwd: TEST_DIR, encoding: 'utf8' });

    assert.strictEqual(res.status, 0, 'setup.js should exit with 0');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.jules-companion')), '.jules-companion dir should exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.jules-companion', 'references', 'prompt-templates.md')), 'prompt-templates.md should exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'docs', 'jules-reviews')), 'docs/jules-reviews dir should exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.gitignore')), '.gitignore should be created or updated');

    const gitignoreContent = fs.readFileSync(path.join(TEST_DIR, '.gitignore'), 'utf8');
    assert.ok(gitignoreContent.includes('.jules-companion/'), '.gitignore should contain .jules-companion/');
  });

  test('deploy_session.js should log missing arguments properly when missing task/agents', () => {
    // Run with missing arguments to check validation
    const res = spawnSync('node', [
        path.join(DIST_DIR, 'deploy_session.js'),
        '--type', 'start',
        // missing --agents and --task
    ], { cwd: TEST_DIR, encoding: 'utf8' });

    assert.notStrictEqual(res.status, 0, 'Should fail without required arguments');
    assert.ok(res.stderr.includes('agents') || res.stdout.includes('agents'), 'Should mention missing agents');
  });

  test('deploy_session.js with valid local arguments should initialize session JSON (simulate offline)', () => {
      // In this E2E, we test the local JSON writing part of deploy_session to ensure the script
      // boots up, validates arguments, and touches our session.json

      const res = spawnSync('node', [
        path.join(DIST_DIR, 'deploy_session.js'),
        '--type', 'start',
        '--agents', 'bolt',
        '--task', 'e2e test task',
        '--mode', 'code'
      ], {
          cwd: TEST_DIR,
          env: { ...process.env, JULES_API_KEY: 'mock_key_for_test' },
          encoding: 'utf8'
      });

      const sessionsPath = path.join(TEST_DIR, '.jules-companion', 'sessions.json');
      assert.ok(fs.existsSync(sessionsPath), 'sessions.json should be created after running deploy_session');
  });

});
