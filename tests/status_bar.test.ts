import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { JulesStatusBar } from '../scripts/ui/status_bar';
import { SessionRecord } from '../scripts/core/types';

describe('JulesStatusBar Unit Tests', () => {
  test('should provide a valid singleton instance', () => {
    const inst1 = JulesStatusBar.getInstance();
    const inst2 = JulesStatusBar.getInstance();
    assert.ok(inst1);
    assert.strictEqual(inst1, inst2);
  });

  test('should prioritize Awaiting Plan Approval state over running sessions', () => {
    const bar = JulesStatusBar.getInstance();
    const sessions: SessionRecord[] = [
      {
        id: 'sess-running-12345678',
        agent: 'architect',
        mode: 'code',
        task: 'Building database schema',
        status: 'IN_PROGRESS',
        timestamp: new Date().toISOString()
      },
      {
        id: 'sess-plan-87654321',
        agent: 'sentinel',
        mode: 'code',
        task: 'Security review plan',
        status: 'AWAITING_PLAN_APPROVAL',
        timestamp: new Date().toISOString()
      }
    ];

    bar.update(sessions);
    const item = (bar as any).statusBarItem;
    assert.ok(item.text.includes('Plan Approval Needed'));
  });

  test('should show Input Needed when session is awaiting response', () => {
    const bar = JulesStatusBar.getInstance();
    const sessions: SessionRecord[] = [
      {
        id: 'sess-input-12345678',
        agent: 'debugger',
        mode: 'code',
        task: 'Resolve memory leak',
        status: 'AWAITING_USER_FEEDBACK',
        timestamp: new Date().toISOString()
      }
    ];

    bar.update(sessions);
    const item = (bar as any).statusBarItem;
    assert.ok(item.text.includes('Input Needed'));
  });

  test('should show Running state with spinner when active session exists', () => {
    const bar = JulesStatusBar.getInstance();
    const sessions: SessionRecord[] = [
      {
        id: 'sess-run-12345678',
        agent: 'coder',
        mode: 'code',
        task: 'Implement auth',
        status: 'RUNNING',
        timestamp: new Date().toISOString()
      }
    ];

    bar.update(sessions);
    const item = (bar as any).statusBarItem;
    assert.ok(item.text.includes('sync~spin'));
    assert.ok(item.text.includes('sess-run'));
  });

  test('should show Idle state when no sessions are active', () => {
    const bar = JulesStatusBar.getInstance();
    bar.update([]);
    const item = (bar as any).statusBarItem;
    assert.strictEqual(item.text, '$(source-control) Jules');
  });
});
