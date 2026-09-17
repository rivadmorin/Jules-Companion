import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { getAllTools, getTool, executeTool } from '../scripts/mcp/registry';

describe('Modular MCP Registry Unit Tests', () => {
  test('should register exactly 20 MCP tools', () => {
    const tools = getAllTools();
    assert.strictEqual(tools.length, 20, 'Registry must contain exactly 20 tools');
  });

  test('all 20 tools must possess valid name, description, and inputSchema', () => {
    const tools = getAllTools();
    for (const tool of tools) {
      assert.ok(tool.name && tool.name.length > 0, 'Tool name must not be empty');
      assert.ok(tool.description && tool.description.length > 0, `Tool ${tool.name} must have a description`);
      assert.ok(tool.inputSchema && tool.inputSchema.type === 'object', `Tool ${tool.name} must have object inputSchema`);
      assert.strictEqual(typeof tool.execute, 'function', `Tool ${tool.name} must define an execute function`);
    }
  });

  test('getTool should return matching tool definition by name', () => {
    const deployTool = getTool('deploy_session');
    assert.ok(deployTool, 'deploy_session tool must exist in registry');
    assert.strictEqual(deployTool?.name, 'deploy_session');

    const nonExistent = getTool('non_existent_tool_xyz');
    assert.strictEqual(nonExistent, undefined);
  });

  test('executeTool should reject unregistered tools with descriptive error', async () => {
    await assert.rejects(
      async () => {
        await executeTool('invalid_tool_name', {});
      },
      /Unknown tool: invalid_tool_name/
    );
  });
});
