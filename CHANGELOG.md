# Changelog

All notable changes to the **Jules Companion** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
