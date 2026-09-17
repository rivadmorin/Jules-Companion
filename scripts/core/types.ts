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
  /** Primary companion metadata directory alias */
  companionDir?: string;
  /** Directory containing general reference materials */
  refDir: string;
  /** Directory containing specialized agent definitions */
  agentsDir: string;
  /** Temporary scratchpad directory for artifacts */
  scratchDir: string;
  /** Directory for storing generated reviews */
  docsReviewsDir: string;
  /** Alias for reviews directory */
  reviewsDir?: string;
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
  /** Optional detailed message or reason */
  message?: string;
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
 * Structured result returned by safety gate verification.
 */
export interface SafetyGateCheckResult {
  /** Whether the session is safe to merge */
  passed: boolean;
  /** Detailed human-readable explanation of the safety determination */
  reason: string;
  /** Current authoritative status from the API */
  sessionStatus?: string;
  /** Warnings or actionable recommendations */
  warnings?: string[];
}

/**
 * Structured outcome returned by a session deployment workflow.
 */
export interface DeployResult {
  /** Whether deployment succeeded */
  success: boolean;
  /** Unique session ID if created */
  sessionId?: string;
  /** Git branch name created */
  branch?: string;
  /** Message or error details */
  message: string;
  /** Task prompt deployed */
  prompt?: string;
}

/**
 * Structured outcome returned by a session merge workflow.
 */
export interface MergeResult {
  /** Whether merge succeeded */
  success: boolean;
  /** Session ID processed */
  sessionId: string;
  /** Branch name merged */
  branch: string;
  /** Message or error details */
  message: string;
  /** Raw diff content if retrieved */
  diff?: string;
}
