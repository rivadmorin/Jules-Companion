import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  runGit,
  loadSessions,
  saveSessions,
  SessionRecord,
  getProjectDirs,
  parseArgs,
  getFormattedDateDDMMYYYY,
  runDoctorChecks,
  readAgentJournal,
  getReviewReports,
  createCustomAgentScaffold,
  isSessionAwaitingApproval,
  isSessionAwaitingInput,
  checkPatchConflict,
  cleanSessionScratch,
  archiveSession,
  unarchiveSession
} from '../scripts/utils';
import { deleteSessionApi } from '../scripts/client/jules_api';
import { getApiKey, resetApiKeyCache } from '../scripts/client/http';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_utils');

describe('Utils Comprehensive Tests', () => {
  before(() => {
    try {
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      }
    } catch {}
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    try {
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      }
    } catch {}
  });

  describe('runGit', () => {
    test('should initialize a git repository', () => {
      const resInit = runGit(['init'], TEST_DIR);
      assert.strictEqual(resInit.success, true);
      assert.ok(fs.existsSync(path.join(TEST_DIR, '.git')), '.git directory should exist');

      runGit(['config', 'user.name', 'Test User'], TEST_DIR);
      runGit(['config', 'user.email', 'test@example.com'], TEST_DIR);

      fs.writeFileSync(path.join(TEST_DIR, 'test.txt'), 'hello world');
      runGit(['add', 'test.txt'], TEST_DIR);
      const resCommit = runGit(['commit', '-m', 'Initial commit'], TEST_DIR);

      assert.strictEqual(resCommit.success, true);
    });

    test('should fail gracefully on invalid git command', () => {
      const res = runGit(['invalid-command-123'], TEST_DIR);
      assert.strictEqual(res.success, false);
    });
  });

  describe('parseArgs', () => {
    test('should correctly parse key-value flags and boolean options', () => {
      const rawArgs = ['--type', 'start', '--agents', 'bolt,sentinel', '--all'];
      const parsed = parseArgs(rawArgs);
      assert.strictEqual(parsed['type'], 'start');
      assert.strictEqual(parsed['agents'], 'bolt,sentinel');
      assert.strictEqual(parsed['all'], true);
    });
  });

  describe('getFormattedDateDDMMYYYY', () => {
    test('should format a date object strictly as DD-MM-YYYY', () => {
      const testDate = new Date(2026, 7, 4); // August 4, 2026
      const formatted = getFormattedDateDDMMYYYY(testDate);
      assert.strictEqual(formatted, '04-08-2026');
    });
  });

  describe('runDoctorChecks', () => {
    test('should return health check object for target directory', () => {
      const doctor = runDoctorChecks(TEST_DIR);
      assert.ok('ok' in doctor);
      assert.ok('checks' in doctor);
      assert.ok('node_version' in doctor.checks);
      assert.ok('api_key' in doctor.checks);
    });
  });

  describe('readAgentJournal', () => {
    test('should return fallback message if journal file does not exist', () => {
      const content = readAgentJournal('nonexistent_agent', TEST_DIR);
      assert.ok(content.includes('No critical learnings logged yet'));
    });

    test('should read journal file content if it exists', () => {
      const julesDir = path.join(TEST_DIR, '.jules');
      fs.mkdirSync(julesDir, { recursive: true });
      fs.writeFileSync(path.join(julesDir, 'annotator.md'), '## 04-08-2026 - Test Journal Entry\n', 'utf8');

      const content = readAgentJournal('annotator', TEST_DIR);
      assert.ok(content.includes('Test Journal Entry'));
    });
  });

  describe('getReviewReports', () => {
    test('should return empty array if docs/jules-reviews directory does not exist', () => {
      const reports = getReviewReports(TEST_DIR);
      assert.deepStrictEqual(reports, []);
    });

    test('should return review report files metadata if directory exists', () => {
      const reviewsDir = path.join(TEST_DIR, 'docs', 'jules-reviews');
      fs.mkdirSync(reviewsDir, { recursive: true });
      fs.writeFileSync(path.join(reviewsDir, '2026-08-04-annotator-audit.md'), '# Review Report', 'utf8');

      const reports = getReviewReports(TEST_DIR);
      assert.strictEqual(reports.length, 1);
      assert.strictEqual(reports[0].fileName, '2026-08-04-annotator-audit.md');
    });
  });

  describe('createCustomAgentScaffold', () => {
    test('should scaffold agent markdown file and update registry.json', () => {
      const regDir = path.join(TEST_DIR, '.jules-companion', 'references', 'agents');
      fs.mkdirSync(regDir, { recursive: true });
      fs.writeFileSync(path.join(regDir, 'registry.json'), JSON.stringify({ agents: {} }), 'utf8');

      const res = createCustomAgentScaffold(
        'sec-auditor',
        'Security Auditor',
        'Audit code for vulnerabilities and secrets.',
        ['Sanitize user input'],
        ['Do not log passwords'],
        TEST_DIR
      );

      assert.ok(fs.existsSync(res.agentFile));
      const content = fs.readFileSync(res.agentFile, 'utf8');
      assert.ok(content.includes('Security Auditor'));
      assert.ok(content.includes('Sanitize user input'));

      const regPath = path.join(TEST_DIR, '.jules-companion', 'references', 'agents', 'registry.json');
      assert.ok(fs.existsSync(regPath));
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
      assert.ok(reg.agents['sec-auditor']);
      assert.strictEqual(reg.agents['sec-auditor'].name, 'Security Auditor');
    });
  });

  describe('Session Management', () => {
    test('loadSessions should return empty array if no sessions file exists', () => {
       const sessions = loadSessions(TEST_DIR);
       assert.deepStrictEqual(sessions, []);
    });

    test('saveSessions and loadSessions should work correctly', () => {
      const mockSessions: SessionRecord[] = [
        {
          id: 'test-123',
          agent: 'bolt',
          mode: 'code',
          task: 'optimize test',
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      ];

      saveSessions(mockSessions, TEST_DIR);

      const dirs = getProjectDirs(TEST_DIR);
      assert.ok(fs.existsSync(path.join(dirs.julesDir, 'sessions.json')), 'sessions.json should be created');

      const loadedSessions = loadSessions(TEST_DIR);
      assert.deepStrictEqual(loadedSessions, mockSessions);
    });

    test('isSessionAwaitingApproval vs isSessionAwaitingInput must not conflate plan approval with user response', () => {
      // Plan approval states
      assert.strictEqual(isSessionAwaitingApproval('AWAITING_PLAN_APPROVAL'), true);
      assert.strictEqual(isSessionAwaitingApproval('awaiting_plan_approval'), true);
      assert.strictEqual(isSessionAwaitingInput('AWAITING_PLAN_APPROVAL'), false);

      // User response / input states
      assert.strictEqual(isSessionAwaitingInput('AWAITING_USER_INPUT'), true);
      assert.strictEqual(isSessionAwaitingInput('awaiting_user_input'), true);
      assert.strictEqual(isSessionAwaitingInput('awaiting_response'), true);
      assert.strictEqual(isSessionAwaitingInput('AWAITING_USER_FEEDBACK'), true);
      assert.strictEqual(isSessionAwaitingInput('awaiting_user_feedback'), true);
      assert.strictEqual(isSessionAwaitingApproval('AWAITING_USER_INPUT'), false);
      assert.strictEqual(isSessionAwaitingApproval('AWAITING_USER_FEEDBACK'), false);
      assert.strictEqual(isSessionAwaitingApproval('awaiting_response'), false);
    });

    test('cleanSessionScratch should purge diff, patch, and visual_diff directories for target session', () => {
      const dirs = getProjectDirs(TEST_DIR);
      const testSessionId = 'sess-abcdef123456';
      const shortId = 'sess-abc';

      const diffsDir = path.join(dirs.julesDir, 'diffs');
      const scratchDir = dirs.scratchDir;
      const vDiffDir = path.join(scratchDir, 'visual_diff', testSessionId);

      fs.mkdirSync(diffsDir, { recursive: true });
      fs.mkdirSync(scratchDir, { recursive: true });
      fs.mkdirSync(vDiffDir, { recursive: true });

      const diffFile = path.join(diffsDir, `session-${shortId}.diff`);
      const patchFile = path.join(scratchDir, `${testSessionId}.patch`);
      const vDiffFile = path.join(vDiffDir, 'before_file.ts');
      const unrelatedFile = path.join(scratchDir, 'unrelated-session.patch');

      fs.writeFileSync(diffFile, 'test diff content', 'utf8');
      fs.writeFileSync(patchFile, 'test patch content', 'utf8');
      fs.writeFileSync(vDiffFile, 'test visual diff', 'utf8');
      fs.writeFileSync(unrelatedFile, 'keep this file', 'utf8');

      assert.strictEqual(fs.existsSync(diffFile), true);
      assert.strictEqual(fs.existsSync(patchFile), true);
      assert.strictEqual(fs.existsSync(vDiffFile), true);

      const cleaned = cleanSessionScratch(testSessionId, TEST_DIR);
      assert.ok(cleaned.length >= 3);

      assert.strictEqual(fs.existsSync(diffFile), false);
      assert.strictEqual(fs.existsSync(patchFile), false);
      assert.strictEqual(fs.existsSync(vDiffDir), false);
      assert.strictEqual(fs.existsSync(unrelatedFile), true);
    });

    test('archiveSession should mark session archived and purge scratch files', () => {
      const dirs = getProjectDirs(TEST_DIR);
      const sessId = 'arch-sess-998877';
      const mockSession: SessionRecord = {
        id: sessId,
        agent: 'smith',
        branch: 'main',
        status: 'completed',
        timestamp: new Date().toISOString()
      };
      saveSessions([mockSession], TEST_DIR);

      const scratchDir = dirs.scratchDir;
      fs.mkdirSync(scratchDir, { recursive: true });
      const patchFile = path.join(scratchDir, `${sessId}.patch`);
      fs.writeFileSync(patchFile, 'archive patch content', 'utf8');

      const res = archiveSession(sessId, TEST_DIR);
      assert.strictEqual(res.success, true);
      assert.strictEqual(fs.existsSync(patchFile), false);

      const updated = loadSessions(TEST_DIR);
      assert.strictEqual(updated[0].archived, true);
    });

    test('deleteSessionApi should remove session from sessions.json and purge scratch files', async () => {
      const dirs = getProjectDirs(TEST_DIR);
      const sessId = 'del-sess-554433';
      const mockSession: SessionRecord = {
        id: sessId,
        agent: 'octo',
        branch: 'main',
        status: 'completed',
        timestamp: new Date().toISOString()
      };
      saveSessions([mockSession], TEST_DIR);

      const diffsDir = path.join(dirs.julesDir, 'diffs');
      fs.mkdirSync(diffsDir, { recursive: true });
      const diffFile = path.join(diffsDir, `session-${sessId.slice(0, 8)}.diff`);
      fs.writeFileSync(diffFile, 'delete diff content', 'utf8');

      const res = await deleteSessionApi(sessId, TEST_DIR);
      assert.strictEqual(res.success, true);
      assert.strictEqual(fs.existsSync(diffFile), false);

      const remaining = loadSessions(TEST_DIR);
      assert.strictEqual(remaining.length, 0);
    });
  });

  describe('checkPatchConflict', () => {
    test('should return canApplyCleanly true for empty or whitespace patch', () => {
      const res = checkPatchConflict('', TEST_DIR);
      assert.strictEqual(res.canApplyCleanly, true);
      assert.ok(res.message.includes('Empty patch'));
    });

    test('should detect whether a valid patch applies cleanly vs conflicts', () => {
      const filePath = path.join(TEST_DIR, 'sample.txt');
      fs.writeFileSync(filePath, 'line1\nline2\n', 'utf8');
      runGit(['add', 'sample.txt'], TEST_DIR);
      runGit(['commit', '-m', 'initial sample'], TEST_DIR);

      const cleanPatch = `diff --git a/sample.txt b/sample.txt
--- a/sample.txt
+++ b/sample.txt
@@ -1,2 +1,3 @@
 line1
 line2
+line3
`;
      const cleanRes = checkPatchConflict(cleanPatch, TEST_DIR);
      assert.strictEqual(cleanRes.canApplyCleanly, true);
      assert.ok(cleanRes.message.includes('0 conflicts'));

      const conflictPatch = `diff --git a/sample.txt b/sample.txt
--- a/sample.txt
+++ b/sample.txt
@@ -1,2 +1,2 @@
-nonexistent line
+modified line
`;
      const conflictRes = checkPatchConflict(conflictPatch, TEST_DIR);
      assert.strictEqual(conflictRes.canApplyCleanly, false);
      assert.ok(conflictRes.message.length > 0);
    });
  });

  describe('getApiKey directory isolation', () => {
    test('should resolve API key isolated by directory without cross-workspace leakage', () => {
      const dirA = path.join(TEST_DIR, 'workspaceA');
      const dirB = path.join(TEST_DIR, 'workspaceB');
      fs.mkdirSync(dirA, { recursive: true });
      fs.mkdirSync(dirB, { recursive: true });
      fs.writeFileSync(path.join(dirA, '.env'), 'JULES_API_KEY=key_for_workspace_a\n', 'utf8');
      fs.writeFileSync(path.join(dirB, '.env'), 'JULES_API_KEY=key_for_workspace_b\n', 'utf8');

      resetApiKeyCache();
      const oldEnv = process.env.JULES_API_KEY;
      delete process.env.JULES_API_KEY;

      try {
        const keyA = getApiKey(dirA);
        const keyB = getApiKey(dirB);
        assert.strictEqual(keyA, 'key_for_workspace_a');
        assert.strictEqual(keyB, 'key_for_workspace_b');
      } finally {
        if (oldEnv !== undefined) {
          process.env.JULES_API_KEY = oldEnv;
        }
        resetApiKeyCache();
      }
    });
  });
});
