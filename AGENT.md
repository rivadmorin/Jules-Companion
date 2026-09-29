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

### Invariant 9: Strict Truth in CLI Documentation & Agent Roster Alignment
* **No Phantom Agents**: Never invent, guess, or document hypothetical agent personas (such as `architect`, `coder`, `deployer`, `auditor`, or `strategist`). The sole authority for agent identity is [`references/agents/registry.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json), which strictly registers the **44 specialist agents** (26 coding + 18 advisory).
* **Executable CLI Commands**: Every CLI fallback command documented in [`SKILL.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/SKILL.md), [`AGENT.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/AGENT.md), and [`README.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/README.md) must be 100% syntactically valid and runnable by Node.js. If a command uses `--team <preset>`, `--inspect <id>`, `--approve <id>`, or `--diff <id>`, the underlying CLI argument parsers ([`scripts/deploy_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/deploy_session.ts), [`scripts/merge_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/merge_session.ts)) must support them without throwing unknown parameter or validation errors.
* **Automatic MCP Schema Refresh**: The global IDE MCP schema repository (`~/.gemini/antigravity-ide/mcp/jules-companion/`) must be systematically refreshed and overwritten on every build/sync ([`scripts/sync_global.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/sync_global.ts)) to avoid stale schema drift between local code tools and IDE agent capabilities.

### Invariant 10: Codebase Knowledge Graph & Architecture Navigation (Graphify)
* **Governing Framework**: [**Graphify** (`safishamsi/graphify`)](https://github.com/safishamsi/graphify) — Persistent Codebase Knowledge Graph with Community Detection & GraphRAG extraction.
* **Inspect Graph First**: Before performing broad file searches or multi-module refactorings, query the knowledge graph first via `graphify query "<question>"` or inspect [`graphify-out/graph.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/graph.json) and [`graphify-out/GRAPH_REPORT.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/GRAPH_REPORT.md) to trace call graphs, bridge nodes, and god node dependencies.
* **Preserve Graph Synchronization**: Codebase changes should be synchronized with the knowledge graph (`npm run graphify:update` or `graphify update .`). The automated Git post-commit hook automatically updates the AST layer upon committing.

---

## 🛠️ 3. Contributor & AI Agent Tooling Suite: Ponytail, Sentrux & Graphify

To guarantee zero over-engineering, strict architectural compliance, and graph-guided navigation, this repository requires both human developers and autonomous AI agents to operate with the same standard tools:

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

### 3. Graphify — Codebase Knowledge Graph & Architecture Navigation
* **Repository**: [`https://github.com/safishamsi/graphify`](https://github.com/safishamsi/graphify)
* **Purpose**: Generates queryable knowledge graphs with community clustering, god nodes analysis, cross-community bridge identification, and interactive browser visualization ([`graphify-out/graph.html`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/graph.html)).
* **Artifacts & Location**: [`graphify-out/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/graphify-out/) (`graph.json`, `graph.html`, `GRAPH_REPORT.md`).
* **Key Commands**:
  ```bash
  # Query the knowledge graph for architectural context:
  graphify query "<question>"

  # Trace shortest path between components:
  graphify path "AuthModule" "Database"

  # Incremental graph update for new/modified code:
  npm run graphify:update
  # or: graphify update .
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
│   │   ├── agents_provider.ts       # TreeDataProvider for 44 Specialist Agents
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
│       ├── registry.json            # Compiled catalog of 44 specialist agents
│       └── *.md                     # 44 individual agent prompt definitions
├── tests/                           # Tier 0: Native Node.js Test Suite (117 tests across 36 suites)
│   ├── doc_coverage.test.ts         # 100% TSDoc coverage enforcement
│   ├── scheduler.test.ts            # Task Scheduler test suite
│   ├── mission_control.test.ts      # Webview rendering & CSP test suite
│   ├── sessions_provider.test.ts    # TreeDataProvider test suite
│   ├── mcp.test.ts                  # MCP registry and tool execution tests
│   └── merge_session.test.ts        # Pre-merge safety gate tests
├── graphify-out/                    # Codebase Knowledge Graph & Visualizer (697 nodes, 44 communities)
│   ├── graph.json                   # GraphRAG knowledge graph export
│   ├── graph.html                   # Interactive browser visualization
│   └── GRAPH_REPORT.md              # Architectural health & God Nodes audit report
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
Deploys a new autonomous session to Google Jules Cloud:
```json
{
  "type": "start",
  "agents": "bolt",
  "task": "Optimize database query memoization and reduce latency",
  "mode": "code"
}
```
* `type` options:
  - `"start"`: Autonomous execution without pausing for plan approval (`requirePlanApproval: false`).
  - `"review"`: Pauses in `AWAITING_PLAN_APPROVAL` requiring developer plan authorization.
  - `"interactive"`: Pauses in `AWAITING_USER_FEEDBACK` for conversational requirements clarification.

### 2. `deploy_team`
Deploys coordinated multi-agent team presets:
```json
{
  "preset": "github-ops",
  "task": "Automate CI/CD release workflow and author release changelogs",
  "mode": "code"
}
```
* Available presets: `"github-ops"`, `"full-audit"`, `"feature-sprint"`, `"refactor-boost"`.

### 3. `merge_session`
Verifies cloud Safety Gate and inspects or merges session branches:
```json
{
  "sessionId": "4146717219164004717",
  "inspect": true
}
```
* Options:
  - `"inspect": true`: Stage 1 inspection (applies patch to review branch and writes report).
  - `"approve": true`: Stage 2 approval (merges review branch into target branch).
  - `"inspectAll": true`: Batch inspects all completed sessions.

### 4. `pull_session_diff`
Extracts raw unified Git `.diff` and verifies patch conflict status (`git apply --check`):
```json
{
  "sessionId": "4146717219164004717"
}
```

### 5. `send_session_message`
Replies to an agent waiting in `AWAITING_USER_INPUT` or `AWAITING_USER_FEEDBACK`:
```json
{
  "sessionId": "4146717219164004717",
  "message": "Use HMAC-SHA256 for the token signature algorithm."
}
```

### 6. `get_session_status`
Polls real-time live session status from Google Jules Cloud REST API:
```json
{
  "sessionId": "4146717219164004717"
}
```

### 7. `auto_process`
Dispatches an autonomous pipeline (poll -> auto-approve plan -> auto-reply -> auto-merge):
```json
{
  "all": true
}
```

---

## 📋 7. Specialist Agent Roster Reference (44 Personas)

The repository provides **44 specialized agent personas** located in [`references/agents/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/) and indexed in [`references/agents/registry.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json):

### 💻 Coding & Architecture Group (26 Personas)

| Role ID | Title & Emoji | Primary Specialty |
|---|---|---|
| `adapter` | Adapter 🔌 | Cross-Platform Compatibility (Windows/Linux/macOS) |
| `alchemist` | Alchemist 🧪 | Database Migrations & SQL Optimization |
| `benchmarker` | Benchmarker ⏱️ | Stress-Testing & Latency Audits |
| `bolt` | Bolt ⚡ | Performance, Memoization & Caching |
| `bridge` | Bridge 🧲 | Third-Party API Integration & Test Mocks |
| `builder` | Builder 🧱 | Frontend Component Scaffolding |
| `chameleon` | Chameleon 🦎 | Language & Stack Porting |
| `conduit` | Conduit 🔌 | Backend API Routing & Middleware |
| `dockerist` | Dockerist 🐳 | Containerization & CI/CD Pipelines |
| `enforcer` | Enforcer 📏 | Coding Standards & Architectural Boundaries |
| `exterminator` | Exterminator 🐛 | Bug Hunting & Crash Log Resolution |
| `gatekeeper` | Gatekeeper 🔑 | Authentication & RBAC Authorization |
| `innovator` | Innovator 💡 | Greenfield Feature Implementation |
| `inspector` | Inspector 🔎 | Unit, Integration & E2E Testing Suites |
| `janitor` | Janitor 🧹 | Code Cleanup, Linting & Dead Code Elimination |
| `logger` | Logger 🪵 | Structured JSON Logging & Observability Metrics |
| `materialist` | Materialist 🎴 | Google Material Design 3 Styling |
| `modernizer` | Modernizer ⚙️ | Legacy Code Refactoring & TypeScript Upgrades |
| `netrunner` | Netrunner 🌐 | Network & Web-Server Configurations |
| `nomad` | Nomad 🎒 | Local & 100% Offline Portability |
| `octo` | Octo 🐙 | GitHub Workflows, Actions & Repository Operations |
| `packager` | Packager 💿 | Clean Installers, Uninstaller Routines & Bundlers |
| `palette` | Palette 🎨 | UX & Frontend Accessibility (WCAG/ARIA) |
| `partisan` | Partisan 🛰️ | Decentralized & P2P Architectures |
| `sentinel` | Sentinel 🛡️ | Code Security Audits & Input Sanitization |
| `watcher` | Watcher 👁️ | Data Integrity & Runtime Schema Validation |

### 📋 Advisory, Review & Documentation Group (18 Personas)

| Role ID | Title & Emoji | Primary Specialty |
|---|---|---|
| `annotator` | Annotator 🏷️ | Inline Documentation & Code Clarity (TSDoc/JSDoc) |
| `archivist` | Archivist 📜 | Changelogs, Release Notes & Deprecation Guides |
| `cartographer` | Cartographer 🗺️ | Codebase Structures & ASCII Layout Mapping |
| `consultant` | Consultant 🧠 | Framework Recommendations & ADRs |
| `critic` | Critic 🗣️ | Senior Code Review & Anti-Pattern Analysis |
| `curator` | Curator 📚 | Internal Knowledge Base & Developer Guides |
| `datasmith` | Datasmith 🗄️ | SQLite Database Design & Query Indexing |
| `grader` | Grader 📊 | Code Health Metrics & Technical Debt Audits |
| `green` | Green 🌱 | Carbon Footprint Reduction & Energy Efficiency |
| `localizer` | Localizer 🌍 | Internationalization (i18n) & RTL Layouts |
| `nexus` | Nexus 🔗 | Model Context Protocol (MCP) Server Integration |
| `proteus` | Proteus 🎭 | Custom Dynamic Analysis & Advisory |
| `revenant` | Revenant 🧟 | Cross-Platform Background Service Persistence |
| `scaler` | Scaler 📈 | High Availability, Caching & Concurrency Spikes |
| `scribe` | Scribe ✍️ | README.md & Technical Documentation |
| `sleuth` | Sleuth 🕵️ | Forensics, Crash Dump & Memory Leak Tracing |
| `smith` | Smith 🧰 | Developer Experience (DevEx) & Git Tooling |
| `synapse` | Synapse 🧠 | AI Integration, RAG Pipelines & Token Optimization |

---

## ⚠️ 8. Development Gotchas & Operational Notes

Detailed debugging traps, cross-platform path handling, historical bug autopsies, and emergency recovery recipes are cataloged in [NOTE.md](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/NOTE.md).

**Essential Domains Covered in [NOTE.md](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/NOTE.md):**
- **Platform Traps:** Windows vs Linux path separators, CRLF/LF line endings, and Bash globbing divergence.
- **API Guardrails:** Google Jules REST protocol (`prompt` vs `message`), offline parameter validation precedence, and MCP error handling.
- **Persistence:** Atomic JSON file updates, secret storage vs environment variables, and scratch file purging.
- **CI & Testing Traps:** Headless VS Code mocks in bare Node.js, automatic `registry.json` checkout after test runs, and isolated TSDoc block rules.
- **CLI Dispatching:** Multi-mapping parameters in `parseArgs` (`--inspect`, `--approve`, `--session`).

👉 **Read [NOTE.md](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/NOTE.md) before implementing tricky network, cross-platform, or storage routines.**

---

## ✅ 9. Pre-Completion Agent Checklist

Before completing any task in this repository, verify every item:
- [ ] Only minimal, targeted lines were modified (Shortest Working Diff).
- [ ] No speculative or unused abstractions were added (YAGNI).
- [ ] Zero new external npm dependencies were added unless explicitly authorized.
- [ ] All new or modified exported functions, classes, and types have 100% TSDoc blocks.
- [ ] No phantom agents were introduced; all personas align with `references/agents/registry.json`.
- [ ] Code strictly respects [Ponytail](https://github.com/DietrichGebert/ponytail) principles (stdlib first, shortest working diff).
- [ ] Architecture passes [Sentrux](https://github.com/sentrux/sentrux) verification (`sentrux check .` or `npm run sentrux:check`) with 0 cycle violations.
- [ ] Build script compiles cleanly cross-platform without shell glob dependencies (`npm run build`).
- [ ] `npm test` runs and passes 115/115 tests with 0 failures across all 36 test suites.
- [ ] `npm run package` succeeds cleanly, producing `jules-companion-1.1.0.vsix`.
- [ ] CI pipeline ([`.github/workflows/ci.yml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.github/workflows/ci.yml)) is confirmed green across all matrix runners (Ubuntu & Windows, Node 20.x & 22.x).
- [ ] All documented CLI commands have been tested and verified against actual script parsers.
- [ ] All relevant documentation (`README.md`, `README.id.md`, `SKILL.md`, `references/prompt-templates.md`, `AGENT.md`) has been updated and synchronized.
- [ ] Git status is clean and all changes are accounted for.
