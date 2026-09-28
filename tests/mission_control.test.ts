import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { renderMissionControlHtml } from '../scripts/ui/mission_control';

describe('Mission Control Webview Renderer Unit Tests', () => {
  const mockSession = {
    id: 'sess-mc-12345678',
    agent: 'architect',
    status: 'AWAITING_PLAN_APPROVAL',
    branch: 'feature/refactor',
    task: 'Refactor database connection pooling'
  };

  const mockActivities = [
    {
      createTime: '2026-09-28T04:00:00Z',
      planGenerated: {
        plan: {
          steps: [
            { index: 1, title: 'Analyze existing pool implementation' },
            { index: 2, title: 'Introduce async connection manager' },
            { index: 3, title: 'Run integration test suite' }
          ]
        }
      }
    },
    {
      createTime: '2026-09-28T04:05:00Z',
      artifacts: [
        {
          bashOutput: {
            command: 'npm run test:pool',
            stdout: 'PASS tests/pool.test.ts (24 tests)'
          }
        }
      ]
    }
  ];

  test('should render session headers and status badges', () => {
    const html = renderMissionControlHtml(mockSession, mockActivities);
    assert.ok(html.includes('#sess-mc-12345678'));
    assert.ok(html.includes('Agent: architect'));
    assert.ok(html.includes('Branch: feature/refactor'));
    assert.ok(html.includes('Refactor database connection pooling'));
  });

  test('should render plan approval banner when status is AWAITING_PLAN_APPROVAL', () => {
    const html = renderMissionControlHtml(mockSession, mockActivities);
    assert.ok(html.includes('Plan Approval Required'));
    assert.ok(html.includes('Approve Plan Now'));
    assert.ok(!html.includes('User Response Required'));
  });

  test('should render user response banner and NOT plan approval when status is AWAITING_USER_INPUT', () => {
    const inputSession = {
      ...mockSession,
      status: 'AWAITING_USER_INPUT'
    };
    const html = renderMissionControlHtml(inputSession, mockActivities);
    assert.ok(html.includes('User Response Required'));
    assert.ok(html.includes('Reply to Jules'));
    assert.ok(!html.includes('Plan Approval Required'));
    assert.ok(!html.includes('Approve Plan Now'));
    assert.ok(html.includes('Awaiting User Response'));
  });

  test('should render plan steps and command outputs', () => {
    const html = renderMissionControlHtml(mockSession, mockActivities);
    assert.ok(html.includes('Analyze existing pool implementation'));
    assert.ok(html.includes('Introduce async connection manager'));
    assert.ok(html.includes('npm run test:pool'));
    assert.ok(html.includes('PASS tests/pool.test.ts'));
  });

  test('should render conversation history and direct messages', () => {
    const activitiesWithChat = [
      ...mockActivities,
      {
        createTime: '2026-09-28T04:10:00Z',
        agentMessaged: { agentMessage: 'Do you want to proceed with redis pooling?' }
      },
      {
        createTime: '2026-09-28T04:12:00Z',
        userMessaged: { userMessage: 'Yes, please proceed with redis pooling.' }
      }
    ];

    const html = renderMissionControlHtml(mockSession, activitiesWithChat);
    assert.ok(html.includes('Do you want to proceed with redis pooling?'));
    assert.ok(html.includes('Yes, please proceed with redis pooling.'));
    assert.ok(html.includes('👤 You (User)'));
    assert.ok(html.includes('🤖 architect'));
  });

  test('should use data-action event delegation and avoid inline onclick', () => {
    const html = renderMissionControlHtml(mockSession, mockActivities);
    assert.ok(html.includes('data-action="visualDiff"'));
    assert.ok(html.includes('data-action="checkoutBranch"'));
    assert.ok(html.includes('data-action="mergeSession"'));
    assert.ok(html.includes('data-action="createPR"'));
    assert.ok(html.includes('data-action="sendFollowUp"'));
    assert.ok(!html.includes('onclick='));
  });

  test('should render code changeset artifacts when present', () => {
    const activitiesWithChangeset = [
      ...mockActivities,
      {
        createTime: '2026-09-28T04:20:00Z',
        artifacts: [
          {
            changeSet: {
              gitPatch: {
                suggestedCommitMessage: 'feat: implement connection pooling',
                unidiffPatch: 'diff --git a/src/pool.ts b/src/pool.ts\n--- a/src/pool.ts\n+++ b/src/pool.ts\n@@ -1 +1,2 @@\n-old\n+new'
              }
            }
          }
        ]
      }
    ];

    const html = renderMissionControlHtml(mockSession, activitiesWithChangeset);
    assert.ok(html.includes('feat: implement connection pooling'));
    assert.ok(html.includes('src/pool.ts'));
  });
});

