/**
 * Core type definitions for the Jules Companion framework.
 * @module core/types
 */

/**
 * Standard status strings for a Jules session.
 */
export type SessionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'MERGED'
  | 'REJECTED'
  | string;

/**
 * Interface representing resolved project directories.
 */
export interface ProjectDirs {
  /** The root directory of the user's target project */
  targetDir: string;
  /** The root companion directory, typically `.jules-companion` */
  julesDir: string;
  /** Directory containing general reference materials */
  refDir: string;
  /** Directory containing specialized agent definitions */
  agentsDir: string;
  /** Temporary scratchpad directory for artifacts */
  scratchDir: string;
  /** Directory for storing generated reviews */
  docsReviewsDir: string;
  /** Path to persistent sessions.json storage file */
  sessionsFile?: string;
  /** Path to local configuration file */
  configFile?: string;
}

/**
 * Represents a stored session record tracking agent operational metadata and status.
 */
export interface SessionRecord {
  /** Unique Jules API session identifier */
  id: string;
  /** Primary agent identifier */
  agent: string;
  /** Mode of session: code execution or code review */
  mode: 'code' | 'review';
  /** User-friendly task title or prompt summary */
  task: string;
  /** Current lifecycle status of the session */
  status: string;
  /** Timestamp formatted string */
  timestamp: string;
  /** Selected agent names attached to this session */
  agents?: string[];
  /** Git branch name created or mapped for this session */
  branch?: string;
  /** ISO timestamp when the session was initialized */
  createdAt?: string;
  /** Optional ISO timestamp when the session was updated */
  updatedAt?: string;
  /** Optional GitHub or Jules PR / merge URL */
  prUrl?: string;
  /** Optional direct web URL to view session on Google Jules web console */
  url?: string;
  /** Optional detailed message or reason */
  message?: string;
  /** Whether the session has been archived */
  archived?: boolean;
}

/**
 * Represents a source repository configuration recognized by Google Jules API.
 */
export interface JulesSource {
  /** Full resource name, e.g. sources/github/owner/repo */
  name: string;
  /** GitHub repository specific details */
  githubRepo?: {
    owner: string;
    repo: string;
  };
}

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
