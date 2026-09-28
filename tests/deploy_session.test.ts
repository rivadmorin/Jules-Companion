import { test, describe } from 'node:test';
import * as assert from 'node:assert';

describe('Deploy Session Unit Tests', () => {

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
