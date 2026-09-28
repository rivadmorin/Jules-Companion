# 00 - Master Architecture & System Design
**Jules Companion: Enterprise AI Agent Extension & Orchestration Platform**

---

## 1. Overview & Architectural Goals

**Jules Companion** adalah platform orkestrasi agen AI dan ekstensi IDE (kompatibel penuh dengan Visual Studio Code dan Google Antigravity IDE) yang menghubungkan developer lokal dengan layanan cloud Google Jules.

Tujuan utama arsitektur Jules Companion meliputi:
1. **Multi-Modal Execution**: Mendukung penuh 4 mode peluncuran sesi resmi Google Jules (`start`, `review`, `interactive`, `scheduled`).
2. **Autonomous Background Scheduling**: Mesin penjadwalan lokal yang memicu eksekusi sesi otonom saat jatuh tempo tanpa intervensi manual.
3. **State Reconciliation & Safety**: Rekonsiliasi transparan antara status sesi cloud live (`ACTIVE`, `AWAITING_PLAN_APPROVAL`, `AWAITING_USER_FEEDBACK`, `SUCCEEDED`, `FAILED`) dan status lokal di disk, dilindungi *Safety Gate* sebelum operasi merge Git.
4. **Dual Interface Compatibility**: Dapat dioperasikan secara visual melalui IDE TreeView & Mission Control Webview, atau secara programatis oleh model bahasa besar (LLM) melalui protokol standar Model Context Protocol (MCP) dengan 20 native tools.
5. **Clean Separation of Concerns**: Modularitas tinggi dengan pemisahan tegas antara UI, Domain Core, API Client, MCP Server, dan Storage.

---

## 2. High-Level Layered Architecture

Sistem dirancang dalam 5 lapisan independen namun terkoordinasi secara rapi:

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

Diagram berikut mengilustrasikan bagaimana sebuah permintaan sesi diproses berdasarkan `LaunchMode`:

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

Status sesi Jules dikelola dengan transisi tegas:

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

### Prinsip Penting:
1. **Diferensiasi Status**: Status `AWAITING_PLAN_APPROVAL` dan `AWAITING_USER_FEEDBACK` dipisahkan secara tegas. Sistem tidak pernah menampilkan form persetujuan rencana jika agen hanya menanyakan klarifikasi masukan.
2. **Prioritas Cloud Live**: Data dari endpoint `getSessionApi` cloud selalu diprioritaskan di atas cache disk lokal untuk mencegah aksi usang (*stale action*).

---

## 5. Keamanan & Kebijakan Isolasi

1. **Content Security Policy (CSP) Webview**:
   - Webview Mission Control menggunakan CSP ketat (`default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-...';`).
   - Tidak ada inline event handler (`onclick="..."`). Seluruh aksi menggunakan arsitektur Event Delegation berbasis atribut `data-action`.
2. **Penyimpanan Kredensial**:
   - API Key Google Jules diresolusi dengan urutan aman: Konfigurasi VS Code (`jules.apiKey`) -> Environment Variable (`JULES_API_KEY` / `GEMINI_API_KEY`) -> `.env` file lokal -> Interactive Secure Prompt.
3. **Safety Gate Verifikasi Merge**:
   - `mergeSessionCore` menolak menggabungkan branch jika sesi belum diverifikasi tuntas di Google Jules Cloud (`status === 'SUCCEEDED'`).
4. **Penulisan Berkas Atomik**:
   - Operasi modifikasi `.jules/sessions.json` dan `.jules-companion/schedules.json` menggunakan teknik serialisasi sinkron untuk mencegah *race condition* antar proses.
