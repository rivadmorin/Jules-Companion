# Contributing to Jules Companion 🐙

Thank you for your interest in contributing to **Jules Companion**! We welcome contributions from both human developers and autonomous AI coding agents.

This document sets out the guidelines and standards for developing, maintaining, and contributing code to ensure long-term stability, zero architectural regressions, and maintainability.

---

## 📜 Table of Contents
1. [Core Development Philosophy](#-core-development-philosophy)
2. [Development Environment Setup](#-development-environment-setup)
3. [Architecture Invariants & Coding Standards](#-architecture-invariants--coding-standards)
4. [Testing & Verification Protocol](#-testing--verification-protocol)
5. [Git Workflow & Commit Conventions](#-git-workflow--commit-conventions)
6. [Submitting a Pull Request](#-submitting-a-pull-request)
7. [Reporting Bugs & Proposing Features](#-reporting-bugs--proposing-features)

---

## ⚡ Core Development Philosophy

Contributors are expected to adhere to the **Ponytail Mindset** (Senior Developer Pragmatism):

* **YAGNI (You Aren't Gonna Need It)**: Do not create speculative abstractions. No interfaces with only one implementation, no factories for a single product, and no config flags for values that never change.
* **Standard Library First**: Always leverage native Node.js standard modules (`node:fs`, `node:path`, `node:https`, `child_process`, `node:test`, `node:assert`) before considering third-party npm packages.
* **Shortest Working Diff**: Touch only the exact target lines necessary to resolve the task. Avoid unsolicited refactoring, stylistic reformatting, or collateral edits.
* **Fix Root Causes**: Investigate and fix the shared root cause at the bottleneck rather than patching superficial symptoms across multiple call sites.
* **Deletion Over Addition**: Deleting dead code and simplifying logic is prioritized over introducing complex layers.

---

## 💻 Development Environment Setup

### 1. Prerequisites
* **Node.js**: Version 18.0.0 or higher.
* **npm**: Version 9.0.0 or higher.
* **Git**: Installed and available in your system `PATH`.
* **Google Jules API Key**: Optional for local unit tests, required for live deployment testing ([Obtain Key](https://jules.google)).

### 2. Clone & Install
```bash
# Clone the repository
git clone https://github.com/rivadmorin/Jules-Companion.git
cd Jules-Companion

# Install dependencies (MCP SDK, dev tooling)
npm install

# Verify workspace setup and scaffolding
npm run setup
```

### 3. Build & Watch
```bash
# Compile TypeScript scripts to dist/ directory
npm run build

# Run global synchronization
npm run sync
```

---

## 🏛️ Architecture Invariants & Coding Standards

Our codebase enforces strict architectural governance via [**Sentrux**](docs/codebase-architecture-map.md) and [**Graft**](docs/codebase-architecture-map.md):

### 1. Downward Dependency Flow (Strict Layering)
Code dependencies must flow in one direction downward. Lower layers must **never** import higher layers:
1. `Tier 0: Tests` (`tests/`)
2. `Tier 1: Interfaces & Entrypoints` (`extension.ts`, `mcp_server.ts`)
3. `Tier 2: Tools & UI Providers` (`mcp/tools/`, `ui/`)
4. `Tier 3: Workflows & Domain Core` (`deploy_session.ts`, `merge_session.ts`, `core/scheduler.ts`)
5. `Tier 4: Client & Communication` (`client/jules_api.ts`, `client/http.ts`)
6. `Tier 5: Foundation` (`core/storage.ts`, `core/git.ts`, `core/types.ts`, `utils.ts`)

### 2. 100% TSDoc / JSDoc Coverage
Every exported symbol (`export function`, `export class`, `export interface`, `export type`) **must** include a complete TSDoc comment block:
- `@module` declaration at the top of every file.
- Clear description of purpose and side-effects.
- `@param` tags documenting every input argument.
- `@returns` tag documenting return value and promise behavior.
*Enforced automatically by `tests/doc_coverage.test.ts`.*

### 3. State & Concurrency Safety
- **Atomic Persistence**: Always use synchronous, safe serialization routines when modifying `.jules/sessions.json` or `.jules-companion/schedules.json`.
- **Status Disambiguation**: Decouple `AWAITING_PLAN_APPROVAL` from `AWAITING_USER_FEEDBACK`. Never trigger plan approvals when the agent is only waiting for input.
- **Fail-Safe Safety Gate**: Never merge code unless verified as `SUCCEEDED` in Google Jules Cloud and local working tree is clean.

---

## 🧪 Testing & Verification Protocol

Every proposed change must pass the entire test suite without failures:

```bash
# Run all unit tests (100+ tests across 35 suites)
npm test

# Build the distributable VSIX package
npm run package
```

### Test Suite Map:
* `tests/doc_coverage.test.ts`: Verifies 100% TSDoc tag coverage across all TypeScript files.
* `tests/scheduler.test.ts`: Tests background task scheduling, persistence, and execution lifecycle.
* `tests/mission_control.test.ts`: Tests Webview CSP, event delegation, and status banner separation.
* `tests/sessions_provider.test.ts`: Tests TreeView generation, sub-items, and universal ID resolution.
* `tests/mcp.test.ts`: Tests MCP server tool registry and parameter schemas.
* `tests/merge_session.test.ts`: Tests Safety Gate verification and Git merge operations.

---

## 🔀 Git Workflow & Commit Conventions

### 1. Branch Naming
Create a feature or fix branch from `main`:
* `feat/short-description`: New features or capabilities.
* `fix/short-description`: Bug fixes and error handling improvements.
* `docs/short-description`: Documentation and markdown guides.
* `refactor/short-description`: Code simplification without functional changes.

### 2. Commit Message Standard
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```text
feat(scheduler): implement autonomous task scheduling engine
fix(mission_control): prevent spurious plan approval banner on user input state
docs(codebase): add comprehensive architecture reference suite
test(scheduler): add unit tests for task persistence and due execution
```

---

## 🚀 Submitting a Pull Request

1. **Verify Locally First**: Ensure `npm run build`, `npm test`, and `npm run package` complete with zero errors.
2. **Push Branch**: Push your feature branch to GitHub:
   ```bash
   git push origin feat/your-feature-name
   ```
3. **Open Pull Request**:
   * Target branch: `main`.
   * Title: Clear and following commit conventions.
   * Description:
     * Summary of changes.
     * Motivation and context.
     * Verification steps and test results.
4. **Code Review**: Address feedback promptly. Once approved, commits will be squash-merged into `main`.

---

## 🐛 Reporting Bugs & Proposing Features

* **Bug Reports**: Open an issue detailing steps to reproduce, expected vs actual behavior, Node.js version, OS, and relevant console logs.
* **Feature Requests**: Open an issue outlining the problem statement, proposed solution, and why it aligns with the project's minimalist, high-impact philosophy.
