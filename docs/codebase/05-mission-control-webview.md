# 05 - Mission Control Webview Subsystem Reference
**Modules:** [`scripts/ui/mission_control.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/mission_control.ts)

---

## 1. Overview & Purpose

**Mission Control** is an interactive, full-featured webview panel designed to monitor, inspect, and control Google Jules execution sessions in real time directly within the IDE.

It provides a rich interface that goes beyond simple TreeViews by offering:
- Step-by-step cloud execution timeline.
- Detailed execution plan stepper with completion indicators.
- Code changeset and diff statistics viewer.
- Real-time action forms for plan authorization and conversational user feedback.

```mermaid
graph LR
    subgraph VS Code Extension Host
        API["Jules Cloud REST API"]
        MC_CTRL["Mission Control Controller\n(scripts/ui/mission_control.ts)"]
        CMD["Extension Commands Dispatcher"]
    end

    subgraph Webview Sandbox (HTML/CSS/JS)
        HTML["Responsive Mission Control UI"]
        DELEGATE["Event Delegation Listener\n(document.addEventListener click)"]
        STATE["Client-Side DOM Rendering"]
    end

    API -->|Live Session Data| MC_CTRL
    MC_CTRL -->|Injected HTML with CSP Nonce| HTML
    DELEGATE -->|postMessage: { action, payload }| MC_CTRL
    MC_CTRL -->|Execute Action| CMD
```

---

## 2. Security & Content Security Policy (CSP)

To comply with VS Code's security model and mitigate Cross-Site Scripting (XSS), Mission Control enforces strict standards:

1. **Cryptographic CSP Nonces**: A fresh cryptographic nonce is generated on each render (`getNonce()`):
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'none';
     style-src 'unsafe-inline';
     script-src 'nonce-${nonce}';
     img-src https: data:;
   ">
   ```
2. **Zero Inline Handlers**:
   - `onclick="..."` and inline event attributes are strictly forbidden.
   - All interactive controls use semantic data attributes:
     ```html
     <button class="btn btn-primary" data-action="approve-plan" data-session-id="${session.id}">
       Approve Plan
     </button>
     ```
3. **Centralized Event Delegation**:
   - Webview client script attaches a single listener to the `document` root:
     ```javascript
     document.addEventListener('click', (e) => {
       const target = e.target.closest('[data-action]');
       if (!target) return;
       const action = target.getAttribute('data-action');
       const sessionId = target.getAttribute('data-session-id');
       vscode.postMessage({ command: action, sessionId });
     });
     ```

---

## 3. State Reconciliation: Live Cloud vs Local Cache

Mission Control prioritizes live cloud state over local disk cache:

```typescript
// Fetch real-time status directly from cloud API
let liveSession = session;
try {
  const fresh = await getSessionApi(session.id);
  if (fresh && fresh.id) {
    liveSession = { ...session, ...fresh };
  }
} catch {
  // Graceful fallback to local cache if offline
  liveSession = session;
}
```

### Why This Is Essential:
If a developer approves a plan via the Google Jules web console in an external browser, local disk cache might still mark the session as `AWAITING_PLAN_APPROVAL`. By prioritizing fresh data from `getSessionApi`, Mission Control **never** shows stale plan approval forms for sessions that have already progressed or completed.

---

## 4. Differentiated Dynamic Banners

Mission Control clearly differentiates between two distinct pause states:

### 4.1. Plan Approval Banner (`AWAITING_PLAN_APPROVAL`)
- **Trigger**: Cloud status is strictly `AWAITING_PLAN_APPROVAL` or `PLAN_APPROVAL_REQUIRED`.
- **Display**:
  - Accent Color: Amber / Gold warning tone.
  - Heading: *"Plan Approval Required: Jules cloud agent has formulated an execution plan and paused for your authorization."*
  - Action: `✅ Approve Execution Plan` button triggering `approvePlanApi`.

### 4.2. User Feedback Banner (`AWAITING_USER_INPUT` / `AWAITING_USER_FEEDBACK`)
- **Trigger**: Session is waiting for developer response (e.g., in 🎯 **Interactive plan** mode or clarifying inquiries).
- **Display**:
  - Accent Color: Interactive Blue dialog tone.
  - Heading: *"User Feedback Required: Jules is requesting your input or clarification to proceed."*
  - Action: Text input area with `💬 Send Message to Jules` button triggering `sendMessageApi`.

> **CRITICAL RULE**: The system never conflates user feedback with plan approval. Plan approval banners are never displayed when the agent only needs user feedback.

---

## 5. UI Components Breakdown

1. **Session Header**:
   - Session ID with copy button.
   - Specialist agent badge.
   - Animated pulsing status badge.
   - Associated Git branch indicator.
2. **Action Toolbar**:
   - `Approve Plan` (Conditional)
   - `Send Feedback` (Conditional)
   - `Merge Branch` (Enabled only when `SUCCEEDED`)
   - `View Visual Diff`
   - `Open in Jules Web`
   - `Refresh Live Data`
3. **Execution Plan Stepper**:
   - Displays formulated milestones with completion checkmarks.
4. **Activity Timeline**:
   - Real-time stream of bash commands, tool invocations, and agent output in cloud sandbox.
5. **Code Changeset Viewer**:
   - File modification statistics, additions (`+`), and deletions (`-`).
