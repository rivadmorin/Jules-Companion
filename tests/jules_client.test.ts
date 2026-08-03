import { test, describe, before, beforeEach, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const TEST_DIR = path.join(process.cwd(), 'temp_client_dir');
const DIST_DIR = path.join(process.cwd(), 'dist');

describe('Jules Client Integration Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  beforeEach(() => {
    const julesCompanionDir = path.join(TEST_DIR, '.jules-companion');
    if (fs.existsSync(julesCompanionDir)) {
      fs.rmSync(julesCompanionDir, { recursive: true, force: true });
    }
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('jules_client.js should fail when API key is missing', () => {
    const res = spawnSync('node', [path.join(DIST_DIR, 'jules_client.js'), 'list'], {
      cwd: TEST_DIR,
      env: { ...process.env, JULES_API_KEY: '' }, // Ensure API key is cleared
      encoding: 'utf8'
    });

    assert.notStrictEqual(res.status, 0, 'Should exit with non-zero status');
    assert.ok(res.stderr.includes('JULES_API_KEY not found'), 'Should log missing API key error');
  });

  test('jules_client.js list should handle empty sessions gracefully', () => {
    const res = spawnSync('node', [path.join(DIST_DIR, 'jules_client.js'), 'list'], {
      cwd: TEST_DIR,
      env: { ...process.env, JULES_API_KEY: 'mock_key' },
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0, 'Should exit successfully');
    assert.ok(res.stdout.includes('No registered sessions found'), 'Should report no sessions');
  });

  test('jules_client.js list --json should output valid JSON', () => {
    // Create a mock sessions.json file
    const julesCompanionDir = path.join(TEST_DIR, '.jules-companion');
    fs.mkdirSync(julesCompanionDir, { recursive: true });
    fs.writeFileSync(
        path.join(julesCompanionDir, 'sessions.json'),
        JSON.stringify([{ id: 'mock-session-123', agent: 'inspector' }]),
        'utf8'
    );

    const res = spawnSync('node', [path.join(DIST_DIR, 'jules_client.js'), 'list', '--json'], {
      cwd: TEST_DIR,
      env: { ...process.env, JULES_API_KEY: 'mock_key' },
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0, 'Should exit successfully');

    try {
        const parsed = JSON.parse(res.stdout);
        assert.ok(Array.isArray(parsed), 'Output should be a JSON array');
        assert.strictEqual(parsed.length, 1, 'Should have one session');
        assert.strictEqual(parsed[0].id, 'mock-session-123', 'Session ID should match');
    } catch (err) {
        assert.fail('Output was not valid JSON: ' + res.stdout);
    }
  });
});
