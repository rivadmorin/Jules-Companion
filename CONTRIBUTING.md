# Contributing to Jules Companion 🐙

Thank you for your interest in contributing to **Jules Companion**! We warmly welcome contributions from both human developers and autonomous AI coding agents.

This guide outlines our architecture, engineering principles, development workflow, and testing requirements to ensure long-term stability, zero architectural regressions, and maintainability.

---

## 📜 Table of Contents
1. [Core Development Philosophy (Ponytail)](#-core-development-philosophy)
2. [Development Environment Setup](#-development-environment-setup)
3. [Architecture Invariants & Governance](#-architecture-invariants--governance)
4. [Contributor & AI Agent Tooling (Ponytail, Sentrux & Graphify)](#-contributor--ai-agent-tooling-ponytail-sentrux--graphify)
5. [Coding Standards & Style Guide](#-coding-standards--style-guide)
6. [Step-by-Step Developer Playbooks](#-step-by-step-developer-playbooks)
   - [Adding a New VS Code Command](#1-adding-a-new-vs-code-command)
   - [Implementing a New MCP Tool](#2-implementing-a-new-mcp-tool)
   - [Authoring a New Specialist Agent](#3-authoring-a-new-specialist-agent)
7. [Testing & Verification Protocol](#-testing--verification-protocol)
8. [Git Workflow & Commit Standards](#-git-workflow--commit-standards)
9. [Packaging & Local Installation](#-packaging--local-installation)
10. [Release Process & CI/CD](#-release-process--cicd)
11. [Security & Vulnerability Reporting](#-security--vulnerability-reporting)

---

## ⚡ Core Development Philosophy

Our project strictly adheres to the [**Ponytail (`DietrichGebert/ponytail`)**](https://github.com/DietrichGebert/ponytail) development philosophy. We prioritize maintainability, extreme simplicity, and zero dead code over clever abstractions:

* **YAGNI (You Aren't Gonna Need It)**: Refuse to build speculative abstractions. Do not create interfaces with a single implementation, generic factories for a single class, or configuration flags for values that do not change.
* **Standard Library First**: Always leverage native Node.js standard modules (`node:fs`, `node:path`, `node:https`, `node:crypto`, `node:child_process`, `node:test`, `node:assert`) before considering third-party npm packages.
* **Shortest Working Diff**: Touch only the exact target lines necessary to resolve the task. Avoid unsolicited refactoring, stylistic reformatting, or collateral edits.
* **Fix Root Causes**: Investigate and fix the shared root cause at the bottleneck rather than patching superficial symptoms across multiple call sites.
* **Deletion Over Addition**: Deleting obsolete code and simplifying logic is always preferred over introducing complex layers.

---

## 💻 Development Environment Setup

### 1. Prerequisites
* **Node.js**: Version 20.0.0 or higher (Active LTS Node 20 or 22 recommended; `@vscode/vsce` v4 packaging requires Node 20+).
* **npm**: Version 9.0.0 or higher.
* **Git**: Installed and accessible in your system `PATH`.
* **VS Code** or **Google Antigravity IDE**: Recommended IDE with the TypeScript language service.
* **Google Jules API Key**: Optional for running unit tests, required for live deployment testing ([Jules Console](https://jules.google)).

### 2. Initial Setup
```bash
# 1. Clone the repository
git clone https://github.com/rivadmorin/Jules-Companion.git
cd Jules-Companion

# 2. Install dependencies (MCP SDK, vsce packaging, Sentrux)
npm install

# 3. Configure environment variables (optional for local mock testing)
cp .env.example .env
# Edit .env and insert your JULES_API_KEY and GEMINI_API_KEY

# 4. Build the TypeScript codebase (must be run before setup to produce dist/)
npm run build

# 5. Verify workspace setup & agent registry
npm run setup
```

### 3. Running & Debugging in VS Code
1. Open the project folder in VS Code or Antigravity IDE:
   ```bash
   code .
   ```
2. Press <kbd>F5</kbd> (or go to **Run and Debug** ➔ select **Run Extension**).
3. A new **Extension Development Host** window will open with Jules Companion loaded.
4. Open the Command Palette (<kbd>Ctrl+Shift+P</kbd> or <kbd>Cmd+Shift+P</kbd>) and test commands such as `Jules: Open Session Action Center` or `Jules: Deploy Session`.

---

## 🏛️ Architecture Invariants & Governance

The codebase is governed by architectural rules defined in `.sentrux/rules.toml` and documented in [Codebase Architecture Map](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/docs/codebase-architecture-map.md).

```
Tier 0: Tests (tests/)
   │
   ▼
Tier 1: Interfaces (scripts/extension.ts, scripts/mcp_server.ts)
   │
   ▼
Tier 2: Tools & UI (scripts/mcp/, scripts/ui/)
   │
   ▼
Tier 3: Workflows & Engines (scripts/deploy_session.ts, scripts/merge_session.ts)
   │
   ▼
Tier 4: API Client (scripts/client/jules_api.ts, scripts/client/http.ts)
   │
   ▼
Tier 5: Foundation (scripts/core/types.ts, scripts/core/storage.ts, scripts/core/git.ts, scripts/utils.ts)
```

### Inviolable Invariants:
1. **Strict Downward Layering**: Lower tiers must **never** import modules from higher tiers. For example, `scripts/core/` must never import from `scripts/ui/` or `scripts/mcp/`.
2. **100% TSDoc Coverage**: Every exported symbol (`export function`, `export class`, `export interface`, `export type`, `export const`) must have a complete TSDoc comment block:
   ```typescript
   /**
    * @module CoreStorage
    */

   /**
    * Loads session records from the local storage file.
    * 
    * @param baseDir - Workspace root directory containing .jules/
    * @returns Array of active and completed SessionRecords
    */
   export function loadSessions(baseDir: string): SessionRecord[] { ... }
   ```
   *Enforced automatically by `tests/doc_coverage.test.ts`.*
3. **Webview Content Security Policy (CSP)**:
   - Inline script execution is strictly forbidden (`<script>...</script>` without nonce or inline `onclick="..."`).
   - Use `data-action` attributes and centralized event delegation.
4. **Plan Approval vs User Feedback**:
   - `AWAITING_PLAN_APPROVAL` requires plan review (`approvePlanApi`).
   - `AWAITING_USER_FEEDBACK` / `AWAITING_USER_INPUT` requires conversational response (`sendMessageApi`).
   - Never conflate these two states in the UI or API layers.

---

## 🛠️ Contributor & AI Agent Tooling (Ponytail, Sentrux & Graphify)

To ensure that every human contributor and autonomous AI coding agent works with the exact same standards and toolset as the maintainers, this project requires and integrates three open-source governance and navigation tools:

### 1. Ponytail — The Pragmatic Senior Developer Engine
* **GitHub Repository**: [**`https://github.com/DietrichGebert/ponytail`**](https://github.com/DietrichGebert/ponytail)
* **What it does**: Enforces extreme pragmatism and anti-overengineering. It tells AI coding assistants (and reminds developers) to stop writing speculative scaffolding, prefer the Node.js standard library, make surgical diffs, and delete unnecessary code.
* **How to Install & Configure**:
  * **Google Antigravity CLI / Gemini CLI**:
    ```bash
    gemini extensions install https://github.com/DietrichGebert/ponytail
    # or
    agy plugin install https://github.com/DietrichGebert/ponytail
    ```
  * **Pi Coding Agent**:
    ```bash
    pi install git:github.com/DietrichGebert/ponytail
    ```
  * **OpenClaw**:
    ```bash
    clawhub install ponytail
    ```
  * **VS Code / Cursor / Windsurf / Copilot**:
    Install or copy the matching steering rules from the [Ponytail repository](https://github.com/DietrichGebert/ponytail) into your editor (`.cursor/rules/ponytail.md`, `.windsurf/rules/ponytail.md`, or `.github/copilot-instructions.md`).
* **Available Commands**:
  - `/ponytail full`: Enforces default senior developer mode.
  - `/ponytail-review`: Runs an anti-bloat code review focusing solely on simplifying complex code.
  - `/ponytail-audit`: Scans the entire codebase for speculative abstractions to delete.
  - `/ponytail-debt`: Harvests deferred shortcuts into a structured ledger.

### 2. Sentrux — AI Architectural Linter & Quality Sensor
* **GitHub Repository**: [**`https://github.com/sentrux/sentrux`**](https://github.com/sentrux/sentrux)
* **What it does**: Acts as an automated architectural firewall. It enforces our 6-tier downward dependency hierarchy, prevents circular dependencies (`max_cycles = 0`), and monitors codebase structural health.
* **How to Install**:
  * Via Rust Cargo:
    ```bash
    cargo install sentrux
    ```
  * Or download the prebuilt binary for your OS from [Sentrux Releases](https://github.com/sentrux/sentrux/releases).
* **Configuration**:
  Governance rules are defined in [`.sentrux/rules.toml`](.sentrux/rules.toml).
* **Execution & Verification**:
  ```bash
  # Check architectural layering and circular dependencies:
  sentrux check .
  # or via npm shortcut:
  npm run sentrux:check

  # Full pre-submission verification gate:
  npm run verify
  ```

### 3. Graphify — Codebase Knowledge Graph & Architecture Navigation
* **GitHub Repository**: [**`https://github.com/safishamsi/graphify`**](https://github.com/safishamsi/graphify)
* **What it does**: Maps the entire codebase into a queryable knowledge graph with community detection, god nodes analysis, cross-community bridge identification, and interactive visualization.
* **Persistent Artifacts**:
  - [`graphify-out/graph.html`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/graph.html): Interactive graph visualization (open in any browser).
  - [`graphify-out/GRAPH_REPORT.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/GRAPH_REPORT.md): Audit report detailing god nodes, surprises, and community clusters.
  - [`graphify-out/graph.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/graph.json): Machine-readable knowledge graph for AI agent exploration.
* **Commands**:
  ```bash
  # Query the knowledge graph:
  graphify query "<question>"

  # Update the graph incrementally after modifying files:
  npm run graphify:update
  # or: graphify update .
  ```
* **Git Hook & Merge Driver**:
  - Automatically re-extracts AST changes upon `git commit` via `.git/hooks/post-commit` (configured via `npm run prepare`).
  - Automatically merges `graph.json` without merge conflicts via `.gitattributes`.

---

## 📝 Coding Standards & Style Guide

* **TypeScript Configuration**: We compile with strict mode (`strict: true`, `noImplicitAny: true`, `target: ES2022`).
* **Path Handling**: Always use `node:path` methods (`path.join()`, `path.resolve()`) for filesystem paths to ensure cross-platform compatibility across Windows, macOS, and Linux.
* **Error Handling**: Never swallow exceptions silently. Wrap async operations in `try/catch` and provide meaningful user notifications via `vscode.window.showErrorMessage` or structured JSON-RPC errors.
* **No Unnecessary Dependencies**:
  - Need UUIDs? Use `node:crypto.randomUUID()`.
  - Need HTTP? Use native `node:https`.
  - Need test assertions? Use `node:assert/strict`.
  - Need testing framework? Use native `node:test`.

---

## 🛠️ Step-by-Step Developer Playbooks

### 1. Adding a New VS Code Command

1. **Declare the command in `package.json`**:
   ```json
   "contributes": {
     "commands": [
       {
         "command": "jules.myNewCommand",
         "title": "Jules: My New Command",
         "category": "Jules"
       }
     ]
   }
   ```
2. **Implement the command handler in [`scripts/extension.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/extension.ts)**:
   ```typescript
   /**
    * Handles execution of my new command.
    * 
    * @param context - VS Code extension context
    * @returns Promise resolving when command finishes
    */
   export async function handleMyNewCommand(context: vscode.ExtensionContext): Promise<void> {
     try {
       // Command logic here
       vscode.window.showInformationMessage('Command executed successfully!');
     } catch (err: unknown) {
       vscode.window.showErrorMessage(`Execution failed: ${err instanceof Error ? err.message : String(err)}`);
     }
   }
   ```
3. **Register the command in `activate()`**:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('jules.myNewCommand', () => handleMyNewCommand(context))
   );
   ```
4. **Add a unit test in `tests/`** and verify with `npm test`.

---

### 2. Implementing a New MCP Tool

1. **Define the tool specification in [`scripts/mcp/registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/registry.ts)**:
   ```typescript
   {
     name: "my_custom_tool",
     description: "Performs custom diagnostic analysis on the workspace.",
     inputSchema: {
       type: "object",
       properties: {
         target_path: { type: "string", description: "Target directory path" }
       },
       required: ["target_path"]
     }
   }
   ```
2. **Implement the tool handler in [`scripts/mcp/tools/my_custom_tool.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/)** with full TSDoc.
3. **Register the handler in `scripts/mcp/registry.ts`**.
4. **Add unit test in [`tests/mcp.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/mcp.test.ts)** verifying tool registration and parameter execution.

---

### 3. Authoring a New Specialist Agent

1. Create a new markdown definition file in [`references/agents/<role-id>.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/):
   ```markdown
   ---
   id: database_expert
   name: Database Expert
   role: database_expert
   group: coding
   description: Specialized database optimization and schema migration agent.
   ---

   # Database Expert Specialist Persona
   You are an autonomous Google Jules specialist focused on SQL query optimization, migration scripts, and indexing strategies.
   ```
2. **Recompile the agent catalog**:
   ```bash
   npm run registry
   ```
3. Verify that `references/agents/registry.json` is updated with your new persona.

---

## 🧪 Testing & Verification Protocol

We use the native Node.js test runner (`node:test`) for zero-overhead, ultra-fast test execution.

```bash
# Run all 114 tests across 38 test suites
npm test

# Run a specific test suite directly
node --test dist/tests/scheduler.test.js
node --test dist/tests/action_center.test.js
node --test dist/tests/doc_coverage.test.ts
```

### Test Suite Coverage:
* [`tests/doc_coverage.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/doc_coverage.test.ts): Verifies 100% TSDoc comment blocks on every exported symbol.
* [`tests/scheduler.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/scheduler.test.ts): Task scheduler persistence, due task discovery, cancellation.
* [`tests/action_center.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/action_center.test.ts): QuickPick Action Center items, context resolution, and action routing.
* [`tests/activity_channel.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/activity_channel.test.ts): OutputChannel streaming, session header logging, and plan step tracking.
* [`tests/status_bar.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/status_bar.test.ts): Priority status bar item, spinner animations, and tooltip summaries.
* [`tests/sessions_provider.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/sessions_provider.test.ts): TreeView items, expandable nodes, universal session ID resolver.
* [`tests/mcp.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/mcp.test.ts): MCP 20-tool registry, schemas, and execution handlers.
* [`tests/merge_session.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/merge_session.test.ts): Safety Gate enforcement and clean working tree checks.

---

## 🔀 Git Workflow & Commit Standards

### 1. Branch Naming
* `feat/<feature-name>`: New functionality.
* `fix/<bug-name>`: Bug fixes and error handling patches.
* `docs/<topic>`: Documentation updates.
* `refactor/<target>`: Code simplification and cleanup.

### 2. Commit Message Convention
We adhere to [Conventional Commits](https://www.conventionalcommits.org/):
```text
feat(scheduler): implement recurring cron task scheduling
fix(action_center): resolve fallback items when no active session is selected
docs(codebase): document 10-chapter master architecture reference
test(mcp): add unit tests for dynamic tool registration
```

---

## 📦 Packaging & Local Installation

To build and verify the VSIX package locally:
```bash
# Package into jules-companion-1.1.0.vsix
npm run package

# Install directly into VS Code
code --install-extension jules-companion-1.1.0.vsix

# Install directly into Antigravity IDE (if installed)
antigravity --install-extension jules-companion-1.1.0.vsix
```

---

## 🚀 Release Process & CI/CD

Our release pipeline is fully automated via GitHub Actions:

1. **Pull Request Validation** ([`.github/workflows/ci.yml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.github/workflows/ci.yml)):
   - Runs on Ubuntu & Windows matrix across Node.js 20 and 22.
   - Verifies cross-platform TypeScript compilation via [`scripts/build.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/build.js), runs all 115 tests in headless CI environments, enforces 100% TSDoc coverage, and validates VSIX packaging.
2. **Automated Release** ([`.github/workflows/release.yml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.github/workflows/release.yml)):
   - Triggered by pushing a version tag (e.g. `git tag -a v1.1.0 -m "Release v1.1.0"`).
   - Generates release notes from [`CHANGELOG.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/CHANGELOG.md).
   - Publishes a GitHub Release with the compiled `.vsix` binary attached as an asset.

---

## 🔒 Security & Vulnerability Reporting

* **Never commit secrets**: Keep `.env`, API keys, and sensitive tokens out of version control.
* **Secret Storage**: Use VS Code `context.secrets` for persistent credential storage.
* **Reporting Security Issues**: If you discover a security vulnerability or CSP bypass, please do **NOT** open a public issue. Email security reports directly to the maintainers or report via GitHub Security Advisories.
