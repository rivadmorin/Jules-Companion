import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { generateRegistry } from '../scripts/generate_registry';

const AGENTS_DIR = path.join(__dirname, '..', 'references', 'agents');
const REGISTRY_PATH = path.join(AGENTS_DIR, 'registry.json');

describe('Generate Registry Tests', () => {
  test('generateRegistry should generate valid registry.json', async () => {
    const registry = await generateRegistry();

    assert.ok(registry.generatedAt, 'Should have generatedAt timestamp');
    assert.ok(registry.totalAgents > 0, 'Should have at least one agent');
    assert.ok(registry.agents['inspector'], 'Should contain inspector agent');
    assert.strictEqual(registry.agents['inspector'].name, 'Inspector', 'Agent name should be formatted correctly');
    assert.strictEqual(registry.agents['inspector'].group, 'coding', 'Inspector should be a coding agent');

    // Check if registry.json was created/updated
    assert.ok(fs.existsSync(REGISTRY_PATH), 'registry.json should exist');
    const fileContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(fileContent);
    assert.strictEqual(parsed.totalAgents, registry.totalAgents, 'Saved registry should match returned object');
  });
});
