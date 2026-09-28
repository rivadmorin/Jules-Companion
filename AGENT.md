# AGENT.md - AI Coding Agent Operating Manual
**Target Audience:** Autonomous AI Coding Agents (Antigravity CLI, Google Jules, Claude Code, Copilot, Codex, Hermes, Cursor, Windsurf)

---

## 🤖 Welcome, AI Agent!

You are operating within the **Jules Companion** repository. This codebase is an enterprise orchestration platform connecting IDEs (Visual Studio Code and Google Antigravity IDE) and external AI models (via Model Context Protocol) with Google Jules Cloud autonomous agents.

This document outlines the **non-negotiable operating rules, architectural invariants, and verification protocols** you must follow when inspecting, modifying, or extending this repository.

---

## ⚡ Golden Rules for AI Agents

Whenever you work on this repository, strictly adhere to the following principles:

### 1. Ponytail Mode is Permanently Active (Lazy Senior Developer)
* **YAGNI (You Aren't Gonna Need It)**: Refuse to build speculative abstractions, single-use factory functions, or unrequested configuration options.
* **Standard Library First**: Use native Node.js standard modules (`node:fs`, `node:path`, `node:https`, `child_process`, `node:test`, `node:assert`). Never introduce new `npm` dependencies for what standard library or native platform features can accomplish.
* **Shortest Working Diff**: Make surgical, minimal edits. Touch only the exact target lines necessary to resolve the task. Do not reformat unrelated code, alter whitespace style, or perform unsolicited cleanup.
* **Fix Root Causes**: Trace errors to their shared bottleneck and fix them once at the root rather than patching superficial symptoms across multiple callers.

### 2. 100% TSDoc Coverage is Mandatory
Every exported symbol (`export function`, `export class`, `export interface`, `export type`, `export const`) **must** include a valid JSDoc/TSDoc block:
* `@module <name>` header at the top of the file.
* Clear summary of purpose and side-effects.
* `@param <argName>` tags for every parameter.
* `@returns` tag documenting return value or resolved promise.
* **Note**: Any omission will cause `tests/doc_coverage.test.ts` to fail during `npm test`.

### 3. Strict Layering & Zero Circular Dependencies
* Never violate the downward dependency hierarchy:
  `tests/` ➔ `interfaces/` (`extension.ts`, `mcp_server.ts`) ➔ `tools & UI/` ➔ `workflows & core/` ➔ `client/` ➔ `foundation/` (`types.ts`, `storage.ts`, `git.ts`).
* Foundation modules (`scripts/core/*`, `scripts/client/*`) must **never** import from `scripts/ui/*` or `scripts/mcp/*`.
* Enforced by `.sentrux/rules.toml`.

### 4. Status Disambiguation: Plan Approval vs User Feedback
* **`AWAITING_PLAN_APPROVAL`**: The cloud agent has formulated an execution plan and paused for authorization. Action required: `approvePlanApi` (`jules.approvePlan`).
* **`AWAITING_USER_FEEDBACK` / `AWAITING_USER_INPUT`**: The cloud agent is asking for clarification or conversational input. Action required: `sendMessageApi` (`jules.sendMessage`).
* **Inviolable Invariant**: Never display a plan approval form or trigger plan approvals when the session status indicates user input/feedback.

### 5. Content Security Policy (CSP) in Webviews
* Never inject inline event handlers (`onclick="..."`, `onsubmit="..."`) into Webview HTML.
* All interactive elements must use semantic data attributes: `data-action="<action-name>" data-session-id="<id>"`.
* The Webview script must handle events via centralized event delegation (`document.addEventListener('click', ...)`).

### 6. Fail-Safe Git Safety Gate
* Before executing any Git merge (`mergeSessionCore`), you must verify:
  1. Cloud session status is strictly `SUCCEEDED`.
  2. Local Git working tree is completely clean (`git status --porcelain` is empty).
* If either check fails, the merge must be safely rejected.

---

## 🗺️ Codebase Map for AI Navigation

| Subsystem | Key Files | Purpose & Architectural Role |
|---|---|---|
| **Domain Contracts** | [`scripts/core/types.ts`](scripts/core/types.ts) | Universal domain types (`SessionRecord`, `ScheduledTask`, `LaunchMode`, etc.). |
| **Local Storage** | [`scripts/core/storage.ts`](scripts/core/storage.ts) | Atomic JSON persistence for `.jules/sessions.json` and project directories. |
| **Task Scheduler** | [`scripts/core/scheduler.ts`](scripts/core/scheduler.ts) | Standalone background task scheduler for `.jules-companion/schedules.json`. |
| **Git Operations** | [`scripts/core/git.ts`](scripts/core/git.ts) | Safe subprocess wrapper around Git CLI. |
| **API Client** | [`scripts/client/http.ts`](scripts/client/http.ts), [`scripts/client/jules_api.ts`](scripts/client/jules_api.ts) | Google Jules Cloud REST API client using native HTTPS. |
| **Session Engine** | [`scripts/deploy_session.ts`](scripts/deploy_session.ts), [`scripts/merge_session.ts`](scripts/merge_session.ts) | Core deployment logic for 4 launch modes and pre-merge safety gate. |
| **VS Code UI** | [`scripts/extension.ts`](scripts/extension.ts), [`scripts/ui/`](scripts/ui/) | Extension controller, 33 commands, TreeView providers, LiveSync, and Visual Diff. |
| **Mission Control** | [`scripts/ui/mission_control.ts`](scripts/ui/mission_control.ts) | Webview panel with live state reconciliation and event delegation. |
| **MCP Server** | [`scripts/mcp_server.ts`](scripts/mcp_server.ts), [`scripts/mcp/registry.ts`](scripts/mcp/registry.ts) | Model Context Protocol server exposing 20 native tools via JSON-RPC. |
| **Specialist Agents**| [`references/agents/`](references/agents/), [`references/agents/registry.json`](references/agents/registry.json) | 30 specialist agent role templates and compiled JSON catalog. |
| **Shared Utils** | [`scripts/utils.ts`](scripts/utils.ts) | Status predicates, Doctor checks, date formatting, and session archival. |

---

## 🛠️ AI Agent Workflow Playbook

### Step 1: Research & Orientation (Think in Code)
* When analyzing files, use programmatic sandbox tools (`ctx_execute_file` / `ctx_execute`) rather than dumping raw file contents.
* Check types in `scripts/core/types.ts` before modifying function signatures.

### Step 2: Make the Minimal Surgical Edit
* Apply the shortest working diff using `replace_file_content`.
* Ensure every newly added function or type has a complete TSDoc block with `@param` and `@returns`.

### Step 3: Run the Verification Suite
Always execute the test suite to verify your changes:
```bash
# Must pass 106/106 tests with 0 failures
npm test
```

### Step 4: Synchronize & Package
If modifying specialist agent templates in `references/agents/`:
```bash
npm run registry
```
If updating extension files, verify packaging:
```bash
npm run package
```

---

## 🤖 The 30 Specialist Agents Roster

When acting as or delegating to specialist personas within this repo:
* **`architect`**: Enforces system modularity, clean interfaces, and low coupling.
* **`coder`**: Implements business features with minimal complexity.
* **`inspector`**: Writes unit, integration, and E2E tests for 100% pass rates.
* **`sentinel`**: Audits security, CSP rules, sanitization, and credential handling.
* **`scaler`**: Optimizes performance, async concurrency, and memory efficiency.
* **`curator`**: Maintains architectural documentation, gotchas, and repository references.
* **`scribe`**: Ensures 100% TSDoc comments, API references, and user guides.

Refer to [`docs/codebase/07-agents-and-customization.md`](docs/codebase/07-agents-and-customization.md) for the complete 30-agent catalog.
