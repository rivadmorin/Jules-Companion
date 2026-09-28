# 08 - Utilities & CLI Tooling Reference
**Modules:** [`scripts/utils.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/utils.ts), [`scripts/setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts), [`scripts/generate_registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/generate_registry.ts), [`scripts/sync_global.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/sync_global.ts)

---

## 1. Central Utilities Hub (`utils.ts`)

[`scripts/utils.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/utils.ts) serves as the core utility hub consumed across the CLI, VS Code extension, MCP server, and unit test suites.

### 1.1. Session Status Predicates
The following predicate functions enforce deterministic workflow logic:

```typescript
// Checks if a session is currently active/running
export function isSessionActive(status?: string): boolean;

// Checks if a session has succeeded/completed
export function isSessionCompleted(status?: string): boolean;

// Checks if a session has failed
export function isSessionFailed(status?: string): boolean;

// Checks if a session is STRICTLY awaiting plan approval
export function isSessionAwaitingApproval(status?: string): boolean;

// Checks if a session is STRICTLY awaiting user input or feedback
export function isSessionAwaitingInput(status?: string): boolean;
```

#### Critical Distinctions:
- `isSessionAwaitingApproval` returns `true` only when the status specifically references `'plan'`.
- `isSessionAwaitingInput` returns `true` when the status indicates `'input'`, `'feedback'`, `'response'`, or `'reply'`.
- This strict differentiation prevents false plan approval requests when an agent is only asking for clarification.

### 1.2. Environment Health Checks (`runDoctorChecks`)
Audits developer workspace readiness:
```typescript
export interface DoctorCheckResult {
  ok: boolean;
  checks: {
    git: boolean;
    node: boolean;
    repoInitialized: boolean;
    apiKeySet: boolean;
    registryValid: boolean;
  };
  details: Record<string, string>;
}
```
- Checks presence of `git` and `node` in system PATH.
- Verifies that workspace is an initialized Git repository (`.git` exists).
- Checks whether Google Jules API key is configured.
- Verifies integrity of agent catalog `registry.json`.

### 1.3. Standardized Date Formatting (`getFormattedDateDDMMYYYY`)
- Formats `Date` instances strictly as `DD-MM-YYYY` (e.g., `28-09-2026`).
- Used across report file names, daily logs, and journal archives.

### 1.4. Session Archival (`archiveSession` & `unarchiveSession`)
- **`archiveSession(sessionId, targetDir)`**: Sets `archived: true` in `.jules/sessions.json`. The session is automatically hidden from active view and moved to `📦 Archived Sessions`.
- **`unarchiveSession(sessionId, targetDir)`**: Restores archived session to active list (`archived: false`).

### 1.5. CLI Argument Parsing (`parseArgs`)
- Parses `process.argv.slice(2)` into a key-value dictionary.
- Supports boolean flags (`--all`, `--force`) and options with arguments (`--session 123`, `--mode review`).

---

## 2. CLI Tooling Scripts

### 2.1. `setup.ts` (Workspace Scaffolder)
Command: `npm run setup`
- Prepares necessary project directories if missing:
  - `.jules/`
  - `.jules/sessions.json`
  - `.jules-companion/`
  - `docs/jules-reports/`
  - `docs/jules-reviews/`
- Writes initial configuration templates non-destructively without overwriting existing data.

### 2.2. `generate_registry.ts` (Registry Compiler)
Command: `npm run registry`
- Scans markdown templates in `references/agents/*.md`.
- Extracts YAML frontmatter metadata (name, role, group, description).
- Compiles and reformats `references/agents/registry.json`.

### 2.3. `sync_global.ts` (Post-Build Synchronizer)
Command: `npm run sync` (executed automatically during `postbuild`)
- Validates that each agent entry in `registry.json` has an existing markdown file.
- Alphabetically sorts agent keys in `registry.json` to maintain clean, deterministic Git diffs.
