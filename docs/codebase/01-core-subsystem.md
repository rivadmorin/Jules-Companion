# 01 - Core Subsystem Reference
**Modules:** [`scripts/core/types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts), [`scripts/core/storage.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts), [`scripts/core/git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts), [`scripts/core/scheduler.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts)

---

## 1. Domain Types & Contracts (`types.ts`)

[`scripts/core/types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts) serves as the central domain type registry and single source of truth across all subsystems:

### 1.1. `SessionRecord`
Represents a Jules session's state on disk and in memory:
```typescript
export interface SessionRecord {
  id: string;               // Unique session ID from Google Jules (e.g., "1234567890abcdef")
  agent: string;            // Specialist agent name (e.g., "architect", "tester", "default")
  task: string;             // Developer instruction / prompt summary
  status: string;           // Session status: 'PENDING' | 'RUNNING' | 'AWAITING_PLAN_APPROVAL' | 'AWAITING_USER_FEEDBACK' | 'SUCCEEDED' | 'FAILED'
  branch?: string;          // Associated Git branch name (e.g., "jules/task-xyz")
  timestamp?: string;       // Creation timestamp string
  createdAt?: string;       // Standard ISO creation timestamp
  updatedAt?: string;       // Latest status update ISO timestamp
  archived?: boolean;       // Archival flag
  prompt?: string;          // Full initial user prompt
  mode?: 'code' | 'review'; // Operational execution mode
  activities?: any[];       // Cloud execution timeline events
  artifacts?: any[];        // Output artifacts and code patches
}
```

### 1.2. `ScheduledTask` & `LaunchMode`
Defines autonomous scheduled task entities and official Google Jules launch modes:
```typescript
export type LaunchMode = 'start' | 'review' | 'interactive' | 'scheduled';

export interface ScheduledTask {
  id: string;               // Unique identifier with "sched-" prefix
  agent: string;            // Assigned specialist agent
  mode: 'code' | 'review';  // Execution mode
  type: LaunchMode;         // Launch mode
  task: string;             // Task instruction prompt
  scheduledAt: string;      // Target execution time (ISO string)
  createdAt: string;        // Creation timestamp (ISO string)
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  sessionId?: string;       // Resulting cloud session ID once deployed
  branch?: string;          // Optional target Git branch
}
```

### 1.3. `ProjectDirs`
Encapsulates isolated filesystem directory paths for a project:
```typescript
export interface ProjectDirs {
  root: string;             // Project root directory path
  julesDir: string;         // Local .jules directory
  agentsDir: string;        // references/agents or .jules/agents directory
  reportsDir: string;       // docs/jules-reports directory
  reviewsDir: string;       // docs/jules-reviews directory
}
```

---

## 2. Storage Subsystem (`storage.ts`)

[`scripts/core/storage.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts) provides safe, atomic JSON file persistence on disk:

### Core Functions:

#### `getProjectDirs(targetDir?: string): ProjectDirs`
- Resolves absolute project directories based on the current workspace or process working directory.
- Ensures consistent paths whether running in standalone CLI mode or within VS Code / Antigravity IDE.

#### `loadSessions(targetDir?: string): SessionRecord[]`
- Reads and parses `.jules/sessions.json`.
- **Fault-Tolerant Resilience**: If the file does not exist or contains invalid JSON, the function gracefully returns an empty array `[]` rather than throwing an unhandled exception.

#### `saveSessions(sessions: SessionRecord[], targetDir?: string): void`
- Persists `SessionRecord[]` array to `.jules/sessions.json`.
- Automatically scaffolds the `.jules/` directory if missing (`fs.mkdirSync(dirs.julesDir, { recursive: true })`).
- Uses pretty-printed serialization (`JSON.stringify(sessions, null, 2)`).

---

## 3. Git CLI Subsystem (`git.ts`)

[`scripts/core/git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts) provides safe, isolated Git subprocess execution with zero third-party dependencies:

### `runGit(args: string[], cwd?: string): GitExecutionResult`
Executes Git commands via Node.js `child_process.spawnSync`.
- **Parameters**:
  - `args`: Array of command arguments (e.g., `['status', '--porcelain']`, `['checkout', '-b', branch]`).
  - `cwd`: Working directory where Git command should execute (default `process.cwd()`).
- **Return Type**:
  ```typescript
  export interface GitExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
  }
  ```
- **Security & Safety**:
  - Sets `maxBuffer: 10 * 1024 * 1024` (10MB) to prevent buffer overflows during large patch generations.
  - Automatically trims whitespace on stdout and stderr.
  - Catches spawning errors gracefully (`exitCode: -1` when git binary is not found).

---

## 4. Task Scheduler Engine (`scheduler.ts`)

[`scripts/core/scheduler.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts) implements an autonomous background task scheduling engine without relying on external system cron jobs:

### Persistence & Storage:
- Stored persistently in `.jules-companion/schedules.json`.
- Task ID format: `sched-${Date.now().toString(36)}-${randomHex}`.

### Complete Method Catalog:

| Function | Signature | Description |
|---|---|---|
| `loadScheduledTasks` | `(targetDir?: string): ScheduledTask[]` | Loads all persisted scheduled tasks from disk. |
| `saveScheduledTasks` | `(tasks: ScheduledTask[], targetDir?: string): void` | Saves array of scheduled tasks to disk. |
| `addScheduledTask` | `(task: Omit<ScheduledTask, 'id' \| 'createdAt' \| 'status'>, targetDir?: string): ScheduledTask` | Creates a new task record with `'pending'` status. |
| `cancelScheduledTask` | `(taskId: string, targetDir?: string): boolean` | Transitions a `'pending'` task to `'cancelled'`. Returns false if not found or already executed. |
| `deleteScheduledTask` | `(taskId: string, targetDir?: string): boolean` | Permanently deletes a task record from schedules storage. |
| `getDueScheduledTasks` | `(targetDir?: string, now?: Date): ScheduledTask[]` | Filters tasks with status `'pending'` where `scheduledAt <= now.toISOString()`. |
| `executeDueTasks` | `(targetDir?: string, onExecute?: Function): Promise<number>` | Evaluates due tasks, transitions them to `'running'`, invokes `deploySessionCore`, updates status to `'completed'`, and attaches the resulting cloud session ID. |
| `runScheduledTaskNow` | `(taskId: string, targetDir?: string): Promise<{ success: boolean; sessionId?: string; error?: string }>` | Force-executes a specific scheduled task immediately without waiting for `scheduledAt`. |

### Execution State Machine in `executeDueTasks`:
```typescript
// Autonomous Execution Lifecycle:
// 1. Fetch due tasks: scheduledAt <= now
// 2. Mark task as 'running' -> disk sync (prevents concurrent double-execution)
// 3. Call deploySessionCore({ task, agents, mode, type, branch, targetDir })
// 4. On success -> mark 'completed', extract session ID from output, disk sync
// 5. On failure -> revert to 'pending' for retry in subsequent poll tick
```
