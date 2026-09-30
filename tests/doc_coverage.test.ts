import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');
const AGENTS_DIR = path.join(process.cwd(), 'references', 'agents');

describe('Enhanced TSDoc & Agent Documentation Coverage Auditor', () => {
  function getTsFilesRecursive(dir: string): string[] {
    let results: string[] = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(getTsFilesRecursive(fullPath));
      } else if (item.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  test('100% of exported symbols across all scripts/**/*.ts must have valid TSDoc block comments with @param tags', () => {
    const files = getTsFilesRecursive(SCRIPTS_DIR);
    assert.ok(files.length >= 15, 'Scripts directory tree should contain all TypeScript source files');

    const missingDocs: string[] = [];

    for (const filePath of files) {
      const file = path.relative(SCRIPTS_DIR, filePath);
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

  test('100% of TypeScript files in scripts/ must have a top-level @module docblock header', () => {
    const files = getTsFilesRecursive(SCRIPTS_DIR);
    const missingModuleHeaders: string[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('@module')) {
        missingModuleHeaders.push(path.relative(SCRIPTS_DIR, filePath));
      }
    }

    if (missingModuleHeaders.length > 0) {
      assert.fail(`Files missing @module header:\n${missingModuleHeaders.join('\n')}`);
    } else {
      assert.ok(true, `All ${files.length} TypeScript files have valid @module docblocks.`);
    }
  });

  test('100% of script files (both .ts and .js) in scripts/ must have non-zero inline comments and maintain documentation density', () => {
    function getAllScriptFiles(dir: string): string[] {
      let results: string[] = [];
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules') {
          results = results.concat(getAllScriptFiles(fullPath));
        } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.js'))) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const files = getAllScriptFiles(SCRIPTS_DIR);
    assert.ok(files.length >= 25, 'Should discover all scripts and tool handlers in repository');

    const failingFiles: string[] = [];

    for (const filePath of files) {
      const relPath = path.relative(SCRIPTS_DIR, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      let commentLines = 0;
      let codeLines = 0;
      let inBlockComment = false;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (inBlockComment) {
          commentLines++;
          if (line.includes('*/')) inBlockComment = false;
        } else if (line.startsWith('/*')) {
          commentLines++;
          if (!line.includes('*/')) inBlockComment = true;
        } else if (line.startsWith('//') || line.startsWith('*')) {
          commentLines++;
        } else {
          codeLines++;
          if (line.includes('//') && !line.includes('://')) {
            commentLines++;
          }
        }
      }

      // Assert non-zero documentation
      if (commentLines === 0) {
        failingFiles.push(`${relPath}: Completely undocumented (0 comment lines)`);
        continue;
      }

      // Assert healthy documentation ratio (>= 4% for massive entrypoints like extension.ts, >= 10% for modular libraries)
      const ratio = (commentLines / (codeLines + commentLines)) * 100;
      const minRatio = relPath.includes('extension.ts') ? 4.0 : 10.0;
      if (ratio < minRatio) {
        failingFiles.push(`${relPath}: Low documentation ratio (${ratio.toFixed(1)}% < ${minRatio}%)`);
      }
    }

    if (failingFiles.length > 0) {
      assert.fail(`Inline documentation density audit failed:\n${failingFiles.join('\n')}`);
    } else {
      assert.ok(true, `All ${files.length} script files maintain healthy inline documentation density.`);
    }
  });

  test('100% of runnable JavaScript utility scripts must have top-level documentation and step comments', () => {
    const jsFiles = ['build.js', 'run_tests.js', 'installer.js', 'install_hooks.js', 'release.js', 'ship.js'];

    for (const jsFile of jsFiles) {
      const filePath = path.join(SCRIPTS_DIR, jsFile);
      assert.ok(fs.existsSync(filePath), `Script ${jsFile} must exist`);

      const content = fs.readFileSync(filePath, 'utf8');
      // Verify file-level docblock or header
      assert.ok(
        content.trim().startsWith('/**') || content.trim().startsWith('//'),
        `${jsFile} must begin with an explanatory file header comment`
      );

      // Verify inline step comments exist
      assert.ok(
        content.includes('// Step') || content.includes('// 1.') || content.includes('// 2.') || content.includes('/*'),
        `${jsFile} must contain structured inline step-by-step execution comments`
      );
    }
  });

  test('100% of MCP tool handler definitions in scripts/mcp/tools/*.ts must contain inline execution step comments', () => {
    const toolFiles = ['session_tools.ts', 'agent_tools.ts', 'system_tools.ts'];

    for (const toolFile of toolFiles) {
      const filePath = path.join(SCRIPTS_DIR, 'mcp', 'tools', toolFile);
      assert.ok(fs.existsSync(filePath), `Tool file ${toolFile} must exist`);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('// Step 1:'),
        `${toolFile} must contain structured step comments (e.g. // Step 1: ...) in its tool execution handlers`
      );
      assert.ok(
        content.includes('// Step 2:'),
        `${toolFile} must contain multiple execution phase comments in its tool handlers`
      );
    }
  });
});
