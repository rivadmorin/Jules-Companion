# AGENT.md - Autonomous AI Coding Agent Operating Manual

> **Target Audience:** Autonomous AI Coding Agents (Antigravity CLI, Google Jules, Claude Code, GitHub Copilot CLI, OpenAI Codex, Hermes, Cursor, Windsurf)  
> **Repository:** [Jules Companion](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion)  
> **Runtime Environment:** Node.js 18+, TypeScript 5, VS Code Extension Engine, Model Context Protocol (MCP)

---

## 🤖 1. Mission & System Overview

Welcome, AI Agent! You are operating inside the codebase of **Jules Companion**, an enterprise developer orchestration platform that bridges modern IDEs (Visual Studio Code and Google Antigravity IDE) and external LLMs (via Model Context Protocol) with **Google Jules Cloud** autonomous agents.

This manual defines the **non-negotiable operating invariants, architectural boundaries, communication schemas, and verification protocols** that you must strictly uphold.

---

## ⚡ 2. The Golden Invariants (Non-Negotiable)

When inspecting, modifying, refactoring, or extending this codebase, you must adhere to these eight core invariants:

### Invariant 1: Ponytail Mode is Permanently Active (Lazy Senior Developer)
* **Governing Engine**: [**Ponytail** (`DietrichGebert/ponytail`)](https://github.com/DietrichGebert/ponytail) — Anti-overengineering ruleset for AI coding agents.
* **YAGNI (You Aren't Gonna Need It)**: Refuse to build speculative abstractions. Do not create interfaces with a single implementation, factories for a single class, or configuration flags for values that do not change.
* **Standard Library First**: Use native Node.js built-ins (`node:fs`, `node:path`, `node:https`, `node:crypto`, `node:child_process`, `node:test`, `node:assert`). Never introduce new `npm` packages for functionality that standard modules or short helper functions can provide.
* **Shortest Working Diff**: Make surgical edits. Touch only the exact target lines necessary to resolve the task. Zero unsolicited cleanup, style reformatting, or collateral edits.
* **Fix Root Causes**: Trace bugs to their shared bottleneck and patch them once at the root rather than writing workarounds across multiple callers.

### Invariant 2: 100% TSDoc / JSDoc Coverage is Mandatory
Every exported symbol (`export function`, `export class`, `export interface`, `export type`, `export const`) **must** include a comprehensive TSDoc comment block:
* `@module <name>` header at the very top of each file.
* Clear summary of purpose, behavior, and side effects.
* `@param <name>` tag for every parameter, describing its type and semantics.
* `@returns` tag documenting return values or Promise resolutions.
* *Enforcement*: The CI pipeline and [`tests/doc_coverage.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/doc_coverage.test.ts) will immediately fail if even a single exported symbol lacks documentation.

### Invariant 3: Strict Downward Layering & Zero Circular Dependencies
* **Governing Sensor**: [**Sentrux** (`sentrux/sentrux`)](https://github.com/sentrux/sentrux) — AI Codebase Quality Sensor & Architectural Linter.
* Dependencies must flow in a single downward direction:
  $$\text{Tier 0: Tests} \longrightarrow \text{Tier 1: Interfaces} \longrightarrow \text{Tier 2: Tools \& UI} \longrightarrow \text{Tier 3: Core Engines} \longrightarrow \text{Tier 4: Client} \longrightarrow \text{Tier 5: Foundation}$$
* Foundation modules ([`scripts/core/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/) and [`scripts/client/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/)) must **never** import from UI ([`scripts/ui/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/)) or MCP tool handlers ([`scripts/mcp/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/)).
* Enforced statically by Sentrux via [`.sentrux/rules.toml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.sentrux/rules.toml).

### Invariant 4: Status Disambiguation — Plan Approval vs User Feedback
Google Jules Cloud sessions operate with two distinct pausing states that must **never** be conflated:
1. **`AWAITING_PLAN_APPROVAL`**: The cloud agent has formulated an execution plan and paused for human authorization.
   - *Webview UI*: Render the green "Plan Approval Required" banner with the "Approve Plan & Authorize Execution" button.
   - *Action API*: Invoke [`approvePlanApi`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/jules_api.ts) (`jules.approvePlan`).
2. **`AWAITING_USER_FEEDBACK` / `AWAITING_USER_INPUT`**: The cloud agent has paused to ask a clarifying question.
   - *Webview UI*: Render the amber "Agent Paused for Feedback" banner with the conversational input box and "Reply to Agent" button.
   - *Action API*: Invoke [`sendMessageApi`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/jules_api.ts) (`jules.sendMessage`).
* **Rule**: It is a critical regression to display plan authorization buttons when the agent is waiting for user input, or vice-versa.

### Invariant 5: Content Security Policy (CSP) & Event Delegation
* Webview scripts in [`scripts/ui/mission_control.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/mission_control.ts) run under strict CSP nonces.
* **Never** use inline DOM event listeners (`onclick="..."`, `onsubmit="..."`).
* All interactive DOM elements must declare semantic data attributes:
  ```html
  <button class="btn btn-primary" data-action="approve-plan" data-session-id="abc-123">Approve Plan</button>
  ```
* Events are captured exclusively via centralized event delegation in the client-side Webview script:
  ```javascript
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const sessionId = target.getAttribute('data-session-id');
    vscode.postMessage({ command: action, sessionId });
  });
  ```

### Invariant 6: Fail-Safe Pre-Merge Git Safety Gate
Before triggering any automated or manual Git merge ([`mergeSessionCore`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/merge_session.ts)), you must verify two prerequisites:
1. Cloud session status is strictly `SUCCEEDED`.
2. Local working tree is completely clean (`git status --porcelain` returns an empty string).
* If either check fails, the merge operation must abort safely without modifying local branches.

### Invariant 7: Always Synchronize & Update Relevant Documentation on Every Change
Documentation is a mandatory first-class invariant of this repository, **not an afterthought**. Every code change, refactoring, architectural update, or feature addition MUST immediately update all corresponding documentation:
* **User & Installation Guides**: [`README.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/README.md) and [`README.id.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/README.id.md) when CLI commands, extension configuration, or VSIX artifact versions change.
* **Architecture & Subsystems**: Files in [`docs/codebase/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/docs/codebase/) and [`docs/codebase-architecture-map.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/docs/codebase-architecture-map.md) whenever function signatures, method catalogs, sequence diagrams, dependency structures, or Sentrux quality metrics change.
* **Release Records**: [`CHANGELOG.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/CHANGELOG.md) under the appropriate version header.
* **Agent Manuals**: [`AGENT.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/AGENT.md) and [`CONTRIBUTING.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/CONTRIBUTING.md) whenever test counts, invariants, or checklists evolve.
* **Rule**: Never declare a task, commit, or pull request complete if the surrounding documentation remains stale or desynchronized.

### Invariant 8: Cross-Platform Build & CI/CD Pipeline Integrity
Continuous Integration (CI) and automated releases ([`.github/workflows/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.github/workflows/)) run on both **Ubuntu Linux** and **Windows** across modern LTS Node.js runtimes (20.x, 22.x). To maintain build reliability:
* **Zero Shell Globbing Dependencies**: Never invoke commands in `package.json` that rely on shell-specific globbing syntax (e.g. `scripts/**/*.ts` fails in Linux bash). Always use Node.js script orchestrators like [`scripts/build.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/build.js) that recursively walk directories in a cross-platform manner.
* **Strict Build-Before-Run Ordering**: Never execute compiled artifacts in `dist/` (e.g., `dist/setup.js` or `npm run setup`) before `npm run build` has produced them. Clean CI checkouts have empty/non-existent `dist/` directories.
* **Headless & Offline Test Resilience**: Test suites and CLI commands must execute reliably without a live graphical VS Code window or live API credentials:
  - Mock environments (e.g., `node_modules/vscode`) must be scaffolded automatically by setup and test runner scripts ([`scripts/run_tests.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/run_tests.js), [`scripts/setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts)).
  - Parameter and branch validations must execute **before** credential checks (e.g., in [`scripts/deploy_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/deploy_session.ts)) so unit tests can validate bad inputs without needing `JULES_API_KEY`.
* **Runtime & Tooling Compatibility**: Extension packaging via `@vscode/vsce` v4 requires Node.js >= 20.0.0. Ensure CI matrices and developer instructions target modern active Node.js LTS (20.x, 22.x).
* **Green CI Gate Before Release**: Never publish a release, tag a version, or merge PRs without verifying that all CI matrix jobs pass cleanly (`gh run list` / `gh run view`).

---

## 🛠️ 3. Contributor & AI Agent Tooling Suite: Ponytail & Sentrux

To guarantee zero over-engineering and strict architectural compliance, this repository requires both human developers and autonomous AI agents to operate with the same standard tools:

### 1. Ponytail — The Pragmatic Senior Developer Engine
* **Repository**: [`https://github.com/DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail)
* **Purpose**: Prevents speculative code, kills boilerplate, and forces the simplest solution that actually works (YAGNI, stdlib first, shortest working diff).
* **AI Agent Installation & Activation**:
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
  * **Cursor / Windsurf / Copilot / Claude Code**:
    Copy rules from [Ponytail repository](https://github.com/DietrichGebert/ponytail):
    - Cursor: `.cursor/rules/ponytail.md`
    - Windsurf: `.windsurf/rules/ponytail.md`
    - Copilot: `.github/copilot-instructions.md`
    - Qoder / Cline: `AGENTS.md`
* **Agent Slash Commands**:
  - `/ponytail full`: Activates full intensity mode (default).
  - `/ponytail-review`: Conducts an anti-complexity code review on the git diff.
  - `/ponytail-audit`: Scans the entire repo for dead code and unneeded abstractions.
  - `/ponytail-debt`: Harvests deferred shortcuts into a structured ledger.

### 2. Sentrux — AI Architectural Linter & Quality Sensor
* **Repository**: [`https://github.com/sentrux/sentrux`](https://github.com/sentrux/sentrux)
* **Purpose**: Enforces acyclic graph dependencies, strict 6-tier downward layering, and detects structural code decay.
* **Installation**:
  ```bash
  cargo install sentrux
  # Or download prebuilt release binaries from https://github.com/sentrux/sentrux/releases
  ```
* **Repository Ruleset**: [`.sentrux/rules.toml`](.sentrux/rules.toml)
* **Verification Commands**:
  ```bash
  # Check architectural layering and circular dependencies
  sentrux check .
  # or via npm script:
  npm run sentrux:check

  # Compare architecture condition against baseline gate
  sentrux gate .
  ```

---

## 🗺️ 4. Codebase Architectural Navigation Map

```
Jules-Companion/
├── scripts/
│   ├── core/                        # Tier 5: Foundation Layer
│   │   ├── types.ts                 # Universal TypeScript contracts and interfaces
│   │   ├── storage.ts               # Atomic JSON storage (.jules/sessions.json)
│   │   ├── scheduler.ts             # Background Task Scheduler engine (.jules-companion/schedules.json)
│   │   └── git.ts                   # Git CLI subprocess abstractions
│   ├── client/                      # Tier 4: Communication Layer
│   │   ├── http.ts                  # Native HTTPS transport engine (zero dependencies)
│   │   └── jules_api.ts             # Google Jules Cloud REST API endpoints
│   ├── deploy_session.ts            # Tier 3: Core Deployment Engine (4 launch modes)
│   ├── merge_session.ts             # Tier 3: Core Merge Engine & Safety Gate
│   ├── jules_client.ts              # Tier 3: Consolidated Jules client facade
│   ├── ui/                          # Tier 2: VS Code Presentation Layer
│   │   ├── mission_control.ts       # Real-time Webview dashboard & CSP event router
│   │   ├── sessions_provider.ts     # TreeDataProvider for Jules Sessions explorer
│   │   ├── scheduled_provider.ts    # TreeDataProvider for Scheduled Tasks explorer
│   │   ├── agents_provider.ts       # TreeDataProvider for 30 Specialist Agents
│   │   ├── workspace_provider.ts    # TreeDataProvider for Workspace health & Git context
│   │   ├── visual_diff.ts           # Unified diff parser & Gemini AI explanation panel
│   │   ├── live_sync.ts             # Background polling engine with adaptive backoff
│   │   └── custom_agent_wizard.ts   # Interactive multi-step agent creation wizard
│   ├── mcp/                         # Tier 2: MCP Tool Registry & Handlers
│   │   ├── registry.ts              # 20 modular native MCP tool declarations
│   │   └── tools/                   # Individual tool handler implementations
│   ├── extension.ts                 # Tier 1: VS Code Extension Entrypoint (33 commands)
│   ├── mcp_server.ts                # Tier 1: Standalone JSON-RPC MCP Server Entrypoint
│   └── utils.ts                     # Tier 5: Shared utilities, Doctor checks, status helpers
├── references/                      # Specialist Agent Markdown definitions
│   └── agents/
│       ├── registry.json            # Compiled catalog of 30 specialist agents
│       └── *.md                     # 30 individual agent prompt definitions
├── tests/                           # Tier 0: Native Node.js Test Suite (106 tests)
│   ├── doc_coverage.test.ts         # 100% TSDoc coverage enforcement
│   ├── scheduler.test.ts            # Task Scheduler test suite
│   ├── mission_control.test.ts      # Webview rendering & CSP test suite
│   ├── sessions_provider.test.ts    # TreeDataProvider test suite
│   ├── mcp.test.ts                  # MCP registry and tool execution tests
│   └── merge_session.test.ts        # Pre-merge safety gate tests
└── docs/codebase/                   # Master Architecture Reference Suite (10 chapters)
```

---

## 🛠️ 5. AI Agent Operating Playbook

When executing tasks in this repository, follow this step-by-step workflow:

### Step 1: Context Gathering (Think in Code)
* **Never dump entire files into conversation context.** Use [`context-mode`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/docs/codebase/00-master-architecture.md) tools (`ctx_execute_file` / `ctx_execute`) to programmatically inspect AST, search symbols, and compute diffs.
* Consult [`scripts/core/types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts) first before changing function signatures or data structures.

### Step 2: Implement the Minimal Surgical Fix
* Modify only the target files. Use `replace_file_content` for surgical line replacements.
* Ensure every added or modified exported symbol contains full TSDoc tags (`@module`, `@param`, `@returns`).

### Step 3: Run the Verification Suite
Execute the native test runner via PowerShell:
```powershell
npm test
```
* **Success Criteria**: 108 tests across 35 suites must pass with `0 failures`.
* If any test fails, analyze the failure root cause immediately and patch it.

### Step 4: Recompile & Verify Packaging
```powershell
# Compile TypeScript files
npm run build

# If agent files in references/agents/ were touched, recompile the catalog
npm run registry

# Verify VSIX package bundling
npm run package
```

### Step 5: Sync to Local IDE Extensions (If Modifying Extension)
If you made changes that affect the live VS Code or Antigravity IDE runtime, copy the compiled output:
```powershell
npm run sync
```

---

## 🔌 6. Model Context Protocol (MCP) Tool Calling Reference

Jules Companion exposes **20 native MCP tools**. When interacting as an AI agent via MCP, use these exact schemas:

### 1. `deploy_session`
Deploys a new autonomous session to Google Jules Cloud. Supports 4 distinct launch modes:
```json
{
  "prompt": "Refactor authentication middleware to use JWT standard library",
  "agent": "architect",
  "launch_mode": "plan_approval",
  "auto_pr": false
}
```
* `launch_mode` options:
  - `"one_shot"`: Autonomous execution with auto-merge upon completion.
  - `"plan_approval"`: Agent halts after planning and requires explicit user authorization.
  - `"scheduled"`: Session is registered in the Task Scheduler to execute at a specific timestamp.
  - `"chat"`: Interactive multi-turn conversational session.

### 2. `merge_session`
Inspects and merges the code changes from a completed Jules session:
```json
{
  "session_id": "sessions/20260928-auth-refactor"
}
```

### 3. `send_session_message`
Replies to an agent waiting in `AWAITING_USER_INPUT` or `AWAITING_USER_FEEDBACK`:
```json
{
  "session_id": "sessions/20260928-auth-refactor",
  "message": "Use HMAC-SHA256 for the token signature algorithm."
}
```

### 4. `get_session_status`
Polls current live session status and plan steps:
```json
{
  "session_id": "sessions/20260928-auth-refactor"
}
```

### 5. `auto_process`
Dispatches an autonomous team workflow across multiple agent personas:
```json
{
  "task": "Perform end-to-end security audit and patch vulnerabilities",
  "agents": ["sentinel", "inspector", "scribe"],
  "launch_mode": "one_shot"
}
```

---

## 📋 7. Specialist Agent Roster Reference (30 Personas)

The repository provides 30 specialized agent personas located in [`references/agents/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/) and indexed in [`references/agents/registry.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json):

| Role ID | Title & Emoji | Primary Specialty |
|---|---|---|
| `architect` | Architect 🏛️ | High-level system design, modularity, boundary contracts |
| `coder` | Coder 💻 | Clean, idiomatic business logic implementation |
| `inspector` | Inspector 🧪 | Unit, integration, and E2E test suites, 100% test coverage |
| `sentinel` | Sentinel 🛡️ | Security hardening, input validation, CSP, dependency auditing |
| `curator` | Curator 📚 | Architecture documentation, codebase map, developer gotchas |
| `scribe` | Scribe 📝 | 100% TSDoc coverage, markdown guides, API references |
| `scaler` | Scaler 📈 | Performance profiling, concurrency tuning, memory efficiency |
| `janitor` | Janitor 🧹 | Dead code elimination, lint cleanup, dependency pruning |
| `gatekeeper` | Gatekeeper 🚪 | Pre-merge verification, branch protection, safety gates |
| `nexus` | Nexus 🔗 | Model Context Protocol (MCP) server & client integration |
| `sleuth` | Sleuth 🕵️ | Deep crash dump forensics, memory leak tracing |
| `innovator` | Innovator 💡 | Greenfield feature prototypes and architectural spikes |
| `modernizer` | Modernizer 🔄 | Legacy code refactoring, modern TypeScript idiom adoption |
| `netrunner` | Netrunner 🌐 | Network protocols, HTTP/HTTPS client tuning, retry backoffs |
| `proteus` | Proteus 🎭 | Dynamic bespoke roles and specialized domain analysis |
| `revenant` | Revenant 🧟 | Cross-platform persistence, process recovery, OS boot hooks |
| `smith` | Smith 🧰 | Developer experience (DevEx), build tooling, CLI automation |
| `synapse` | Synapse 🧠 | LLM orchestration, structured prompt engineering, embeddings |
| `watcher` | Watcher 👁️ | Data schema validation, type integrity, boundary sanitization |
| `green` | Green 🌱 | Carbon footprint reduction, CPU/memory energy optimization |
| `localizer` | Localizer 🌍 | Internationalization (i18n), multi-language resources, RTL layouts |
| `nomad` | Nomad 🏕️ | Cross-platform portability (Windows, macOS, Linux, containers) |

*(See [`docs/codebase/07-agents-and-customization.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/docs/codebase/07-agents-and-customization.md) for the complete list of all 30 personas).*

---

## ⚠️ 8. Common Gotchas & Agent Survival Guide

1. **Path Separators & Line Endings**:
   - The primary host environment is **Windows** (PowerShell), but CI runs on both **Ubuntu Linux** and **Windows**.
   - Always use `node:path` methods (`path.join()`, `path.resolve()`, `path.normalize()`) or forward slashes `/` for cross-platform file paths.
   - Do not depend on CRLF vs LF in regexes; use `\r?\n`.

2. **Atomic JSON File Persistence**:
   - Never write partial JSON to `.jules/sessions.json` or `.jules-companion/schedules.json`. Always read, update the in-memory array, and write atomically via [`saveSessions`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts) or [`saveScheduledTasks`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts).

3. **No Unhandled Promise Rejections**:
   - All async operations in commands and MCP handlers must be wrapped in structured `try ... catch` blocks with descriptive error feedback.

4. **Secret Storage vs Environment Variables**:
   - In VS Code, API keys are stored in `context.secrets` (OS SecretStorage).
   - In MCP standalone mode and CLI scripts, API keys fall back to `process.env.JULES_API_KEY` and `process.env.GEMINI_API_KEY`.
   - Never commit `.env` or plaintext API keys to git.

5. **Cross-Platform Globbing & Shell Divergence**:
   - Linux Bash shells do not recursively expand `**/*.ts` without explicit shell options (`globstar`). Never run build commands in `package.json` that rely on shell glob expansion. Always route multi-file TypeScript compilation through [`scripts/build.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/build.js).

6. **Headless VS Code Mocking in CI**:
   - The test runner [`scripts/run_tests.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/run_tests.js) and [`scripts/setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts) automatically scaffold a headless mock for `node_modules/vscode`. Do not rely on VS Code runtime APIs being available in bare Node.js CLI or CI runner environments.

7. **Validation Order Precedence (Offline Test Safety)**:
   - When authoring core functions (such as [`deploySessionCore`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/deploy_session.ts)), always validate user parameters and options *before* accessing network or secret credentials. This ensures unit tests testing invalid parameters pass without requiring external API keys.

---

## ✅ 9. Pre-Completion Agent Checklist

Before completing any task in this repository, verify every item:
- [ ] Only minimal, targeted lines were modified (Shortest Working Diff).
- [ ] No speculative or unused abstractions were added (YAGNI).
- [ ] Zero new external npm dependencies were added unless explicitly authorized.
- [ ] All new or modified exported functions, classes, and types have 100% TSDoc blocks.
- [ ] Code strictly respects [Ponytail](https://github.com/DietrichGebert/ponytail) principles (stdlib first, shortest working diff).
- [ ] Architecture passes [Sentrux](https://github.com/sentrux/sentrux) verification (`sentrux check .` or `npm run sentrux:check`) with 0 cycle violations.
- [ ] Build script compiles cleanly cross-platform without shell glob dependencies (`npm run build`).
- [ ] `npm test` runs and passes 108/108 tests with 0 failures in headless/offline environment.
- [ ] `npm run package` succeeds cleanly, producing `jules-companion-1.0.1.vsix`.
- [ ] CI pipeline ([`.github/workflows/ci.yml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.github/workflows/ci.yml)) is confirmed green across all matrix runners (Ubuntu & Windows, Node 20.x & 22.x).
- [ ] All relevant documentation (`README.md`, `README.id.md`, `docs/codebase/`, `CHANGELOG.md`, `AGENT.md`) has been updated and synchronized with latest changes.
- [ ] Git status is clean and all changes are accounted for.
