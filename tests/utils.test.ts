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
  createCustomAgentScaffold
} from '../scripts/utils';

const TEST_DIR = path.join(process.cwd(), 'temp_test_dir_utils');

describe('Utils Comprehensive Tests', () => {
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
  });
});
