/**
 * Central registry aggregating all 20 MCP tool handlers.
 * @module mcp/registry
 */

import { McpToolDefinition } from './types';
import { sessionTools } from './tools/session_tools';
import { agentTools } from './tools/agent_tools';
import { systemTools } from './tools/system_tools';

export { McpToolDefinition };

/**
 * Complete list of all 20 registered MCP tools.
 */
const allTools: McpToolDefinition[] = [
  ...sessionTools,
  ...agentTools,
  ...systemTools
];

const toolsByName = new Map<string, McpToolDefinition>();
for (const tool of allTools) {
  toolsByName.set(tool.name, tool);
}

/**
 * Returns all registered MCP tool definitions for the tools/list request.
 *
 * @returns Array of 20 tool definitions.
 */
export function getAllTools(): McpToolDefinition[] {
  return allTools;
}

/**
 * Retrieves a specific tool definition by name.
 *
 * @param name - Snake_case name of the tool.
 * @returns The tool definition or undefined if not found.
 */
export function getTool(name: string): McpToolDefinition | undefined {
  return toolsByName.get(name);
}

/**
 * Executes a registered tool by name with provided arguments.
 *
 * @param name - Name of the tool to execute.
 * @param args - Arguments payload passed from the JSON-RPC client.
 * @returns Object with content array formatted for MCP JSON-RPC response.
 */
export async function executeTool(
  name: string,
  args: any
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const tool = toolsByName.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.execute(args);
}
