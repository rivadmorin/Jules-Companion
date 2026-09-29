# 📓 Development Notes, Gotchas & Operational Autopsy

> **Repository:** Jules Companion (`jules-companion`)  
> **Companion Document:** [AGENT.md](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/AGENT.md) (Execution Policy, Boundaries & Golden Invariants)  
> **Scope:** Practical engineering gotchas, post-mortems, platform differences, testing traps, and recovery recipes.

---

## 🧭 Purpose & Architectural Role

While [AGENT.md](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/AGENT.md) serves as the authoritative rulebook and runtime prompt specification (invariants, architectural boundaries, and tool calling definitions), this document ([NOTE.md](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/NOTE.md)) serves as the **Operational Knowledge Vault**.

Consult this file whenever you encounter unexpected runtime errors, author new API integrations, debug CI failures, or perform cross-platform maintenance.

---

## 🪟 1. Platform & Cross-Environment Traps

### 1.1 Path Separators & Line Endings
* **Problem:** Developers frequently test on Windows (PowerShell) where paths use backslashes (`\`) and line endings are CRLF (`\r\n`), but production and CI pipelines run on Linux (Ubuntu Bash) with forward slashes (`/`) and LF (`\n`).
* **Invariants:**
  * Always use `node:path` methods (`path.join()`, `path.resolve()`, `path.normalize()`) or forward slashes (`/`).
  * Never hardcode `\` in regexes or path manipulations.
  * In string splitting or regex matching across text files, always match both line endings using `/\r?\n/` instead of `/\n/`.

### 1.2 Cross-Platform Globbing & Shell Expansion
* **Problem:** Linux Bash shells do not recursively expand `**/*.ts` without explicit shell options (`shopt -s globstar`). Running commands like `tsc src/**/*.ts` or `rimraf dist/**/*.js` directly in `package.json` scripts will fail or miss subdirectories on Linux runners.
* **Resolution:** Never rely on shell glob expansion in `package.json`. Multi-file operations, compilation, and cleanups must be routed through deterministic Node.js helper scripts (e.g. [`scripts/build.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/build.js) or standard `tsconfig.json`).

---

## 🌐 2. Google Jules Cloud API Gotchas

### 2.1 REST API Request Body (`prompt` vs `message`)
* **Problem:** When sending messages to an active Jules cloud session via `POST /sessions/{sessionId}:sendMessage`, Google's API gateway strictly expects the JSON payload key to be `prompt`.
* **Trap:** Passing `{ "message": "hello" }` will be silently rejected or result in a `400 Bad Request` from the cloud endpoint.
* **Resolution:** Always format outbound message payloads as:
  ```json
  {
    "prompt": "<user message or prompt text>"
  }
  ```

### 2.2 Validation Order Precedence (Offline Test Safety)
* **Problem:** Unit tests must be capable of validating input schemas and catching syntax errors completely offline without making network requests or requiring API keys.
* **Trap:** If a function reads `process.env.JULES_API_KEY` or attempts secret resolution before validating arguments, tests passing invalid arguments will fail with "API Key missing" instead of the expected validation error.
* **Resolution:** Core routines (such as [`deploySessionCore`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/deploy_session.ts)) must validate all user inputs, parameters, and options *first* before verifying network connectivity or API tokens.

### 2.3 Unhandled Promise Rejections in MCP Tools
* **Problem:** If an async tool handler throws an unhandled rejection in MCP server mode, the JSON-RPC connection can terminate abruptly, breaking the IDE connection.
* **Resolution:** Every MCP tool handler in [`scripts/mcp_server.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp_server.ts) must wrap operations in `try ... catch` and return a structured error response with `{ isError: true, content: [{ type: 'text', text: error.message }] }`.

---

## 💾 3. State, Storage & Persistence Pitfalls

### 3.1 Atomic JSON File Persistence
* **Problem:** Concurrently writing or partially writing to `.jules-companion/sessions.json` or `.jules-companion/schedules.json` can corrupt session records.
* **Resolution:** Never perform raw `fs.writeFileSync()` on state files directly. Always route read/write cycles through atomic storage helpers:
  * [`saveSessions`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts)
  * [`saveScheduledTasks`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts)
* **Scratch Cleanliness:** When archiving or deleting sessions, always invoke [`cleanSessionScratch`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts) to purge temporary `.patch`, `.diff`, and `visual_diff/` remnants from `.jules-companion/scratch/`.

### 3.2 Secret Storage vs Environment Variables
* **Runtime Distinction:**
  * **VS Code Extension Mode:** Sensitive keys are stored in `context.secrets` (VS Code OS SecretStorage keychain).
  * **MCP Standalone & CLI Mode:** Tools read from `process.env.JULES_API_KEY` and `process.env.GEMINI_API_KEY`.
* **Guardrail:** Never commit `.env` or write plaintext secrets into session records or log files.

---

## 🧪 4. Testing & CI Mocking Traps

### 4.1 Headless VS Code Mocking in Bare Node.js
* **Problem:** The codebase contains both VS Code extension UI modules and standalone CLI/MCP tools. Running tests in bare Node.js causes `import * as vscode from 'vscode'` to fail with `Cannot find module 'vscode'`.
* **Resolution:** The test runner [`scripts/run_tests.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/run_tests.js) and [`scripts/setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts) dynamically mock the `vscode` module in `node_modules/vscode`. Do not import or call VS Code runtime-only APIs in core domain scripts.

### 4.2 Auto-Modification of `registry.json` during Test Runs
* **Problem:** Running the unit test suite exercises the `createCustomAgentScaffold` routine, which registers a test persona in [`references/agents/registry.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json).
* **Trap:** Git status will show [`references/agents/registry.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json) as modified after running tests.
* **Resolution:** Always run:
  ```bash
  git checkout references/agents/registry.json
  ```
  after test runs to keep the working tree clean and prevent accidental commit of test agent registrations.

### 4.3 Isolated TSDoc Blocks for Exported Constants
* **Problem:** [`tests/doc_coverage.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/doc_coverage.test.ts) strictly enforces 100% TSDoc coverage on all exported symbols.
* **Trap:** If an exported constant (e.g. `export const TEAM_PRESETS = ...`) is placed directly before an exported function without its own separate TSDoc comment block, the parser associates the docstring with the function only, causing doc coverage to drop and tests to fail.
* **Resolution:** Every exported constant, type, and function must have its own dedicated `/** ... */` comment block directly preceding its declaration.

---

## ⚙️ 5. CLI & MCP Dispatching Traps

### 5.1 CLI Argument Parser Multi-Mapping (`parseArgs`)
* **Problem:** CLI callers can invoke actions using multiple aliases (e.g., `--inspect <id>`, `--approve <id>`, `--session <id>`).
* **Trap:** `parseArgs` puts values into `params[flagName]`. Relying strictly on `params.session` will fail when the user uses `--inspect` or `--approve`.
* **Resolution:** Standardize session ID extraction using the fallback chain:
  ```typescript
  const inspectId = typeof params.inspect === 'string' ? params.inspect : undefined;
  const approveId = typeof params.approve === 'string' ? params.approve : undefined;
  const sessionId = params.session || params.sessions || params.id || inspectId || approveId;
  ```

### 5.2 Global IDE MCP Schema Synchronization
* **Problem:** When MCP tool parameters or schemas change, IDEs running in background sessions may retain stale tool definitions.
* **Resolution:** [`scripts/sync_global.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/sync_global.ts) must unconditionally overwrite tool definitions in `~/.gemini/antigravity-ide/mcp/jules-companion/` to ensure schema synchronization.

---

## 🛠️ 6. Quick Recovery Recipes

| Symptom / Failure | Root Cause | Quick Fix Command |
| :--- | :--- | :--- |
| `references/agents/registry.json` dirty after test | Test scaffolding wrote test agent | `git checkout references/agents/registry.json` |
| `Cannot find module 'vscode'` | VS Code mock missing in test environment | Run via `npm test` or `node scripts/run_tests.js` |
| Doc coverage test fails | Missing TSDoc block on exported const/function | Add `/** Description */` above symbol; recheck with `npx ts-node tests/doc_coverage.test.ts` |
| Stale scratch files accumulating | Interrupted session checkout/merge | Run `node scripts/jules_clean.js` or storage purge |
| TypeScript build type mismatch | `dist/` out of sync with source | `npm run build && npm run verify` |
