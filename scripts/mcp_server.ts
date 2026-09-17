/**
 * @file mcp_server.ts
 * @description Primary Model Context Protocol (MCP) server implementation for Jules Companion.
 * Exposes 20 specialized tools and resources over stdio JSON-RPC streams to LLM clients
 * (e.g. Antigravity IDE, Claude Desktop, Cursor, OpenCode).
 * @module mcp_server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { loadSessions } from './core/storage';
import { getAllTools, executeTool } from './mcp/registry';

/**
 * Core MCP Server Instance.
 */
const server = new Server(
  {
    name: 'jules-companion-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

/**
 * Resource listing handler for passive context injection.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'jules://sessions',
        name: 'Jules Active Sessions',
        description: 'A list of active and historical Jules AI sessions from local state.',
        mimeType: 'application/json'
      }
    ]
  };
});

/**
 * Resource read handler.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (req: { params: { uri: string } }) => {
  if (req.params.uri === 'jules://sessions') {
    const sessions = loadSessions();
    return {
      contents: [
        {
          uri: req.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(sessions, null, 2)
        }
      ]
    };
  }
  throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${req.params.uri}`);
});

/**
 * Tool definitions listing handler exposing all 20 MCP tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getAllTools().map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  };
});

/**
 * Central JSON-RPC CallToolRequest Handler delegating to modular registry.
 */
server.setRequestHandler(CallToolRequestSchema, async (req: { params: { name: string; arguments?: Record<string, any> } }) => {
  try {
    return await executeTool(req.params.name, req.params.arguments || {});
  } catch (error: any) {
    if (error.message && error.message.startsWith('Unknown tool:')) {
      throw new McpError(ErrorCode.MethodNotFound, error.message);
    }
    return { content: [{ type: 'text', text: `Error executing tool '${req.params.name}': ${error.message}` }], isError: true };
  }
});

/**
 * Initializes stdio MCP Server.
 * Connects standard input and output streams to listen for incoming client JSON-RPC commands.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jules Companion MCP server running on stdio');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error starting MCP server:', err);
    process.exit(1);
  });
}
