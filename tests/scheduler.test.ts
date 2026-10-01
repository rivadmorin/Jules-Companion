import { test, describe, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadScheduledTasks,
  saveScheduledTasks,
  addScheduledTask,
  cancelScheduledTask,
  deleteScheduledTask,
  getDueScheduledTasks,
  executeDueTasks,
  runScheduledTaskNow,
  setTaskExecutor,
  TaskExecutor
} from '../scripts/core/scheduler';

describe('Jules Task Scheduler Unit Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jules-scheduler-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('loadScheduledTasks should return empty array when no schedules file exists', () => {
    const tasks = loadScheduledTasks(tempDir);
    assert.deepStrictEqual(tasks, []);
  });

  test('addScheduledTask should persist new task with pending status and valid ID', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    const created = addScheduledTask(
      {
        agent: 'architect',
        mode: 'code',
        type: 'start',
        task: 'Refactor database models',
        scheduledAt: futureDate
      },
      tempDir
    );

    assert.ok(created.id.startsWith('sched-'));
    assert.strictEqual(created.agent, 'architect');
    assert.strictEqual(created.status, 'pending');
    assert.strictEqual(created.task, 'Refactor database models');
    assert.strictEqual(created.scheduledAt, futureDate);

    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].id, created.id);
  });

  test('cancelScheduledTask should mark pending task as cancelled', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    const task = addScheduledTask(
      {
        agent: 'security',
        mode: 'code',
        type: 'start',
        task: 'Perform auth audit',
        scheduledAt: futureDate
      },
      tempDir
    );

    const cancelled = cancelScheduledTask(task.id, tempDir);
    assert.strictEqual(cancelled, true);

    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded[0].status, 'cancelled');

    // Cancelling already cancelled task returns false
    const cancelAgain = cancelScheduledTask(task.id, tempDir);
    assert.strictEqual(cancelAgain, false);
  });

  test('deleteScheduledTask should completely remove task from storage', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    const task = addScheduledTask(
      {
        agent: 'tester',
        mode: 'code',
        type: 'start',
        task: 'Run end-to-end suite',
        scheduledAt: futureDate
      },
      tempDir
    );

    assert.strictEqual(loadScheduledTasks(tempDir).length, 1);
    const deleted = deleteScheduledTask(task.id, tempDir);
    assert.strictEqual(deleted, true);
    assert.strictEqual(loadScheduledTasks(tempDir).length, 0);

    // Deleting nonexistent task returns false
    const deleteAgain = deleteScheduledTask('nonexistent-id', tempDir);
    assert.strictEqual(deleteAgain, false);
  });

  test('getDueScheduledTasks should only filter pending tasks that are due', () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();

    const dueTask = addScheduledTask(
      {
        agent: 'default',
        mode: 'code',
        type: 'start',
        task: 'Due task now',
        scheduledAt: pastDate
      },
      tempDir
    );

    const futureTask = addScheduledTask(
      {
        agent: 'default',
        mode: 'code',
        type: 'start',
        task: 'Future task',
        scheduledAt: futureDate
      },
      tempDir
    );

    const dueList = getDueScheduledTasks(tempDir);
    assert.strictEqual(dueList.length, 1);
    assert.strictEqual(dueList[0].id, dueTask.id);
  });

  test('saveScheduledTasks should persist task array correctly', () => {
    const dummy = [
      {
        id: 'test-1',
        agent: 'frontend',
        mode: 'code' as const,
        type: 'start' as const,
        task: 'Optimize bundle size',
        scheduledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending' as const
      }
    ];

    saveScheduledTasks(dummy, tempDir);
    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].task, 'Optimize bundle size');
  });

  test('executeDueTasks should execute due tasks using registered task executor', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    const created = addScheduledTask(
      {
        agent: 'developer',
        mode: 'code',
        type: 'start',
        task: 'Auto fix bug',
        scheduledAt: pastDate
      },
      tempDir
    );

    const mockExecutor: TaskExecutor = async (options) => {
      assert.strictEqual(options.task, 'Auto fix bug');
      return { success: true, sessionId: 'session-mock-123' };
    };

    const count = await executeDueTasks(tempDir, undefined, mockExecutor);
    assert.strictEqual(count, 1);

    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded[0].status, 'completed');
    assert.strictEqual(loaded[0].sessionId, 'session-mock-123');
  });

  test('runScheduledTaskNow should force execute specific task immediately', async () => {
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    const created = addScheduledTask(
      {
        agent: 'tester',
        mode: 'code',
        type: 'start',
        task: 'Immediate verification',
        scheduledAt: futureDate
      },
      tempDir
    );

    const mockExecutor: TaskExecutor = async (options) => {
      return { success: true, sessionId: 'sess-now-999' };
    };

    const result = await runScheduledTaskNow(created.id, tempDir, mockExecutor);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.sessionId, 'sess-now-999');

    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded[0].status, 'completed');
    assert.strictEqual(loaded[0].sessionId, 'sess-now-999');
  });

  test('executeDueTasks should mark task as failed when executor fails to prevent infinite loop', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    const created = addScheduledTask(
      {
        agent: 'invalid-agent',
        mode: 'code',
        type: 'start',
        task: 'Failing task',
        scheduledAt: pastDate
      },
      tempDir
    );

    const failingExecutor: TaskExecutor = async () => {
      return { success: false, error: 'Agent not found in registry' };
    };

    const count = await executeDueTasks(tempDir, undefined, failingExecutor);
    assert.strictEqual(count, 1);

    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded[0].status, 'failed');
    assert.strictEqual(loaded[0].error, 'Agent not found in registry');

    // Verification: Due tasks list must now be empty (no infinite loop)
    const dueAgain = getDueScheduledTasks(tempDir);
    assert.strictEqual(dueAgain.length, 0);
  });

  test('executeDueTasks should mark task as failed when executor throws', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    addScheduledTask(
      {
        agent: 'developer',
        mode: 'code',
        type: 'start',
        task: 'Crashing task',
        scheduledAt: pastDate
      },
      tempDir
    );

    const crashingExecutor: TaskExecutor = async () => {
      throw new Error('Network socket disconnected');
    };

    await executeDueTasks(tempDir, undefined, crashingExecutor);

    const loaded = loadScheduledTasks(tempDir);
    assert.strictEqual(loaded[0].status, 'failed');
    assert.strictEqual(loaded[0].error, 'Network socket disconnected');

    // Verification: Due tasks list must now be empty
    const dueAgain = getDueScheduledTasks(tempDir);
    assert.strictEqual(dueAgain.length, 0);
  });
});
