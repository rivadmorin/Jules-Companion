# AGENT.md - Autonomous AI Coding Agent Operating Manual

> **Target Audience:** Autonomous AI Coding Agents (Antigravity CLI / `agy`, Google Jules, Claude Code, GitHub Copilot CLI, OpenAI Codex, Hermes, Cursor, Windsurf)  
> **Repository:** [Jules Companion](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion)  
> **Host Environment:** Windows 10/11, PowerShell (`pwsh`), Google Antigravity IDE (Antigravity 2.0 / VS Code engine), Node.js 20+, TypeScript 5.9, Model Context Protocol (MCP)  
> **Active Knowledge Base:** Obsidian LLM Wiki (`E:\Markdown Artificial Intelligence\LLM Wiki`)

---

## 🤖 1. Mission & System Overview

Welcome, AI Agent! You are operating inside the codebase of **Jules Companion**, an enterprise developer orchestration platform that bridges modern IDEs (Visual Studio Code and Google Antigravity IDE) and external LLMs (via Model Context Protocol) with **Google Jules Cloud** autonomous agents.

This manual defines the **non-negotiable operating invariants, architectural boundaries, communication schemas, toolchain protocols, and verification gates** tailored for this development environment.

---

## ⚡ 2. The Golden Invariants (Non-Negotiable)

When inspecting, modifying, refactoring, or extending this codebase, you must adhere to these foundational invariants:

### Invariant 1: Ponytail Mode is Permanently Active (Lazy Senior Developer)
* **Governing Engine**: [**Ponytail** (`DietrichGebert/ponytail`)](https://github.com/DietrichGebert/ponytail) — Anti-overengineering ruleset for AI coding agents.
* **YAGNI (You Aren't Gonna Need It)**: Refuse speculative abstractions. Do not create interfaces with a single implementation, factories for a single class, or configuration flags for values that do not change.
* **The Ladder Reflex**: Stop at the first rung that holds:
  1. *Does this need to exist at all?* (YAGNI) — Skip speculative features.
  2. *Already in this codebase?* — Reuse existing helpers, types, or utilities.
  3. *Stdlib does it?* — Reach for Node.js built-ins (`node:fs`, `node:path`, `node:crypto`, `node:child_process`, `node:test`, `node:assert`).
  4. *Native platform feature covers it?* — Browser/OS native capabilities over custom code.
  5. *Already-installed dependency solves it?* — Never add a new dependency for what a few lines can do.
  6. *Can it be one line?* — Make it one line.
  7. *Only then:* Write the minimum code that works.
* **Shortest Working Diff**: Touch only the exact target lines necessary to resolve the task. Zero unsolicited cleanup, style reformatting, or collateral edits.
* **Fix Root Causes**: Trace bugs to their shared bottleneck and patch them once at the root rather than writing workarounds across multiple callers.

### Invariant 2: Karpathy Behavioral Coding Principles
* **Think Before Coding**: Surface hidden assumptions, name ambiguities, and list trade-offs explicitly before touching code.
* **Simplicity First**: Write the minimum code that solves the problem. If 200 lines could be 50, rewrite it.
* **Surgical Changes**: Every changed line must trace directly to the request. Do not "improve" adjacent code, comments, or formatting.
* **Goal-Driven Execution**: Formulate minimal, verifiable success criteria before editing (`[Step] → verify: [check]`). Loop until verified.

### Invariant 3: Cognitive Reasoning Foundation — Sequential Thinking (`sequentialthinking`)
* Proactively utilize the `sequentialthinking` MCP tool (`sequential-thinking` server) as the primary cognitive and reasoning foundation for all non-trivial tasks, architectural investigations, multi-step problem solving, and edge-case evaluations.
* **Parameter Protocol**:
  - `thought`: Deep, reflective analysis, problem decomposition, and hypothesis falsification.
  - `thoughtNumber` & `totalThoughts`: Strict sequential indexing with dynamic boundary adjustments.
  - `nextThoughtNeeded`: Set to `true` while ambiguity persists; set to `false` ONLY when an unambiguous execution plan is formulated.
  - `isRevision` & `revisesThought`: Enforce rigorous self-correction whenever assumptions contradict findings.
  - `branchFromThought` & `branchId`: Explicitly model multi-path trade-offs before pruning or merging.

### Invariant 4: Token Optimization via Context-Mode & RTK
* **"Think in Code" Principle (Mandatory)**: When analyzing, filtering, counting, or extracting data from codebase files, program the analysis using `ctx_execute` or `ctx_execute_file` inside the sandboxed context-mode environment.
* **No File Dumping**: Never flood the conversation context with raw file dumps (`print(FILE_CONTENT)` is forbidden). Print only derived summaries, line counts, or exact metrics.
* **RTK Prefix Reflex**: Always prefix dev and git commands with `rtk` in `run_command` (e.g. `rtk git status`, `rtk npm test`, `rtk git commit ...`) to compress CLI output tokens.

### Invariant 5: 100% TSDoc / JSDoc Coverage is Mandatory
Every exported symbol (`export function`, `export class`, `export interface`, `export type`, `export const`) **must** include a comprehensive TSDoc comment block:
* `@module <name>` header at the very top of each file.
* Clear summary of purpose, behavior, and side effects.
* `@param <name>` tag for every parameter, describing its type and semantics.
* `@returns` tag documenting return values or Promise resolutions.
* *Enforcement*: The CI pipeline and [`tests/doc_coverage.test.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/doc_coverage.test.ts) will immediately fail if even a single exported symbol lacks documentation.

### Invariant 6: Strict Downward Layering & Zero Circular Dependencies
* **Governing Sensor**: [**Sentrux** (`sentrux/sentrux`)](https://github.com/sentrux/sentrux) — AI Codebase Quality Sensor & Architectural Linter.
* Dependencies must flow in a single downward direction:
  $$\text{Tier 0: Tests} \longrightarrow \text{Tier 1: Interfaces} \longrightarrow \text{Tier 2: Tools \& UI} \longrightarrow \text{Tier 3: Core Engines} \longrightarrow \text{Tier 4: Client} \longrightarrow \text{Tier 5: Foundation}$$
* Foundation modules ([`scripts/core/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/) and [`scripts/client/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/)) must **never** import from UI ([`scripts/ui/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/)) or MCP tool handlers ([`scripts/mcp/*`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/)).
* Enforced statically by Sentrux via [`.sentrux/rules.toml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.sentrux/rules.toml) (`max_cycles = 0`).

### Invariant 7: Status Disambiguation — Plan Approval vs User Feedback
Google Jules Cloud sessions operate with two distinct pausing states that must **never** be conflated:
1. **`AWAITING_PLAN_APPROVAL`**: The cloud agent has formulated an execution plan and paused for human authorization.
   - *Webview UI*: Render the green "Plan Approval Required" banner with the "Approve Plan & Authorize Execution" button.
   - *Action API*: Invoke [`approvePlanApi`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/jules_api.ts) (`jules.approvePlan`).
2. **`AWAITING_USER_FEEDBACK` / `AWAITING_USER_INPUT`**: The cloud agent has paused to ask a clarifying question.
   - *Webview UI*: Render the amber "Agent Paused for Feedback" banner with the conversational input box and "Reply to Agent" button.
   - *Action API*: Invoke [`sendMessageApi`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/jules_api.ts) (`jules.sendMessage`).
* **Rule**: It is a critical regression to display plan authorization buttons when the agent is waiting for user input, or vice-versa.

### Invariant 8: Pure Native IDE GUI & State Discipline
* **Zero Webview Overhead**: The extension runs 100% on native VS Code / Antigravity IDE primitives (`vscode.window.createOutputChannel`, `vscode.window.createStatusBarItem`, `vscode.window.showQuickPick`, `vscode.diff`, `vscode.TreeDataProvider`). Legacy Chromium HTML webviews are strictly retired.
* **Keyboard-Navigable Action Center**: All session inspections, plan authorizations, diff launches, and branch checkouts are accessible instantly via the native QuickPick Action Center (`jules.openSessionActionCenter`).
* **Live Activity Streaming**: Activities and execution logs stream directly into the native OutputChannel (`Jules Activity Stream`), eliminating DOM parsing overhead while supporting full log searching and syntax highlighting.
* **Hierarchical TreeView Execution Plan**: Sessions render a collapsible `📋 Execution Plan (X/Y completed)` group in the sidebar, dynamically displaying step progress (`$(pass)`, `$(sync~spin)`, `$(circle-outline)`).
* **Zero-Churn Disk Persistence**: In background sync loops, only call `saveSessions()` when `currentSessions[idx].status !== liveStatus`.

### Invariant 9: Fail-Safe Git Safety Gate & In-Memory Patch Caching
* **Pre-Merge Safety Gate**: Before triggering any merge ([`mergeSessionCore`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/merge_session.ts)), verify:
  1. Cloud session status is strictly `SUCCEEDED`.
  2. Local working tree is completely clean (`git status --porcelain` returns empty).
* **In-Memory TTL Patch Check Caching**: In [`scripts/core/git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts), dry-run conflict checks (`checkPatchConflict`) MUST leverage `patchCheckCache` (30s TTL). Do not write scratch patch files or spawn `git apply --check` processes repeatedly on unchanged patch content.
* **Scratch Cleanup**: Call `cleanSessionScratch(sessionId)` upon session archive or delete to prevent leftover files in `.jules-companion/diffs/` or `.jules-companion/scratch/`.

### Invariant 10: Antigravity IDE & Windows Environment Specifics
* **Codicon Font Limitation**: Antigravity IDE's internal `codicon.ttf` omits `0xEC6F` (`$(git-branch)`), rendering blank square icons. Always use `$(source-control)` or `$(repo-forked)` in `package.json` for Git branching actions.
* **PowerShell String Escaping**: In Windows PowerShell (`pwsh`), `$(...)` is parsed as subexpression syntax. When writing Git commit messages or shell strings containing codicons or variable interpolations, escape as `` `$(...) `` or wrap in single quotes `'...'`.
* **Non-Admin Execution**: Antigravity IDE should be run as a standard non-admin user so UIPI (User Interface Privilege Isolation) does not block CUA input injection (`hotkey`, `type_text`, `press_key`).
* **VSIX Hot Installation**: After packaging, install directly to the local IDE via `antigravity-ide.cmd --install-extension jules-companion-<version>.vsix --force`.

### Invariant 11: Cross-Platform Build & CI/CD Pipeline Integrity
* Continuous Integration runs across Ubuntu Linux and Windows across Node.js LTS (20.x, 22.x).
* **Zero Shell Globbing**: Never use shell-specific glob syntax in `package.json` (e.g. `scripts/**/*.ts` fails in Linux). Use Node.js script runners like [`scripts/build.js`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/build.js).
* **Headless Mock Resilience**: Test suites must execute reliably without a graphical VS Code window or live API keys. Setup scripts must scaffold mock environments automatically.
* **Network Timeout**: HTTP requests in [`scripts/client/http.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/http.ts) must declare native `AbortSignal.timeout(15000)` to prevent indefinite socket hanging.

### Invariant 12: Strict Truth in CLI Documentation & Agent Roster Alignment
* **No Phantom Agents**: The sole authority for agent identity is [`references/agents/registry.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json), registering exactly **53 specialist agents** (30 coding + 23 advisory).
* **Executable CLI Commands**: Every CLI fallback command documented in `SKILL.md`, `AGENT.md`, and `README.md` must be 100% syntactically valid and runnable by Node.js.
* **Automatic Global Sync**: The global IDE MCP schema repository (`~/.gemini/antigravity-ide/mcp/jules-companion/`) must be refreshed on every build (`npm run sync`).

### Invariant 13: Codebase Knowledge Graph & Architecture Navigation (Graphify)
* **Governing Framework**: [**Graphify** (`safishamsi/graphify`)](https://github.com/safishamsi/graphify) — Persistent Codebase Knowledge Graph.
* **Query First**: Treat any codebase, data-flow, or architectural inquiry as a Graphify query first before attempting broad text greps (`graphify query "<question>"` or inspecting `graphify-out/GRAPH_REPORT.md`).
* **Post-Edit Hygiene**: Keep the graph synchronized after modifying code via `graphify update .` (or `npm run graphify:update`).

### Invariant 14: Documentation & Obsidian LLM Wiki Knowledge Preservation
* **Mandatory Sync**: Every code change, refactoring, or feature addition MUST immediately update [`CHANGELOG.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/CHANGELOG.md), [`docs/codebase/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/docs/codebase/), and [`README.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/README.md).
* **Obsidian LLM Wiki**: Preserve architectural insights, debugging post-mortems, and session findings into the local vault at `E:\Markdown Artificial Intelligence\LLM Wiki` using the `llm-wiki` and `wiki-update` skills.

---

## 🛠️ 3. Contributor & AI Agent Tooling Suite

| Tool | Purpose in this Environment | Primary Command |
|---|---|---|
| **Ponytail** | Enforces minimalist, YAGNI, senior developer coding patterns | Active by default (`full`) |
| **Sequential Thinking** | Deep cognitive reasoning, hypothesis testing, and architectural planning | MCP tool: `sequentialthinking` |
| **Context-Mode** | Token-optimized in-memory code and file analysis | MCP tools: `ctx_execute_file`, `ctx_execute` |
| **RTK** | Terminal CLI output token compression (git, npm, tsc) | Shell prefix: `rtk <cmd>` |
| **Sentrux** | Architectural layering linter and quality sensor | `sentrux check .` |
| **Graphify** | Persistent knowledge graph, AST dependency tracking, and visualizer | `graphify update .` / `graphify query` |
| **Obsidian Wiki** | Persistent cross-session knowledge distillation | Vault: `E:\Markdown Artificial Intelligence\LLM Wiki` |

---

## 🗺️ 4. Codebase Architectural Navigation Map

```
Jules-Companion/
├── scripts/
│   ├── core/                        # Tier 5: Foundation Layer
│   │   ├── types.ts                 # Universal TypeScript contracts and interfaces
│   │   ├── storage.ts               # Atomic JSON storage (.jules-companion/sessions.json)
│   │   ├── scheduler.ts             # Background Task Scheduler engine (.jules-companion/schedules.json)
│   │   └── git.ts                   # Git CLI subprocess abstractions with in-memory patch caching
│   ├── client/                      # Tier 4: Communication Layer
│   │   ├── http.ts                  # Native HTTPS transport engine with 15s AbortSignal timeout
│   │   └── jules_api.ts             # Google Jules Cloud REST API endpoints
│   ├── deploy_session.ts            # Tier 3: Core Deployment Engine (4 launch modes)
│   ├── merge_session.ts             # Tier 3: Core Merge Engine & Safety Gate
│   ├── jules_client.ts              # Tier 3: Consolidated Jules client facade
│   ├── ui/                          # Tier 2: VS Code / Antigravity IDE Presentation Layer
│   │   ├── action_center.ts         # Native QuickPick action hub & execution coordinator
│   │   ├── activity_channel.ts      # Native OutputChannel live step logging & streaming
│   │   ├── status_bar.ts            # Priority status bar item & active session indicator
│   │   ├── sessions_provider.ts     # TreeDataProvider for Jules Sessions explorer
│   │   ├── scheduled_provider.ts    # TreeDataProvider for Scheduled Tasks explorer
│   │   ├── agents_provider.ts       # TreeDataProvider for 53 Specialist Agents
│   │   ├── workspace_provider.ts    # TreeDataProvider for Workspace health & Git context
│   │   ├── visual_diff.ts           # Unified diff parser & Gemini AI explanation panel
│   │   ├── live_sync.ts             # Background polling engine with adaptive backoff
│   │   └── custom_agent_wizard.ts   # Interactive multi-step agent creation wizard
│   ├── mcp/                         # Tier 2: MCP Tool Registry & Handlers
│   │   ├── registry.ts              # 20 modular native MCP tool declarations
│   │   └── tools/                   # Individual tool handler implementations
│   ├── extension.ts                 # Tier 1: IDE Extension Entrypoint (33 registered commands)
│   ├── mcp_server.ts                # Tier 1: Standalone JSON-RPC MCP Server Entrypoint
│   └── utils.ts                     # Tier 5: Shared utilities, Doctor checks, status helpers
├── references/                      # Specialist Agent Markdown definitions
│   └── agents/
│       ├── registry.json            # Compiled catalog of 53 specialist agents
│       └── *.md                     # 53 individual agent prompt definitions
├── tests/                           # Tier 0: Native Node.js Test Suite (114 tests across 38 suites)
│   ├── doc_coverage.test.ts         # 100% TSDoc coverage enforcement
│   ├── scheduler.test.ts            # Task Scheduler test suite
│   ├── action_center.test.ts        # Native QuickPick Action Center test suite
│   ├── activity_channel.test.ts     # Native OutputChannel logging test suite
│   ├── status_bar.test.ts           # Native StatusBar item lifecycle test suite
│   ├── sessions_provider.test.ts    # TreeDataProvider test suite
│   ├── mcp.test.ts                  # MCP registry and tool execution tests
│   └── merge_session.test.ts        # Pre-merge safety gate tests
├── graphify-out/                    # Codebase Knowledge Graph & Visualizer (749 nodes, 1577 edges, 62 communities)
│   ├── graph.json                   # GraphRAG knowledge graph export
│   ├── graph.html                   # Interactive browser visualization
│   └── GRAPH_REPORT.md              # Architectural health & God Nodes audit report
└── docs/codebase/                   # Master Architecture Reference Suite (10 chapters)
```

---

## 🛠️ 5. AI Agent Operating Playbook (Windows & Antigravity IDE)

When executing tasks in this environment, strictly follow this sequence:

### Step 1: Cognitive Analysis & Context Gathering
1. Use `sequentialthinking` for decomposition, assumptions, and edge cases.
2. Query Graphify first: `graphify query "<component>"` or inspect `graphify-out/GRAPH_REPORT.md`.
3. Use `ctx_execute_file` to programmatically analyze code without dumping raw tokens.

### Step 2: Implement Minimal Surgical Fixes
* Adhere strictly to Ponytail's Ladder: shortest working diff, standard library first, zero unrequested abstractions.
* Use `replace_file_content` for contiguous, targeted edits.
* Maintain 100% TSDoc coverage (`@module`, `@param`, `@returns`).

### Step 3: Run the Verification Suite
Execute the native test runner via PowerShell:
```powershell
rtk npm test
# or full verification (typecheck + tests):
rtk npm run verify
```
* **Success Criteria**: All **117 tests across 36 suites** must pass with `0 failures`.

### Step 4: Recompile & Verify Packaging
```powershell
# 1. Compile TypeScript entrypoints & run global sync
rtk npm run build

# 2. If agent definitions were modified, recompile registry
rtk npm run registry

# 3. Package extension VSIX
rtk npm run package
```

### Step 5: Install & Hot-Reload in Antigravity IDE
Install the newly bundled `.vsix` into the host Antigravity IDE:
```powershell
antigravity-ide.cmd --install-extension jules-companion-1.2.2.vsix --force
```

### Step 6: Post-Edit Knowledge Graph Hygiene & Git Ship
```powershell
# 1. Update Graphify knowledge graph
rtk graphify update .

# 2. Stage and commit (remember to escape `$(...)` in PowerShell)
rtk git add .
rtk git commit -m "feat(<scope>): <concise message>"

# 3. Push to remote
rtk git push origin main
```

---

## 🔌 6. Model Context Protocol (MCP) Tool Calling Reference

Jules Companion registers **20 native MCP tools**. When calling tools, use these exact schemas:

1. **`deploy_session`**: Deploys a session (`type: "start" | "review" | "interactive"`).
2. **`deploy_team`**: Deploys multi-agent team presets (`preset: "github-ops" | "full-audit" | "feature-sprint" | "refactor-boost"`).
3. **`merge_session`**: Evaluates pre-merge safety gate and merges session branch (`sessionId`, `inspect: boolean`, `approve: boolean`).
4. **`pull_session_diff`**: Extracts raw `.diff` patch file and evaluates dry-run conflict status.
5. **`checkout_session_branch`**: Fetches and checks out the session's Git branch locally for testing.
6. **`send_session_message`**: Sends direct user feedback to an agent paused in `AWAITING_USER_INPUT`.
7. **`get_session_status`**: Queries real-time session status from Google Jules Cloud REST API.
8. **`cancel_session`**: Safely cancels a running cloud session.
9. **`retry_failed_session`**: Restarts a failed session with preserved prompt and branch configuration.
10. **`rollback_session`**: Rolls back an applied session branch.
11. **`auto_process`**: Dispatches full autonomous loop (poll -> approve -> reply -> merge).
12. **`list_agents`**: Returns the complete list of 53 specialist agents with metadata.
13. **`get_agent_info`**: Retrieves full prompt documentation and capabilities for an agent.
14. **`create_custom_agent`**: Scaffolds a new specialist agent persona and registers it in `registry.json`.
15. **`read_agent_journal`**: Reads operational logs and retrospective journals.
16. **`setup_workspace`**: Scaffolds directory layout and `.jules-companion` configurations.
17. **`list_sources`**: Lists connected repository sources in the Jules account.
18. **`run_doctor`**: Runs diagnostic health checks on workspace, API key, and Git origin.
19. **`create_github_pr`**: Generates a GitHub Pull Request for a completed session.
20. **`get_review_reports`**: Retrieves markdown audit reports from `docs/jules-reviews/`.

---

## 📋 7. Specialist Agent Roster Reference (53 Personas)

### 💻 Coding & Architecture Group (30 Personas)
`adapter`, `alchemist`, `benchmarker`, `bolt`, `bridge`, `builder`, `chameleon`, `conduit`, `decoupler`, `dockerist`, `enforcer`, `exterminator`, `gatekeeper`, `hermetic`, `innovator`, `inspector`, `janitor`, `logger`, `materialist`, `modernizer`, `monorepist`, `netrunner`, `nomad`, `octo`, `packager`, `palette`, `partisan`, `plugger`, `sentinel`, `watcher`.

### 📋 Advisory, Review & Documentation Group (23 Personas)
`annotator`, `archivist`, `attestor`, `cartographer`, `consultant`, `critic`, `curator`, `datasmith`, `grader`, `green`, `guildmaster`, `lexicon`, `localizer`, `mutator`, `nexus`, `proteus`, `revenant`, `scaler`, `scribe`, `sleuth`, `smith`, `synapse`, `vscecraft`.

---

## ⚠️ 8. Development Gotchas & Operational Notes

Refer to [`NOTE.md`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/NOTE.md) for full operational autopsy logs:
* **PowerShell Subexpression Trap**: Never put unescaped `$(...)` in double-quoted strings.
* **Antigravity IDE Font Glyph**: Never use `$(git-branch)` in UI contributions; always use `$(source-control)`.
* **UAC / UIPI**: Do not run Antigravity IDE as Administrator if CUA driver control is required.
* **Offline Mock Precedence**: Parameter and branch validation must execute before credential checks.
* **Atomic JSON Storage**: Always use atomic write-rename routines with `.tmp` files for `.jules-companion/` state files.

---

## ✅ 9. Pre-Completion Agent Checklist

Before completing any task, verify every single item:
- [ ] Only minimal, targeted lines were modified (Shortest Working Diff).
- [ ] No speculative or unused abstractions were added (Ponytail YAGNI).
- [ ] Zero new external npm dependencies were added unless explicitly authorized.
- [ ] All new or modified exported functions, classes, and types have 100% TSDoc blocks.
- [ ] No phantom agents were introduced; all personas align with `references/agents/registry.json`.
- [ ] Architecture passes Sentrux verification (`sentrux check .`) with 0 cycle violations.
- [ ] `rtk npm run verify` passes typechecking and all **117 tests across 36 suites** with 0 failures.
- [ ] `rtk npm run build` compiles 28 entrypoints cleanly and completes global sync.
- [ ] `rtk npm run package` produces `jules-companion-1.2.2.vsix`.
- [ ] Extension was re-installed to Antigravity IDE via `antigravity-ide.cmd --install-extension jules-companion-1.2.2.vsix --force`.
- [ ] Knowledge graph was synchronized via `rtk graphify update .` (749 nodes, 1577 edges).
- [ ] All relevant documentation (`CHANGELOG.md`, `README.md`, `docs/codebase/`, `AGENT.md`) is updated.
- [ ] Git working tree is completely clean and pushed to `origin/main`.
