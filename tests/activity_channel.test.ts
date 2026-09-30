import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { JulesActivityChannel } from '../scripts/ui/activity_channel';

describe('JulesActivityChannel Unit Tests', () => {
  test('should provide a valid singleton instance', () => {
    const inst1 = JulesActivityChannel.getInstance();
    const inst2 = JulesActivityChannel.getInstance();
    assert.ok(inst1);
    assert.strictEqual(inst1, inst2);
  });

  test('should format planGenerated activity into readable milestone steps', () => {
    const channel = JulesActivityChannel.getInstance();
    const activity = {
      createTime: '2026-10-01T00:00:00Z',
      originator: 'AGENT',
      planGenerated: {
        plan: {
          steps: [
            { title: 'Setup database schema', description: 'Run migration scripts' },
            { title: 'Implement user endpoint' }
          ]
        }
      }
    };

    const formatted = channel.formatActivity(activity);
    assert.ok(formatted.includes('[PLAN_GENERATED]'));
    assert.ok(formatted.includes('Proposed execution plan with 2 step(s)'));
    assert.ok(formatted.includes('1. Setup database schema'));
    assert.ok(formatted.includes('Run migration scripts'));
    assert.ok(formatted.includes('2. Implement user endpoint'));
  });

  test('should format progressUpdated activity cleanly', () => {
    const channel = JulesActivityChannel.getInstance();
    const activity = {
      createTime: '2026-10-01T00:05:00Z',
      originator: 'AGENT',
      progressUpdated: {
        title: 'Step 1 complete',
        description: 'Migration executed cleanly'
      }
    };

    const formatted = channel.formatActivity(activity);
    assert.ok(formatted.includes('[PROGRESS]'));
    assert.ok(formatted.includes('Step 1 complete - Migration executed cleanly'));
  });

  test('should format user and agent chat messages', () => {
    const channel = JulesActivityChannel.getInstance();
    const userAct = {
      createTime: '2026-10-01T00:06:00Z',
      originator: 'USER',
      userMessage: { text: 'Please add unit tests as well.' }
    };
    const agentAct = {
      createTime: '2026-10-01T00:07:00Z',
      originator: 'AGENT',
      agentMessage: { text: 'Will do, updating test suite now.' }
    };

    const userFormatted = channel.formatActivity(userAct);
    assert.ok(userFormatted.includes('[USER] [MESSAGE] Please add unit tests as well.'));

    const agentFormatted = channel.formatActivity(agentAct);
    assert.ok(agentFormatted.includes('[AGENT] [MESSAGE] Will do, updating test suite now.'));
  });

  test('should format bash output artifacts and changesets', () => {
    const channel = JulesActivityChannel.getInstance();
    const bashAct = {
      createTime: '2026-10-01T00:08:00Z',
      artifacts: [
        {
          bashOutput: {
            command: 'npm run test',
            stdout: 'PASS 120 tests passed\n'
          }
        }
      ]
    };
    const patchAct = {
      createTime: '2026-10-01T00:09:00Z',
      artifacts: [
        {
          changeSet: {
            gitPatch: {
              suggestedCommitMessage: 'feat: add unit tests'
            }
          }
        }
      ]
    };

    const bashFormatted = channel.formatActivity(bashAct);
    assert.ok(bashFormatted.includes('[BASH] $ npm run test'));
    assert.ok(bashFormatted.includes('PASS 120 tests passed'));

    const patchFormatted = channel.formatActivity(patchAct);
    assert.ok(patchFormatted.includes('[CHANGESET] Patch ready: feat: add unit tests'));
  });
});
