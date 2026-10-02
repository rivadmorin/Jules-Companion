# Model Context Protocol (MCP) Tool Calling Catalog (20 Tools)

This document provides the reference catalog for all 20 Model Context Protocol (MCP) tools implemented in **Jules Companion** (`scripts/mcp_server.ts` and `scripts/mcp/registry.ts`).

---

## TypeScript Interface Definition

```typescript
interface JulesCompanionMcpTools {
  // ==========================================
  // 1. Session Lifecycle & Deployment
  // ==========================================
  deploy_session(params: { type: "start" | "review" | "interactive"; prompt: string; branch?: string }): Promise<Session>;
  deploy_team(params: { preset: "github-ops" | "full-audit" | "feature-sprint" | "refactor-boost"; prompt: string }): Promise<TeamResult>;
  cancel_session(params: { sessionId: string }): Promise<void>;
  retry_failed_session(params: { sessionId: string }): Promise<Session>;
  get_session_status(params: { sessionId: string }): Promise<SessionStatus>;
  auto_process(params: { sessionId: string }): Promise<AutoProcessSummary>;

  // ==========================================
  // 2. Code Review & Git Integration
  // ==========================================
  merge_session(params: { sessionId: string; inspect: boolean; approve: boolean }): Promise<MergeResult>;
  pull_session_diff(params: { sessionId: string }): Promise<{ diffPath: string; conflictStatus: boolean }>;
  checkout_session_branch(params: { sessionId: string }): Promise<{ localBranch: string }>;
  rollback_session(params: { sessionId: string }): Promise<void>;
  create_github_pr(params: { sessionId: string; title?: string; body?: string }): Promise<{ prUrl: string }>;
  get_review_reports(params: { sessionId?: string }): Promise<ReviewReport[]>;

  // ==========================================
  // 3. Human-in-the-Loop Feedback
  // ==========================================
  send_session_message(params: { sessionId: string; message: string }): Promise<void>;

  // ==========================================
  // 4. Specialist Agent Personas (63 Agents)
  // ==========================================
  list_agents(): Promise<AgentMetadata[]>;
  get_agent_info(params: { agentName: string }): Promise<AgentPromptDetails>;
  create_custom_agent(params: { name: string; role: string; instructions: string }): Promise<void>;
  read_agent_journal(params: { agentName?: string; limit?: number }): Promise<JournalEntry[]>;

  // ==========================================
  // 5. Workspace Diagnostics & Management
  // ==========================================
  setup_workspace(params: { path: string; rulesPreset?: string }): Promise<{ status: "initialized" | "ready" }>;
  list_sources(): Promise<SourceRepository[]>;
  run_doctor(): Promise<DiagnosticReport>;
}
```

---

## Tool Category Breakdown

### 1. Session Lifecycle & Deployment
- `deploy_session`: Deploys a single Jules coding session in one of three modes: `start`, `review`, or `interactive`.
- `deploy_team`: Orchestrates autonomous multi-agent teams based on predefined presets (`github-ops`, `full-audit`, `feature-sprint`, `refactor-boost`).
- `cancel_session`: Cancels an ongoing background session.
- `retry_failed_session`: Retries a failed session using the same context.
- `get_session_status`: Fetches live status and progress of a session.
- `auto_process`: Automatically evaluates diffs and handles review approvals.

### 2. Code Review & Git Integration
- `merge_session`: Merges a completed session's branch into the working tree.
- `pull_session_diff`: Pulls patch diffs for local inspection.
- `checkout_session_branch`: Checks out the remote branch created by Jules.
- `rollback_session`: Rolls back merged changes safely.
- `create_github_pr`: Creates a GitHub Pull Request from the session branch via `gh` CLI.
- `get_review_reports`: Retrieves review audit summaries.

### 3. Human-in-the-Loop Feedback
- `send_session_message`: Injects guidance, instructions, or clarifications into an active interactive session.

### 4. Specialist Agent Personas
- `list_agents`: Lists all 63 specialist agent personas available in the roster.
- `get_agent_info`: Inspects prompt templates and behavioral contracts for a specific agent.
- `create_custom_agent`: Dynamically registers a custom specialist agent.
- `read_agent_journal`: Reads historical decisions and work journals of an agent.

### 5. Workspace Diagnostics & Management
- `setup_workspace`: Initializes workspace configuration, rulesets, and cache stores.
- `list_sources`: Lists connected git repositories and remote sources.
- `run_doctor`: Runs environment integrity checks (Node, Git, Jules CLI, MCP).
