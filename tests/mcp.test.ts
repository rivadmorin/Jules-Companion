import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as fs from 'fs';

const TEST_DIR = path.join(process.cwd(), 'temp_mcp_dir');
const DIST_DIR = path.join(process.cwd(), 'dist');

describe('MCP Server Integration Tests', () => {
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

    test('mcp_server.js should start and accept JSON-RPC on stdio', () => {
        // Send a simple ListToolsRequest via stdin
        const requestPayload = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {}
        };

        const res = spawnSync('node', [path.join(DIST_DIR, 'mcp_server.js')], {
            input: JSON.stringify(requestPayload) + '\n',
            cwd: TEST_DIR,
            encoding: 'utf8',
            timeout: 2000 // MCP server normally waits for more, so we timeout to force exit or we kill it
        });

        // The process might exit due to timeout or we check the stdout
        assert.ok(res.stdout || res.stderr, 'Should produce some output');

        // We know that mcp_server logs to stderr when it starts
        assert.ok(res.stderr.includes('Jules Companion MCP server running on stdio'), 'Should log startup message to stderr');

        // Output from JSON RPC should contain tools
        if (res.stdout) {
            assert.ok(res.stdout.includes('deploy_session'), 'Should expose deploy_session tool');
            assert.ok(res.stdout.includes('merge_session'), 'Should expose merge_session tool');
            assert.ok(res.stdout.includes('setup_workspace'), 'Should expose setup_workspace tool');
        }
    });
});
