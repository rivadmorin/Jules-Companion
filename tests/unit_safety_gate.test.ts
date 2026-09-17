import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { checkSafetyGate } from '../scripts/workflows/safety_gate';
import { saveSessions } from '../scripts/core/storage';
import { SessionRecord } from '../scripts/core/types';

const TEST_DIR = path.join(process.cwd(), 'temp_safety_gate_test');

describe('Safety Gate Workflow Unit Tests', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('checkSafetyGate should pass immediately if no sessions exist', async () => {
    saveSessions([], TEST_DIR);
    const passed = await checkSafetyGate({}, TEST_DIR);
    assert.strictEqual(passed, true, 'Safety gate must pass when sessions store is empty');
  });

  test('checkSafetyGate should pass if all sessions are in terminal states', async () => {
    const terminalSessions: SessionRecord[] = [
      {
        id: 'sess-1',
        agent: 'bolt',
        mode: 'code',
        task: 'completed task',
        status: 'completed',
        timestamp: new Date().toISOString()
      },
      {
        id: 'sess-2',
        agent: 'sentinel',
        mode: 'review',
        task: 'merged task',
        status: 'merged',
        timestamp: new Date().toISOString()
      }
    ];
    saveSessions(terminalSessions, TEST_DIR);
    const passed = await checkSafetyGate({}, TEST_DIR);
    assert.strictEqual(passed, true, 'Safety gate must pass when all sessions are terminal');
  });

  test('checkSafetyGate should fail safe (return false) when active session cannot be verified', async () => {
    const activeSessions: SessionRecord[] = [
      {
        id: 'sess-active-mock',
        agent: 'inspector',
        mode: 'code',
        task: 'running task',
        status: 'launched',
        timestamp: new Date().toISOString()
      }
    ];
    saveSessions(activeSessions, TEST_DIR);
    // Passing invalid mock headers will trigger a network error, which safety gate must catch and fail safe
    const passed = await checkSafetyGate({ 'X-Goog-Api-Key': 'mock-invalid-key' }, TEST_DIR);
    assert.strictEqual(passed, false, 'Safety gate must block merge when an active session cannot be remotely verified');
  });
});
