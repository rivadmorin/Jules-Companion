# Operational Gotchas & Defensive Execution Rules

This document details the critical operational hazards, defensive execution rules, and resolutions for autonomous agents operating within the **Jules Companion** repository on Windows / PowerShell environments.

---

## Defensive Traps & Resolution Matrix

### 1. `POWERSHELL_OPERATOR_TRAP`
- **Hazard**: Using `&&` in older PowerShell (e.g. 5.1 / Windows PowerShell) throws `ParserError: The token '&&' is not a valid statement separator`.
- **Remedy**: Separate statements with `;` or execute commands as independent tool calls. When chaining in modern `pwsh`, verify environment first.

### 2. `POWERSHELL_SUBEXPRESSION_TRAP`
- **Hazard**: Unescaped `$(...)` inside double quotes is evaluated immediately by PowerShell as an interpolation subexpression.
- **Remedy**: Use single quotes `'...'` for literal strings or escape the dollar sign with a backtick: `` `$(...) ``.

### 3. `POWERSHELL_PATH_WITH_SPACES`
- **Hazard**: Executing paths with spaces directly (e.g. `C:\Program Files\Node\node.exe`) causes command parsing failure.
- **Remedy**: Wrap the path in quotes and invoke with the call operator `&`, e.g. `& "C:\Path With Spaces\binary.exe"` or pass `-LiteralPath`.

### 4. `POWERSHELL_CD_PROHIBITION`
- **Hazard**: Invoking `cd <dir>` in interactive subshells desynchronizes state and violates agent container safety.
- **Remedy**: Never propose `cd`. Always use the `Cwd` parameter on tool calls.

### 5. `GIT_INDEX_LOCK_TRAP`
- **Hazard**: Background processes or crashed git commands leave `.git/index.lock`, causing subsequent git actions to fail.
- **Remedy**: Check process state first. Never arbitrarily force-delete without confirming that no active git daemon is holding the lock.

### 6. `INLINE_DOC_DENSITY_STANDARD`
- **Hazard**: Submitting code with insufficient comment density triggers CI test failures in [tests/doc_coverage.test.ts](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/tests/doc_coverage.test.ts).
- **Remedy**: Maintain `>=10%` comment density in `scripts/core/` and `>=4%` in `scripts/extension.ts`. Structure complex logic with sequential comments (`// Step 1: ...`, `// Step 2: ...`).

### 7. `CODICON_GLYPH_TRAP`
- **Hazard**: The glyph `$(git-branch)` (`0xEC6F`) is missing in some Antigravity codicon font distributions.
- **Remedy**: Use `$(source-control)` or `$(repo-forked)` for status bar and TreeItem labels instead.

### 8. `UI_PRIMITIVE_DISCIPLINE`
- **Hazard**: Heavy Chromium Webviews incur excessive memory consumption and DOM serialization overhead.
- **Remedy**: Prefer native IDE primitives: `vscode.OutputChannel` for log streaming, `QuickPick` for interactive selection, and `TreeView` for structured task execution trees.

### 9. `UAC_UIPI_ISOLATION`
- **Hazard**: Running the IDE in an Administrator-elevated process blocks non-elevated CUA / desktop automation injection tools.
- **Remedy**: Run Antigravity IDE strictly as a standard, non-elevated user account.

### 10. `OFFLINE_TEST_RESILIENCE`
- **Hazard**: Unit tests failing when run in CI or offline due to missing Google Jules Cloud API keys or display server.
- **Remedy**: Guard network calls with mock adapters; validate parameter schemas and branch logic before checking network credentials.

### 11. `STORAGE_ATOMICITY`
- **Hazard**: Race conditions or process crashes during JSON file updates corrupting `.jules-companion/` state files.
- **Remedy**: Use the atomic write-then-rename pattern (`.tmp` file written first, then renamed to `.json` via `fs.renameSync`).
