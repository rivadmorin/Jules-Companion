import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');
const AGENTS_DIR = path.join(process.cwd(), 'references', 'agents');

describe('Enhanced TSDoc & Agent Documentation Coverage Auditor', () => {
  test('100% of exported symbols in scripts/ must have valid TSDoc block comments with @param/@returns tags', () => {
    const files = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.ts'));
    assert.ok(files.length > 0, 'Scripts directory should contain TypeScript source files');

    const missingDocs: string[] = [];

    for (const file of files) {
      const filePath = path.join(SCRIPTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check for exported functions, interfaces, types, classes, consts, or enums
        if (
          line.startsWith('export function ') ||
          line.startsWith('export async function ') ||
          line.startsWith('export class ') ||
          line.startsWith('export interface ') ||
          line.startsWith('export type ') ||
          line.startsWith('export const ') ||
          line.startsWith('export enum ')
        ) {
          // Look backwards for a preceding JSDoc comment block line ending with '*/'
          let hasDoc = false;
          let docStartIndex = -1;
          let j = i - 1;
          while (j >= 0 && lines[j].trim() === '') {
            j--;
          }
          if (j >= 0 && lines[j].trim().endsWith('*/')) {
            hasDoc = true;
            // Find start of comment block '/**'
            while (j >= 0) {
              if (lines[j].trim().startsWith('/**')) {
                docStartIndex = j;
                break;
              }
              j--;
            }
          }

          if (!hasDoc) {
            const match = line.match(/export (?:async )?(?:function|class|interface|type|const|enum) ([a-zA-Z0-9_]+)/);
            const symbol = match ? match[1] : line;
            missingDocs.push(`${file}:${i + 1} (${symbol} missing TSDoc block comment)`);
          } else if (docStartIndex !== -1 && (line.includes('function ') || line.includes('function('))) {
            // Check TSDoc contents for functions with parameters
            const docBlock = lines.slice(docStartIndex, i).join('\n');
            const paramMatch = line.match(/\(([^)]+)\)/);
            if (paramMatch && paramMatch[1].trim().length > 0) {
              // Function has parameters, check if @param tag exists in TSDoc
              if (!docBlock.includes('@param')) {
                const symbolMatch = line.match(/export (?:async )?function ([a-zA-Z0-9_]+)/);
                const symbol = symbolMatch ? symbolMatch[1] : line;
                missingDocs.push(`${file}:${i + 1} (${symbol} has parameters but missing @param TSDoc tag)`);
              }
            }
          }
        }
      }
    }

    if (missingDocs.length > 0) {
      assert.fail(`TSDoc documentation audit failed on exported symbols:\n${missingDocs.join('\n')}`);
    } else {
      assert.ok(true, 'All exported symbols have complete TSDoc block comments and parameter tags.');
    }
  });

  test('100% of agents in references/agents/registry.json must have corresponding .md documentation templates', () => {
    const registryPath = path.join(AGENTS_DIR, 'registry.json');
    assert.ok(fs.existsSync(registryPath), 'registry.json must exist');

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    assert.ok(registry.agents, 'registry.json must have agents dictionary');

    const missingAgentDocs: string[] = [];
    const agentKeys = Object.keys(registry.agents);

    for (const key of agentKeys) {
      const templatePath = path.join(AGENTS_DIR, `${key.toLowerCase()}.md`);
      if (!fs.existsSync(templatePath)) {
        missingAgentDocs.push(`${key}.md template file missing`);
      }
    }

    if (missingAgentDocs.length > 0) {
      assert.fail(`Missing agent documentation template files:\n${missingAgentDocs.join('\n')}`);
    } else {
      assert.ok(true, `All ${agentKeys.length} agents in registry.json have valid markdown template files.`);
    }
  });
});
