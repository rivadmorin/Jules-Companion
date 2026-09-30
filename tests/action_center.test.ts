import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { openSessionActionCenter } from '../scripts/ui/action_center';
import { SessionRecord } from '../scripts/core/types';

describe('Session Action Center Unit Tests', () => {
  const tempDir = path.join(process.cwd(), '.jules-test-action-center');
  const mockSession: SessionRecord = {
    id: 'sess-act-center-1234',
    agent: 'architect',
    mode: 'code',
    task: 'Refactor core modules',
    status: 'AWAITING_PLAN_APPROVAL',
    branch: 'feat/arch',
    timestamp: new Date().toISOString(),
    plan: {
      steps: [
        { title: 'Decompose monolith into microservices', status: 'IN_PROGRESS' },
        { title: 'Write integration test matrix', status: 'PENDING' }
      ]
    }
  };

  test('openSessionActionCenter should execute without uncaught errors', async () => {
    const julesDir = path.join(tempDir, '.jules-companion');
    fs.mkdirSync(julesDir, { recursive: true });
    fs.writeFileSync(path.join(julesDir, 'sessions.json'), JSON.stringify([mockSession]), 'utf8');

    try {
      // Mock invocation: in test environment showQuickPick will return undefined, which exits gracefully
      await openSessionActionCenter('sess-act-center-1234', tempDir);
      assert.ok(true, 'Executed without crashing');
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
