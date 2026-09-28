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

  test('getDefaultRemoteBranch should detect default remote branch cleanly', async () => {
    const { getDefaultRemoteBranch } = await import('../scripts/deploy_session');
    const branch = getDefaultRemoteBranch();
    assert.strictEqual(typeof branch, 'string');
    assert.ok(branch.length > 0);
    assert.strictEqual(branch, 'main');
  });

  test('isBranchOnRemote should accurately identify existing vs non-existent remote branches', async () => {
    const { isBranchOnRemote } = await import('../scripts/deploy_session');
    assert.strictEqual(isBranchOnRemote('main'), true);
    assert.strictEqual(isBranchOnRemote('jules/inspector-214731-nonexistent'), false);
  });

  test('deploySessionCore should reject explicitly requested branch that is not on remote origin', async () => {
    const { deploySessionCore } = await import('../scripts/deploy_session');
    const res = await deploySessionCore({
      type: 'start',
      agents: 'bolt',
      task: 'test task',
      branch: 'nonexistent-branch-12345'
    });

    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes("Branch 'nonexistent-branch-12345' was not found on remote origin"));
  });
});
