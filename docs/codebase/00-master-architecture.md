# 00 - Master Architecture & System Design
**Jules Companion: Enterprise AI Agent Extension & Orchestration Platform**

---

## 1. Overview & Architectural Goals

**Jules Companion** is an AI agent orchestration platform and native IDE extension (fully compatible with Visual Studio Code and Google Antigravity IDE) that bridges local developer environments with the cloud-native Google Jules autonomous coding service.

The primary architectural goals of Jules Companion are:
1. **Multi-Modal Execution**: Full support for all 4 official Google Jules launch modes (`start`, `review`, `interactive`, `scheduled`).
2. **Autonomous Background Scheduling**: Standalone local task scheduler that evaluates due tasks and autonomously deploys them without manual developer intervention.
3. **State Reconciliation & Safety Gate**: Transparent reconciliation between live cloud state (`ACTIVE`, `AWAITING_PLAN_APPROVAL`, `AWAITING_USER_FEEDBACK`, `SUCCEEDED`, `FAILED`) and local disk cache, protected by a fail-safe *Safety Gate* before any Git merge operations.
4. **Dual Interface Compatibility**: Operable visually via IDE TreeViews & Mission Control Webview, or programmatically by Large Language Models (LLMs) via the Model Context Protocol (MCP) using 20 native tools.
5. **Clean Separation of Concerns**: Highly modular design strictly separating UI, Core Domain, API Client, MCP Server, and Storage layers.

---

## 2. High-Level Layered Architecture

The system is organized into 5 independent yet neatly orchestrated layers:

```mermaid
graph TD
    subgraph Layer 1: Presentation & UI Layer
        EXT["Extension Controller\n(scripts/extension.ts)"]
        TV["Tree Data Providers\n(Sessions, Workspace, Agents, Journals)"]
        MC["Mission Control Webview\n(scripts/ui/mission_control.ts)"]
        VD["Visual Diff Viewer\n(scripts/ui/visual_diff.ts)"]
        WIZ["Custom Agent Wizard\n(scripts/ui/custom_agent_wizard.ts)"]
    end

    subgraph Layer 2: Orchestration & Engine Layer
        DEP["Deploy Session Engine\n(scripts/deploy_session.ts)"]
        MRG["Merge Engine & Safety Gate\n(scripts/merge_session.ts)"]
        SCHED["Task Scheduler Engine\n(scripts/core/scheduler.ts)"]
        LS["LiveSync Manager\n(scripts/ui/live_sync.ts)"]
        AUTO["Auto Process Runner\n(scripts/auto_process.ts)"]
    end

    subgraph Layer 3: Protocol & Transport Layer
        MCP_SRV["MCP Server (JSON-RPC stdio)\n(scripts/mcp_server.ts)"]
        MCP_REG["MCP Tool Registry (20 Tools)\n(scripts/mcp/registry.ts)"]
        HTTP["HTTP Client & Auth Handler\n(scripts/client/http.ts)"]
        API["Jules REST API Wrapper\n(scripts/client/jules_api.ts)"]
        CLI["Jules CLI Fallback Wrapper\n(scripts/jules_client.ts)"]
    end

    subgraph Layer 4: Domain Core & Persistence Layer
        TYPES["Domain Types & Contracts\n(scripts/core/types.ts)"]
        STOR["Atomic Storage Engine\n(scripts/core/storage.ts)"]
        GIT["Git CLI Wrapper\n(scripts/core/git.ts)"]
        UTILS["Shared Utilities & Health Doctor\n(scripts/utils.ts)"]
    end

    subgraph Layer 5: Data & External Resources
        JSON_SESS[".jules/sessions.json\n(Local Session Cache)"]
        JSON_SCHED[".jules-companion/schedules.json\n(Scheduled Tasks)"]
        AGENTS["references/agents/*.md\n(30 Specialized Agent Roles)"]
        REG["references/agents/registry.json\n(Global Agent Catalog)"]
        CLOUD["Google Jules Cloud API\n(https://jules.googleapis.com/v1alpha)"]
    end

    EXT --> DEP & MRG & SCHED & LS & TV & MC & VD & WIZ
    MCP_SRV --> MCP_REG
    MCP_REG --> DEP & MRG & SCHED & API & UTILS
    DEP & MRG & SCHED & AUTO --> API & STOR & GIT
    LS --> API & SCHED & STOR
    API --> HTTP --> CLOUD
    STOR --> JSON_SESS
    SCHED --> JSON_SCHED
```

---

## 3. Data Flow & Subsystem Interactions

### 3.1. Session Deployment Flow (4 Launch Modes)

The following sequence illustrates how a session deployment request is processed based on `LaunchMode`:

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer / Agent
    participant Ext as Extension / MCP
    participant Engine as deploySessionCore
    participant Sched as Scheduler Engine
    participant API as Jules REST API
    participant Cloud as Google Jules Cloud

    User->>Ext: Request Deploy (Agent, Task, Mode)
    
    alt Mode == 'scheduled'
        Ext->>Sched: addScheduledTask(task, agent, scheduledAt)
        Sched->>Sched: Save to .jules-companion/schedules.json
        Sched-->>User: Task Scheduled Notification
    else Mode in ['start', 'review', 'interactive']
        Ext->>Engine: deploySessionCore(options)
        Engine->>Engine: Validate agent against registry
        Engine->>Engine: Validate target branch & remote
        
        opt Mode == 'interactive'
            Engine->>Engine: Inject conversational goal clarification directive
        end

        Engine->>API: createSessionApi(prompt, branch, requirePlanApproval)
        API->>Cloud: POST /v1alpha/sessions
        Cloud-->>API: Session ID, Initial Status
        API-->>Engine: Session Created
        Engine->>Engine: Atomic write to .jules/sessions.json
        Engine-->>User: Deployment Result & Web URL
    end
```

### 3.2. Background Synchronization & Scheduled Execution Loop

```mermaid
sequenceDiagram
    autonumber
    participant Timer as LiveSync Polling Timer (30s)
    participant LS as LiveSyncManager
    participant Sched as Scheduler Engine
    participant API as Jules Cloud API
    participant UI as VS Code UI / Status Bar

    Timer->>LS: Tick (pollOnce)
    LS->>Sched: executeDueTasks(targetDir)
    
    opt Has Due Tasks (scheduledAt <= now)
        Sched->>Sched: Mark task as 'running'
        Sched->>API: deploySessionCore(task)
        API-->>Sched: Session Created (ID)
        Sched->>Sched: Mark task as 'completed', attach sessionId
        Sched-->>LS: Fired count > 0
        LS->>UI: Show Notification ("🚀 Scheduled task deployed!")
    end

    LS->>API: listSessionsApi()
    API-->>LS: Fresh Cloud Sessions List
    LS->>LS: Reconcile active session states
    LS->>UI: Refresh Sessions TreeView & Status Bar Metrics
```

---

## 4. State Machine & Status Reconciliation

Jules session statuses are managed with strict, deterministic transitions:

```mermaid
stateDiagram-v2
    [*] --> PENDING: deploySessionCore
    PENDING --> RUNNING: Cloud Agent Picked Up
    
    RUNNING --> AWAITING_PLAN_APPROVAL: Formulated Plan (Mode: Review)
    RUNNING --> AWAITING_USER_FEEDBACK: Needs Goal Clarification (Mode: Interactive / Input Needed)
    
    AWAITING_PLAN_APPROVAL --> RUNNING: User Approves Plan (jules.approvePlan)
    AWAITING_USER_FEEDBACK --> RUNNING: User Sends Message (jules.sendMessage)
    
    RUNNING --> SUCCEEDED: Code Complete & Changes Ready
    RUNNING --> FAILED: Execution Error / Timeout
    RUNNING --> CANCELLED: User Cancels Session
    
    SUCCEEDED --> MERGED: mergeSessionCore (Safety Gate Passed)
    SUCCEEDED --> PR_CREATED: createGitHubPR
    
    SUCCEEDED --> ARCHIVED: archiveSession
    FAILED --> ARCHIVED: archiveSession
    MERGED --> [*]
    ARCHIVED --> [*]
```

### Core Design Rules:
1. **Status Disambiguation**: The states `AWAITING_PLAN_APPROVAL` and `AWAITING_USER_FEEDBACK` are strictly decoupled. The system never displays a plan approval form if the cloud agent is merely asking for user input or goal clarification.
2. **Cloud Live Priority**: Data returned by `getSessionApi` cloud endpoint takes precedence over local disk cache to prevent stale action triggers.

---

## 5. Security & Isolation Policies

1. **Content Security Policy (CSP) in Webview**:
   - The Mission Control Webview enforces strict CSP (`default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-...';`).
   - Inline event handlers (`onclick="..."`) are strictly prohibited. All user actions utilize semantic Event Delegation via `data-action` attributes.
2. **Credential Resolution**:
   - Google Jules API key is resolved hierarchically: VS Code configuration (`jules.apiKey`) -> Environment variable (`JULES_API_KEY` / `GEMINI_API_KEY`) -> local `.env` file -> Secure interactive prompt.
3. **Safety Gate Merge Verification**:
   - `mergeSessionCore` rejects branch merges if the session is not verified as `SUCCEEDED` on Google Jules Cloud.
4. **Atomic Disk Writes**:
   - Modifications to `.jules/sessions.json` and `.jules-companion/schedules.json` use synchronous atomic persistence to avoid race conditions across processes.

---

## 6. Architectural Governance & Quality Tooling

The integrity and simplicity of this codebase is continuously guarded by two open-source developer tools:
1. **[Sentrux](https://github.com/sentrux/sentrux)**: Automated architectural linter enforcing strict acyclic downward layering via [`.sentrux/rules.toml`](../../.sentrux/rules.toml). Validated via `npm run sentrux:check` and `sentrux check .`.
2. **[Ponytail](https://github.com/DietrichGebert/ponytail)**: Pragmatic senior developer ruleset for human contributors and AI coding assistants, enforcing YAGNI, standard library prioritization, and minimal surgical diffs. Runs via `/ponytail full` and `/ponytail-review`.
