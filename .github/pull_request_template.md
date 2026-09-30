<!-- 
  Thank you for contributing to Jules Companion! 🐙
  Please follow this template to help reviewers understand and verify your changes quickly.
  
  PR Title Convention (Conventional Commits):
    feat(scope): add new feature or capability
    fix(scope): resolve bug or edge-case
    agent(name): add or optimize specialist agent
    mcp(tool): update or add native MCP tool
    ui(mission-control): enhance webview or treeview
    docs(scope): documentation or prompt updates
    refactor(scope): architectural improvements with zero behavioral changes
-->

## 🎯 Executive Summary
<!-- What does this PR accomplish? Provide a brief 2-3 sentence overview of the problem, motivation, and solution. -->

## 🔗 Related Issues & Discussions
<!-- Link related issues, e.g., Closes #123, Fixes #456, or Relates to #789 -->
- Closes #
- Relates to #

---

## 🏗️ Architectural Impact & Scope

### 📦 Affected Components
- [ ] 💻 **VS Code Extension Host** (`scripts/extension.ts`, TreeViews, commands)
- [ ] ⚡ **Native Action Center & Channels** (`scripts/ui/action_center.ts`, `activity_channel.ts`, `status_bar.ts`)
- [ ] 🔌 **MCP Server & Native Tools** (`scripts/mcp/`, JSON-RPC tools, registry)
- [ ] ⏰ **Autonomous Task Scheduler Engine** (`scripts/core/scheduler.ts`, persistence)
- [ ] 🤖 **Specialist Agent Roster** (`references/agents/`, `registry.json`, agent templates)
- [ ] 🌐 **Cloud API Client** (`scripts/client/`, Google Jules REST endpoints)
- [ ] 🚀 **Packaging & 1-Click Installer** (`scripts/installer.js`, `install.bat`, `.vsix`)
- [ ] 📝 **Documentation & Guides** (`README.md`, `SKILL.md`, `AGENT.md`)

### 🏷️ Type of Change
- [ ] 🐛 **Bug Fix** (non-breaking patch resolving an issue)
- [ ] 🚀 **New Feature** (non-breaking capability addition)
- [ ] 💥 **Breaking Change** (fix or feature modifying existing API/storage schemas)
- [ ] 🤖 **New Agent / Prompt Tuning** (new specialist role or prompt enhancement)
- [ ] 🧹 **Refactoring & Code Health** (zero behavioral change, cyclic dependency removal)
- [ ] 🔒 **Security / CSP Hardening** (input sanitization, permission boundary enforcement)

---

## 🔍 Detailed Change Walkthrough

### 1. Key Changes & Technical Decisions
<!-- Detail the exact logic changes. Why was this approach chosen over alternatives? -->
- 

### 2. Architectural Guardrails & Quality Boundaries
- [ ] **Zero Circular Dependencies**: Codebase maintains strict acyclic structure (`max_cycles = 0`).
- [ ] **Pure Native IDE GUI Compliance**: All interactive UI uses native VS Code controls (QuickPick, TreeView, OutputChannel, StatusBar) with zero Chromium webview bloat.
- [ ] **Zero Residual Debris**: No temporary scratch scripts (`fix_*.js`, `test_*.tmp`), leftover `.diff` artifacts, or `.env` credentials are committed.
- [ ] **Cross-Platform Compatibility**: Path resolutions use `path.join()` and handle both Windows (`\`) and Unix (`/`) cleanly.

---

## 📸 Visual Evidence (UI / Interactive Changes)
<!-- 
  If this PR modifies any user interface (Session Action Center, Sidebar TreeView, QuickPick menus, or Notification popups),
  please attach before/after screenshots or a short GIF/recording below.
-->

| Before Change | After Change |
| :---: | :---: |
| *(Attach screenshot or write N/A)* | *(Attach screenshot or write N/A)* |

---

## 🧪 Testing & Verification Matrix

### Automated Test Suite
- [ ] `npm test`: **117+ unit tests passed cleanly** (0 failures).
- [ ] `npm run build`: Compiled 28+ TypeScript entrypoints with 0 diagnostic errors.
- [ ] `npm run package`: Packaged clean `.vsix` bundle with 0 packaging warnings.

### Manual Verification Environments
- [ ] **Visual Studio Code** (Tested on version: `___`)
- [ ] **Antigravity IDE** (Tested on version: `___`)
- [ ] **Cursor / Windsurf** (Tested on version: `___`)
- [ ] **1-Click Auto-Installer** (`install.bat` / `install.sh` verified on clean environment)

```bash
# Paste verification summary snippet below (optional):
# ℹ tests 117, pass 117, fail 0
```

---

## 📋 Contributor Pre-Flight Checklist

- [ ] My code adheres to the project's TypeScript style guide and architectural conventions.
- [ ] I have self-reviewed my own diff to ensure the shortest working changes without collateral churn.
- [ ] All exported functions, interfaces, and modules have clear JSDoc/TSDoc blocks with `@param` and `@returns`.
- [ ] `changelog.md` has been updated with a descriptive entry under the appropriate version section.
- [ ] If introducing a new specialist agent: added template in `references/agents/<name>.md`, registered in `scripts/generate_registry.ts`, and updated `registry.json`.
- [ ] If modifying storage schemas (`.jules-companion/`): backward compatibility or automatic migration is provided.
