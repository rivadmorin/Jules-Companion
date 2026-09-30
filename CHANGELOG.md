# Changelog

All notable changes to the **Jules Companion** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.2] - 2026-09-30

### 🚀 Added & Improved
- **Real-Time Execution Plan Tracking in Mission Control**:
  - Dynamically calculates step completion and active execution progress directly from cloud `progressUpdated` activity events.
  - Automatically advances active steps from `PENDING` to `IN_PROGRESS` and `COMPLETED` (`100%`) without manual webview refreshing.
- **Mission Control Webview Polling & Rendering Optimizations**:
  - Implemented render signature dirty-checking (`lastRenderSig`) inside `updateView()` to bypass redundant DOM updates when status and activities remain unchanged.
  - Preserves user text input (e.g. `<textarea id="msgInput">`) and tab selection by preventing full iframe rebuilds every 4 seconds.
  - Added dirty-checking in `fetchCloudData` to eliminate disk I/O churn by only executing `saveSessions()` when the session status actually changes.
  - Wired viewstate listeners (`panel.onDidChangeViewState` and `panel.onDidDispose`) to automatically suspend polling when the tab is hidden and safely release timers.
- **In-Memory Git Patch Conflict Dry-Run Cache**:
  - Added `patchCheckCache` in `scripts/core/git.ts` with 30-second TTL and automatic eviction.
  - Prevents continuous scratch file writes and `git apply --check` process spawning during repeated polling iterations.
- **HTTP Client Network Timeout & Resilience**:
  - Integrated native `AbortSignal.timeout(15000)` into `scripts/client/http.ts` to prevent hanging requests when connecting to the Google Jules REST API.
- **Antigravity IDE UI Compatibility**:
  - Replaced missing `$(git-branch)` codicon in `package.json` with universal glyph `$(source-control)` to prevent blank inline action buttons.
- **Expanded Specialist Agent Roster (53 Agents)**:
  - Added 9 new specialized agent personas across Coding and Advisory groups:
    - `Hermetic` 🧊 (`hermetic`): Immutability, Pure Functions & Side-Effect Isolation.
    - `Lexicon` 📖 (`lexicon`): Domain Glossary, Ubiquitous Language & Naming Consistency.
    - `Decoupler` 🧩 (`decoupler`): Inversion of Control & Loose Module Coupling.
    - `Monorepist` 🏗️ (`monorepist`): Monorepo Workspaces & Multi-Package Architecture.
    - `Plugger` 🔌 (`plugger`): Plugin Architecture & Microkernel Extensibility.
    - `Mutator` 🧬 (`mutator`): Mutation Testing & Test Suite Resilience.
    - `Guildmaster` 🤝 (`guildmaster`): Contributor Experience, PR Guidelines & Open Source Governance.
    - `Attestor` 🔏 (`attestor`): Security Policies, Threat Models & Compliance Documentation.
    - `Vscecraft` 💿 (`vscecraft`): VS Code Extension Bundling, Packaging & Marketplace Release.
  - Recompiled and verified `references/agents/registry.json` index (53 total agents: 30 coding + 23 advisory).
- **Native Side-by-Side Diff Editor & In-Memory Virtual Document Provider**:
  - Implemented `JulesDiffContentProvider` using VS Code's `registerTextDocumentContentProvider` with custom URI scheme `jules-diff://`.
  - Upgraded `openVisualDiff` to launch native side-by-side diffs (`vscode.diff`) between `jules-diff://sessions/<id>/original/<file>` and `jules-diff://sessions/<id>/proposed/<file>` with automatic language syntax highlighting, diff minimap, and navigation shortcuts.
  - Upgraded `openUnifiedDiff` to open in-memory unified diffs with native `.diff` syntax highlighting in an editor tab.
  - Eliminated 100% of temporary scratch disk I/O (`.jules-companion/scratch/visual_diff/`) when inspecting session patches.
  - Enhanced multi-file patch navigation via interactive QuickPick displaying per-file addition and deletion metrics (`+A -D`).

---

## [1.2.1] - 2026-09-29

### 🚀 Added
- **Graphify Codebase Knowledge Graph**:
  - Initialized full Graphify knowledge graph extraction: 697 nodes, 1,483 edges across 44 semantic community clusters.
  - Interactive browser visualization (`graphify-out/graph.html`) and audit report (`graphify-out/GRAPH_REPORT.md`).
  - Added Git post-commit hook for automated incremental AST graph re-indexing (`.git/hooks/post-commit`) and merge driver registration (`.gitattributes`).
  - Added `graphify:update` command in `package.json` and integrated hook installation into `scripts/install_hooks.js`.
  - Configured `.gitignore` to track public graph artifacts (`graph.json`, `graph.html`, `GRAPH_REPORT.md`) while strictly ignoring local interpreter paths and caches (`.graphify_*`, `cache/`).
  - Updated all governance and architectural documentation: `AGENT.md` (Invariant 10), `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`, `README.md`, `README.id.md`, and `docs/codebase-architecture-map.md`.

---

## [1.2.0] - 2026-09-28

### 🚀 Highlights
- 1-Click Installer for Antigravity IDE and VS Code, GitHub Issue/PR Templates, Community Guidelines, and Automated CI/CD Release Pipeline

---

## [1.1.0] - 2026-09-29

### 🚀 Added
- **New Specialist Agent `Octo` 🐙**:
  - Added dedicated GitHub Workflows, Actions, and Repository Operations specialist agent (`references/agents/octo.md`).
  - Strict preservation & non-destructive evolutionary enhancement boundaries: inspects `.github/` first, preserves existing workflows/templates, and extends them incrementally without breaking active pipelines.
  - Added `octo` to `codingAgents` in `scripts/generate_registry.ts` and updated `references/agents/registry.json` to 44 total agents.
- **New Multi-Agent Team Preset `github-ops`**:
  - Registered `'github-ops': 'octo,smith,scribe,archivist'` in `TEAM_PRESETS` in `scripts/mcp/tools/session_tools.ts`.
  - Added `Team: GitHub Ops` into the VS Code extension agent QuickPick selection menu in `scripts/extension.ts`.
- **Pull `.diff` & Patch Conflict Detection in Mission Control**:
  - Implemented `checkPatchConflict()` in `scripts/core/git.ts` using dry-run `git apply --check` to verify whether incoming patches can apply cleanly with 0 conflicts to the local branch.
  - Added interactive **Patch Compatibility Banner** and action buttons (`Pull .diff File`, `Check Conflicts`) in the Mission Control webview (`scripts/ui/mission_control.ts`).
  - Added new VS Code command `jules.pullSessionDiff` in `scripts/extension.ts` and `package.json` to extract raw unified diffs into `.jules-companion/diffs/session-<id>.diff` and immediately open them in the editor.
- **Automatic Scratch & Diff Cleanup on Session Archive / Delete**:
  - Implemented `cleanSessionScratch()` in `scripts/core/storage.ts` (re-exported via `scripts/utils.ts`) to automatically purge leftover scratch files (`.jules-companion/diffs/`, `.jules-companion/scratch/`, and `visual_diff/`) when a session is archived or permanently deleted.
  - Updated `archiveSession()` in `scripts/utils.ts` and `deleteSessionApi()` in `scripts/client/jules_api.ts` to trigger automatic scratch cleanup, preventing disk and workspace clutter.
  - Enhanced delete and archive notifications in `scripts/extension.ts` to show counts of purged scratch files.
  - Added comprehensive test suites in `tests/utils.test.ts` and `tests/mission_control.test.ts` (115/115 tests passing).

---

## [1.0.1] - 2026-09-29

### 🔧 Fixed & Improved
- **Decoupled Architecture & Zero Circular Dependencies**:
  - Decoupled `scripts/core/scheduler.ts` from `scripts/deploy_session.ts` via dynamic `TaskExecutor` callback interface and `setTaskExecutor()`.
  - Resolved architectural layer constraint violation (`max_cycles = 0`) verified by Sentrux.
  - Boosted Sentrux Acyclicity score to **10,000 / 10,000** and overall Quality Signal to **5,861**.
- **Test Suite Expansion**:
  - Added unit test coverage for `executeDueTasks` and `runScheduledTaskNow` in `tests/scheduler.test.ts`.
  - All 108 test cases passing cleanly with zero failures.

---

## [1.0.0] - 2026-09-28

### 🚀 Added
- **4 Official Google Jules Execution Modes**:
  - `start`: Autonomous code implementation without pausing for plan approval (`requirePlanApproval: false`).
  - `review`: Formulates execution plan and pauses in `AWAITING_PLAN_APPROVAL` for authorization.
  - `interactive`: Prepend conversational goal clarification directive; pauses in `AWAITING_USER_FEEDBACK`.
  - `scheduled`: Queues background tasks to execute autonomously at a target future timestamp.
- **Autonomous Background Task Scheduler Engine** ([`scripts/core/scheduler.ts`](scripts/core/scheduler.ts)):
  - Persistent queue in `.jules-companion/schedules.json`.
  - `addScheduledTask`, `cancelScheduledTask`, `deleteScheduledTask`, `getDueScheduledTasks`, `executeDueTasks`, and `runScheduledTaskNow`.
  - Background integration with `LiveSyncManager` to automatically trigger due tasks and alert developers.
- **Mission Control Webview** ([`scripts/ui/mission_control.ts`](scripts/ui/mission_control.ts)):
  - Live cloud state reconciliation prioritizing `getSessionApi` live data over disk cache.
  - Interactive execution plan stepper, activity timeline, and code changeset viewer.
  - Strict Content Security Policy (CSP) enforcement with per-render cryptographic nonces.
  - Zero inline event handlers; centralized event delegation using `data-action` attributes.
  - Decoupled, state-specific action banners for Plan Approval vs User Feedback.
- **Model Context Protocol (MCP) Server** ([`scripts/mcp_server.ts`](scripts/mcp_server.ts)):
  - Standard JSON-RPC server via `stdio` using `@modelcontextprotocol/sdk`.
  - Complete suite of 20 native tools across Session Management, Agent Catalog, and System Utilities.
- **VS Code & Antigravity IDE Extension** ([`scripts/extension.ts`](scripts/extension.ts)):
  - 33 registered commands covering session deployment, review, merge, rollback, PR creation, and scheduling.
  - 4 sidebar TreeDataProviders: Active Sessions, Workspace Context, 30 Specialist Agents, and Decision Journals.
  - Collapsible `#sched • <agent>` scheduled task tree items with instant run and cancel options.
  - Visual Diff Viewer ([`scripts/ui/visual_diff.ts`](scripts/ui/visual_diff.ts)) using native `vscode.diff`.
  - Custom Agent Creation Wizard ([`scripts/ui/custom_agent_wizard.ts`](scripts/ui/custom_agent_wizard.ts)).
- **30 Specialist Agent Personas** ([`references/agents/`](references/agents/)):
  - Pre-calibrated system directives for Architecture, Coding, Testing, Security, DevOps, and Documentation.
  - Standardized YAML frontmatter template schema and compiled catalog `registry.json`.
  - Agent procedural memory journaling in `references/agents/*.journal.md`.
- **Pre-Merge Safety Gate** ([`scripts/merge_session.ts`](scripts/merge_session.ts)):
  - Automated check verifying cloud session status is strictly `SUCCEEDED` and Git working tree is clean.
- **Comprehensive Documentation Suite**:
  - English Architecture Reference in [`docs/codebase/`](docs/codebase/README.md) across 10 modular chapters.
  - Bilingual [`README.md`](README.md) (English & Bahasa Indonesia).
  - Open-source Developer Contribution Guide ([`CONTRIBUTING.md`](CONTRIBUTING.md)).
  - AI Coding Agent Operating Manual ([`AGENT.md`](AGENT.md)).
- **Automated CI/CD Pipeline**:
  - Multi-OS matrix workflow (`.github/workflows/ci.yml`) on Ubuntu and Windows with Node.js 18.x and 20.x.

### 🛡️ Security & Quality
- Replaced all inline `onclick` handlers in Webview with CSP-compliant `data-action` event delegation.
- 100% TSDoc tag coverage enforced across all 28 TypeScript scripts by `tests/doc_coverage.test.ts`.
- 106 automated unit tests across 35 test suites passing with zero failures (`npm test`).
