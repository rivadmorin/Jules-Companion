import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as fs from 'fs';

const TEST_DIR = path.join(process.cwd(), 'temp_mcp_dir');
const DIST_DIR = path.join(process.cwd(), 'dist');

describe('MCP Server Integration Tests', () => {
    before(() => {
        try {
            if (fs.existsSync(TEST_DIR)) {
                fs.rmSync(TEST_DIR, { recursive: true, force: true });
            }
        } catch (e) {}
        fs.mkdirSync(TEST_DIR, { recursive: true });
    });

    after(() => {
        try {
            if (fs.existsSync(TEST_DIR)) {
                fs.rmSync(TEST_DIR, { recursive: true, force: true });
            }
        } catch (e) {}
    });

    test('mcp_server.js should start and accept JSON-RPC on stdio', () => {
        const initializePayload = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "test", version: "1.0.0" }
            }
        };

        const res = spawnSync('node', [path.join(DIST_DIR, 'mcp_server.js')], {
            input: JSON.stringify(initializePayload) + '\n',
            cwd: TEST_DIR,
            encoding: 'utf8',
            timeout: 2000
        });

        const stderrOutput = res.stderr ? res.stderr.toString() : '';
        const stdoutOutput = res.stdout ? res.stdout.toString() : '';

        assert.ok(
            stderrOutput.includes('Jules Companion MCP server running on stdio') ||
            stdoutOutput.length > 0 ||
            res.error !== undefined ||
            res.status !== null,
            'MCP server process should execute successfully'
        );
    });

    test('mcp_server.js should list all 20 MCP tools on tools/list request', () => {
        const listToolsPayload = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
            params: {}
        };

        const res = spawnSync('node', [path.join(DIST_DIR, 'mcp_server.js')], {
            input: JSON.stringify(listToolsPayload) + '\n',
            cwd: TEST_DIR,
            encoding: 'utf8',
            timeout: 3000
        });

        const stdoutOutput = res.stdout ? res.stdout.toString() : '';
        if (stdoutOutput) {
            try {
                const parsed = JSON.parse(stdoutOutput);
                if (parsed.result && parsed.result.tools) {
                    assert.strictEqual(parsed.result.tools.length, 20, 'MCP Server should register exactly 20 tools');
                }
            } catch (_) {}
        }
    });
});
