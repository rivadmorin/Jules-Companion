import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { parseArgs, getProjectDirs } from '../scripts/utils';
import { inferAgentAndMode } from '../scripts/jules_menu';

describe('Jules-Companion Unit Tests', () => {
  
  describe('Argument Parser (parseArgs)', () => {
    test('should parse key-value flags correctly', () => {
      const args = ['--agents', 'bolt', '--task', 'optimize loops'];
      const parsed = parseArgs(args);
      assert.deepStrictEqual(parsed, {
        agents: 'bolt',
        task: 'optimize loops'
      });
    });

    test('should parse boolean flags correctly', () => {
      const args = ['--all', '--debug'];
      const parsed = parseArgs(args);
      assert.deepStrictEqual(parsed, {
        all: true,
        debug: true
      });
    });

    test('should handle mixed flags and values', () => {
      const args = ['--mode', 'review', '--all'];
      const parsed = parseArgs(args);
      assert.deepStrictEqual(parsed, {
        mode: 'review',
        all: true
      });
    });
  });

  describe('Project Directory Resolver (getProjectDirs)', () => {
    test('should resolve directories relative to target path', () => {
      const target = '/mock/project';
      const dirs = getProjectDirs(target);
      assert.strictEqual(dirs.targetDir, '/mock/project');
      assert.strictEqual(dirs.julesDir, '/mock/project/.jules-companion');
      assert.strictEqual(dirs.refDir, '/mock/project/.jules-companion/references');
      assert.strictEqual(dirs.agentsDir, '/mock/project/.jules-companion/references/agents');
      assert.strictEqual(dirs.scratchDir, '/mock/project/.jules-companion/scratch');
      assert.strictEqual(dirs.docsReviewsDir, '/mock/project/docs/jules-reviews');
    });
  });

  describe('Intent Inference Engine (inferAgentAndMode)', () => {
    const dummyRegistryPath = path.join(__dirname, 'dummy_registry.json');

    test('should infer review mode from review keywords', () => {
      const text = 'Please audit the code for vulnerabilities';
      const res = inferAgentAndMode(text, dummyRegistryPath);
      assert.strictEqual(res.mode, 'review');
    });

    test('should infer code mode by default', () => {
      const text = 'Create a new API route';
      const res = inferAgentAndMode(text, dummyRegistryPath);
      assert.strictEqual(res.mode, 'code');
    });

    test('should match sentinel agent for security related tasks', () => {
      const text = 'Check input validation and sanitize data';
      const res = inferAgentAndMode(text, dummyRegistryPath);
      assert.ok(res.agents.includes('sentinel'));
    });

    test('should match bolt agent for optimize related tasks', () => {
      const text = 'Optimize the loop performance';
      const res = inferAgentAndMode(text, dummyRegistryPath);
      assert.ok(res.agents.includes('bolt'));
    });

    test('should default to bolt agent when no keywords match', () => {
      const text = 'do something arbitrary';
      const res = inferAgentAndMode(text, dummyRegistryPath);
      assert.deepStrictEqual(res.agents, ['bolt']);
    });
  });
});
