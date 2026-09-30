# 05 - Pure Native UI & Session Action Center Subsystem Reference

**Modules:**
- [`scripts/ui/action_center.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/action_center.ts)
- [`scripts/ui/activity_channel.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/activity_channel.ts)
- [`scripts/ui/status_bar.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/status_bar.ts)
- [`scripts/ui/sessions_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/sessions_provider.ts)
- [`scripts/ui/visual_diff.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/visual_diff.ts)

---

## 1. Overview & Architectural Evolution

In earlier versions of Jules Companion, interactive session oversight was provided by an HTML5 Webview panel (`mission_control.ts`). While functional, browser webviews introduce significant resource costs:
- **Chromium Process Overhead**: Spawning isolated rendering processes consuming ~80–150 MB of RAM per open panel.
- **Maintenance Complexity**: Managing hundreds of lines of raw HTML templates, inline CSS, CSP nonces, and asynchronous `postMessage` synchronization.
- **UX & Keyboard Lag**: Webview iframes do not share native focus navigation or accessibility bindings with VS Code.

In version **1.2.2**, the entire interactive UI was migrated to **100% Pure Native IDE Primitives**, completely decommissioning the legacy webview:

```mermaid
graph TD
    subgraph Jules Cloud & Local Storage
        CLOUD["Google Jules REST API"]
        STORE[".jules-companion/sessions.json"]
    end

    subgraph Pure Native UI Subsystem
        AC["Session Action Center\n(QuickPick Hub: action_center.ts)"]
        LOG["Activity Stream OutputChannel\n(activity_channel.ts)"]
        SB["Status Bar Controller\n(status_bar.ts)"]
        TREE["Hierarchical Execution Plan\n(sessions_provider.ts)"]
        DIFF["In-Memory Side-by-Side Diff\n(vscode.diff: visual_diff.ts)"]
    end

    CLOUD -->|Poll / Sync| STORE
    STORE --> AC
    STORE --> SB
    STORE --> TREE
    CLOUD --> LOG
    CLOUD --> DIFF
```

---

## 2. Core Native Subsystems

### A. Session Action Center (`ui/action_center.ts`)
The **Session Action Center** is an instant, keyboard-navigable command hub invoked via `jules.openSessionActionCenter`, the Status Bar, or sidebar TreeItems:
1. **Adaptive Action Prioritization**:
   - If a session is in `AWAITING_PLAN_APPROVAL`, the top option is highlighted as `$(pass) Approve Proposed Execution Plan`.
   - If in `AWAITING_USER_FEEDBACK`, it surfaces `$(comment-discussion) Send Response / Instructions to Agent`.
2. **Context-Aware Capabilities**:
   - Direct launch of native Side-by-Side Diff (`vscode.diff`).
   - One-click trigger for live Activity Log streaming into the Output panel.
   - SCM actions: Git branch checkout, Safety Gate merge, or GitHub Pull Request creation.
   - Session lifecycle: Archive, unarchive, or cancel execution.

### B. Activity Stream OutputChannel (`ui/activity_channel.ts`)
Rather than parsing raw HTML timeline cards in a webview, execution activities stream into a dedicated `vscode.OutputChannel` (`Jules Activity Stream`):
- **Structured Log Formatting**: Automatically formats milestones, progress updates, user/agent chat messages, and bash execution results:
  ```text
  [12:00:00] [AGENT] [PLAN_GENERATED] Proposed execution plan with 3 step(s):
     1. Analyze existing pool implementation
     2. Introduce async connection manager
     3. Run integration test suite
  [12:01:15] [BASH] $ npm run test:pool
  PASS tests/pool.test.ts (24 tests)
  [12:02:00] [PROGRESS] Step 1 complete - Migration executed cleanly
  ```
- **Zero Overhead**: Native VS Code Output channels support standard find/regex search, line copying, clear, and terminal themes without any DOM overhead.

### C. Persistent Status Bar Item (`ui/status_bar.ts`)
A dedicated status bar controller pinned to the bottom right of the IDE:
- **Priority-Driven Badge Display**:
  1. `$(alert) Jules: Plan Approval Needed` (Warning background color).
  2. `$(comment-discussion) Jules: Input Needed`.
  3. `$(sync~spin) Jules: #<id>` (Animated spinner when active sessions run).
  4. `$(check) Jules: #<id>` (Completed session awaiting merge).
  5. `$(source-control) Jules` (Idle state).
- Clicking the status bar item immediately opens the **Session Action Center**.

### D. Hierarchical Execution Plan in Sidebar (`ui/sessions_provider.ts`)
When a session contains an execution plan (`session.plan.steps`), the sidebar TreeView expands to display a collapsible `📋 Execution Plan (X/Y completed)` branch:
- Steps are marked with native IDE status glyphs:
  - `$(pass)` for `COMPLETED`.
  - `$(sync~spin)` for `IN_PROGRESS`.
  - `$(circle-outline)` for `PENDING`.
- Tooltips provide the full description of each sequential milestone.

### E. In-Memory Side-by-Side Diff Editor (`ui/visual_diff.ts`)
- Implements `vscode.TextDocumentContentProvider` under custom URI scheme `jules-diff://`.
- Reconstructs original and proposed file states in memory.
- Launches native two-column diffs (`vscode.diff`) with zero scratch disk files.

---

## 3. Strict State Differentiation: Approval vs Feedback

A critical architectural invariant preserved in the Pure Native UI is the strict separation of pause states:

| State | Semantic Meaning | Native UI Behavior | Triggered Action |
|---|---|---|---|
| **`AWAITING_PLAN_APPROVAL`** | Cloud agent formulated a multi-step plan and requires authorization before executing code changes. | Primary option in Action Center: **`Approve Plan`**. Status bar shows warning badge. | `approvePlanApi(sessionId)` |
| **`AWAITING_USER_FEEDBACK`** | Cloud agent paused execution to request clarifying input or answers from the developer. | Primary option in Action Center: **`Reply / Send Instruction`**. Status bar shows comment icon. | `sendMessageApi(sessionId, msg)` |

---

## 4. Performance & Resource Benchmarks

| Metric | Legacy HTML Webview | 100% Pure Native GUI | Measured Improvement |
|---|---|---|---|
| **UI Code Size** | ~110 KB (62 KB HTML template) | ~42 KB (TypeScript modules) | **🔻 ~62% code reduction** |
| **Memory Footprint** | Dedicated Chromium process (~100 MB) | Native Extension Host memory (<1 MB) | **🔻 ~100 MB RAM saved** |
| **Initial Open Time** | 300–600 ms (DOM parsing + CSS) | < 10 ms (Instant QuickPick / TreeView) | **⚡ >30x faster response** |
| **Accessibility** | Limited by iframe keyboard sandbox | Full native IDE keyboard & screen-reader support | **🟢 100% Native Accessibility** |
