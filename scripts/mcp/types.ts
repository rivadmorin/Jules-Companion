/**
 * Type definitions for the modular MCP tool registry.
 * @module mcp/types
 */

/**
 * Metadata definition and schema for an individual Model Context Protocol tool.
 */
export interface McpToolDefinition {
  /** Unique snake_case identifier matching tool name */
  name: string;
  /** Clear human-readable description for LLM capability selection */
  description: string;
  /** JSON-Schema representation of acceptable tool arguments */
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  /** Execution callback invoked when the tool is called */
  execute: (args: any) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}
