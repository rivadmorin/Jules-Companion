---
name: jules-companion
description: Assists the user to view, study, develop, and test code using Google Jules CLI (jules) and GitHub CLI (gh) with 30 specialized language-agnostic agents via native MCP tools or CLI wrappers.
---

# Jules Companion: Specialized AI-Agent Coordination Skill

This custom skill serves as the primary coordinator to launch, synchronize, test, and maintain autonomous **Google Jules** work sessions inside your project by mobilizing **30 language-agnostic specialized agent roles** divided into Coding and Advisory groups.

---

## 🚀 Session Initialization Workflow (The 3 Questions)

At the start of every Jules session, the assistant **MUST** query the user for the following three parameters:

1. **Session Type**: How should the session be initialized?
   - **Interactive Session (Interactive Plan)**: Real-time, text/CLI-based dialog with the agent. Good for debugging or step-by-step guidance.
   - **Review Plan Session**: Agent drafts a plan and waits. The user must approve/reject before code modification begins. *Highly recommended for complex/core updates.*
   - **Direct Start Session (Plan and Go)**: Automated launch without approval gates. Best for routine or low-risk changes.
2. **Agent Deployment Plan**: Which specialized agents (and how many) should be deployed? Propose relevant roles from the 30 agents below based on the task description.
3. **Task Handover**: Confirm that once the session(s) are launched, the wait is delegated strictly to the user (non-blocking). The assistant's job is only to deploy the sessions, check statuses, and assist in pulling, reviewing, fixing, and merging completed patches.

---

## 📝 Agent Prompt Construction & Deployment Workflow

When deploying a specialized agent session, the assistant **MUST** construct the session prompt using the following structure:
1. **Load Template**: Read the corresponding agent template file from `.jules-companion/references/agents/<agent_name>.md`.
2. **Append Specific Tasks**: Below the template content, append a clear separator (e.g., `---`) followed by the user's specific context, instructions, codebase modules to target, and constraints.
3. **Launch/Deploy**: Send the combined prompt text as the primary session instruction.

Example prompt format:
```markdown
[Contents of references/agents/bolt.md]

---
## Specific Task Requirements for this Session:
- Optimize the `rss_parser.rs` parsing loop.
- Focus on reducing allocation overhead of XML nodes.
```

---

## 🛠️ Classification & Selection of the 30 Specialized Agents

### 💻 Coding Group (Permission to Write & Edit Code)
- **Palette 🎨**: Micro-UX design, interface layouts, and frontend ARIA accessibility.
- **Sentinel 🛡️**: Security vulnerability audits, user input sanitization, data encryption, and secrets protection.
- **Bolt ⚡**: Performance profiling, heavy computation optimization, memoization, and in-memory cache tuning.
- **Nomad 🎒**: Application portability to run 100% locally and offline without internet, ready for USB drive deployment.
- **Packager 💿**: Automated installer/uninstaller scripts, setup automations, and portable binary packaging.
- **Exterminator 🐛**: Bug hunting, inspecting crash logs, and resolving compilation/runtime errors.
- **Builder 🧱**: Scaffolding modular, reusable, and responsive frontend UI components.
- **Conduit 🔌**: API routing (REST/GraphQL), request parameters validation, and data response standardization.
- **Alchemist 🧪**: Database schema design, migrations, index optimization, and SQL/NoSQL query tuning.
- **Gatekeeper 🔑**: JWT/OAuth authentication setups, token management, and RBAC access control authorization.
- **Bridge 🧲**: Third-party API integrations, timeouts, retries, and test mock server setups.
- **Dockerist 🐳**: Containerization with multi-stage Dockerfiles, modular docker-compose setups, and CI/CD pipelines.
- **Modernizer ⚙️**: Refactoring legacy syntaxes, replacing deprecated functions, and major package upgrades.
- **Inspector 🔎**: Authoring unit, integration, and E2E test suites to secure code reliability.
- **Janitor 🧹**: Code cleanup, formatting compliance, resolving compiler warnings, and dead code removal.
- **Logger 🪵**: Structured JSON logging implementation, request correlation IDs, and APM telemetry.
- **Benchmarker ⏱️**: System stress-testing, high-concurrency simulation, and peak latency (P99) audits.
- **Watcher 👁️**: Input/output schema validations, enforcing type-safe inputs, and serialization integrity checks.
- **Chameleon 🦎**: Porting or translating codebase modules between different programming languages idiomatically.
- **Innovator 💡**: Implementing small-to-medium new functional features following established architectures.
- **Materialist 🎴**: Styling UI interfaces to strictly follow Google Material Design 3 guidelines.
- **Partisan 🛰️**: Decentralization, overlay networks (P2P), Tor/I2P proxy routing, and censor-resistance.
- **Netrunner 🌐**: Reverse proxy setups, web server configurations, SSL/TLS certificates, and LAN/Internet routing.
- **Adapter 🔌**: Cross-platform compatibility (Windows, Linux, macOS), dynamic path joins, and cross-OS script helpers.

### 📝 Documenting & Advisory Group (Only Write Markdown/Reviews)
*Strictly forbidden from modifying source files. Only allowed to write Markdown (`.md`), diagrams, or review logs.*
- **Scribe 📝**: Crafting premium README.md files, API specifications, and contributor guidelines.
- **Cartographer 🗺️**: Mapping project folder structures in ASCII trees, Mermaid flowcharts, and dependency diagrams.
- **Grader 📊**: Assessing codebase quality, calculating cognitive complexities, and prioritizing technical debts.
- **Consultant 🧠**: Evaluating architectural requirements and authoring Architectural Decision Records (ADRs).
- **Critic 🗣️**: Reviewing git diffs/PRs, identifying code smells, and writing reviews without changing application files.
- **Proteus 🎭**: Handling custom flexible analyses based on unique user requests (pure Markdown outputs).

---

## 🔌 Primary Execution Standard: Native MCP Tool Calls

When operating in an MCP-compliant host environment (Antigravity IDE, Claude Code, OpenCode, Cursor, Windsurf, etc.), AI Agents **MUST** prioritize calling native **MCP Tools** over executing terminal CLI shell commands.

### Available MCP Tools & Schema Mapping

1. **`jules-companion/deploy_session`**: Deploys a new Jules session with specialized agents.
   ```json
   {
     "type": "start",
     "agents": "bolt",
     "task": "Optimize RSS XML parsing loop",
     "mode": "code"
   }
   ```
2. **`jules-companion/merge_session`**: Inspects or approves a completed session.
   - Inspect: `{ "sessionId": "12345", "inspect": true }`
   - Approve/Merge: `{ "sessionId": "12345", "approve": true }`
   - Inspect All: `{ "inspectAll": true }`
3. **`jules-companion/auto_process`**: Auto-approves execution plans & auto-replies.
   - Bulk All: `{ "all": true }`
   - Target Session: `{ "sessionId": "12345", "reply": "Proceed with execution" }`
4. **`jules-companion/get_session_status`**: Queries real-time session status from Google REST API.
   - `{ "sessionId": "12345" }`
5. **`jules-companion/setup_workspace`**: Initializes workspace staging environment.
   - `{}`
6. **`jules://sessions` (MCP Resource)**: Reads active and historical session state.

---

## 🛠️ Secondary Execution Fallback: CLI Node Scripts

If the host environment does not support native MCP tool invocation, agents may fall back to direct Node CLI execution in the terminal:

* **Automated Environment Setup**:
  `node dist/setup.js`
* **Session Deployment**:
  `node dist/deploy_session.js --type start --agents bolt --task "Task description" --mode code`
* **Auto-Process Engine**:
  `node dist/auto_process.js --all`
* **Session Inspection & Merge**:
  `node dist/merge_session.js --inspect <session_id>`
  `node dist/merge_session.js --approve <session_id>`
* **Direct REST API Queries**:
  `node dist/jules_client.js status <session_id>`

---

## 🚀 AI Agent Slash Commands Interpretation

When the user types any of the following `/jules-*` slash commands in the chat prompt, the AI Agent **MUST** interpret them and execute the corresponding **MCP Tool call** as the primary action. Fall back to terminal bash commands only if MCP is unavailable.

*   **/jules-deploy `<agent>` `<task>`**
    *   **Primary (MCP Tool Call)**: Call `jules-companion/deploy_session` with:
        `{ "type": "start", "agents": "<agent>", "task": "<task>", "mode": "code" }`
    *   **Fallback (CLI)**: `node dist/deploy_session.js --type start --agents <agent> --task "<task>"`

*   **/jules-review `<agent>` `<task>`**
    *   **Primary (MCP Tool Call)**: Call `jules-companion/deploy_session` with:
        `{ "type": "review", "agents": "<agent>", "task": "<task>", "mode": "review" }`
    *   **Fallback (CLI)**: `node dist/deploy_session.js --type review --agents <agent> --task "<task>"`

*   **/jules-status**
    *   **Primary (MCP Tool / Resource)**: Read resource `jules://sessions` or call `jules-companion/get_session_status`.
    *   **Fallback (CLI)**: `node dist/jules_client.js list --json`

*   **/jules-auto**
    *   **Primary (MCP Tool Call)**: Call `jules-companion/auto_process` with:
        `{ "all": true }`
    *   **Fallback (CLI)**: `node dist/auto_process.js --all`

*   **/jules-inspect `<session_id>`**
    *   **Primary (MCP Tool Call)**: Call `jules-companion/merge_session` with:
        `{ "sessionId": "<session_id>", "inspect": true }`
    *   **Fallback (CLI)**: `node dist/merge_session.js --inspect <session_id>`

*   **/jules-merge `<session_id>`**
    *   **Primary (MCP Tool Call)**: Call `jules-companion/merge_session` with:
        `{ "sessionId": "<session_id>", "approve": true }`
    *   **Fallback (CLI)**: `node dist/merge_session.js --approve <session_id>`

*   **/jules-doctor**
    *   **Action**: Execute diagnostic integrity checks on `SKILL.md`, `.env`, `.gitignore`, `git`, `gh`, and `node` versions, then report back.

---

## 🛡️ Git Safeguards & Linting Protocol (Conflict Prevention & Rollback)

To protect the local codebase from broken patches or destructive code generation:

### 1. Git Pre-Flight Check & Backup
*   Before applying patches, check local status: `git status`. Ensure the working tree is clean.
*   Run a backup stash: `git stash push -u -m "jules-companion-backup"`.

### 2. Patch-Based Branch Isolation Merge Strategy
When merging multiple patches generated in parallel:
1.  Ensure you are on a fresh integration branch (e.g., `jules-integration`).
2.  For each diff, create an isolated branch from the base commit:
    ```bash
    git checkout main -b branch-bolt
    git apply scratch/bolt_pull.diff
    git add .
    git commit -m "Apply Bolt patch"
    ```
3.  Checkout your integration branch and merge the patch branch:
    ```bash
    git checkout jules-integration
    git merge branch-bolt --no-edit
    ```
4.  If conflicts arise, Git's 3-way merge engine will highlight conflict markers. Resolve them manually, then run `git add .` and `git commit` to finalize.

### 3. Syntax Validation & Linting Gates
After applying/merging any patch, the assistant **MUST** run language-specific validations before presenting the code to the user:
*   **Rust**: Run `cargo check` and `cargo test`.
*   **JavaScript/TypeScript**: Run `npm run check` or `tsc --noEmit`.
*   **Python**: Run `flake8` or `mypy`.
*   Fix any unclosed delimiters, invalid syntax, or leftover git conflict markers immediately.

---

## 🛡️ Clean Uninstallation Cleanup

If the `.jules-companion/` folder is deleted by the user, revert any local stashes or temporary branches cleanly.
