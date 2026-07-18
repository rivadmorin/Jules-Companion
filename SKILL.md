---
name: jules-companion
description: Assists the user to view, study, develop, and test code using Google Jules CLI (jules) and GitHub CLI (gh) with 30 specialized language-agnostic agents.
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

## 🛰️ Google REST API Integration Priority

Due to limitations or deprecated commands in the local `jules` CLI (e.g. lack of `reply` or `sendMessage` commands), the skill prioritizes interacting with Google Jules sessions using the **Google REST API** (endpoints defined under `https://jules.googleapis.com/v1alpha/sessions/`).

All local session operations should be handled via the Node client helper located at `.jules-companion/scripts/jules_client.js`.

### 1. REST API Configuration
Store your Google Jules REST API key in the `.jules-companion/.env` file:
```env
JULES_API_KEY=your_google_jules_api_key_here
```

### 2. Session CLI Helpers (REST-powered)
Use the local script wrappers for non-blocking monitoring and control:
*   **Check Session Statuses**: 
    ```bash
    .jules-companion/scripts/check_sessions.sh
    ```
*   **Auto-Approve Awaiting Plans**:
    ```bash
    .jules-companion/scripts/auto_process.sh
    ```
*   **Direct REST commands via Node client**:
    ```bash
    # Get details of a session
    node .jules-companion/scripts/jules_client.js status <session_id>
    
    # Get session list in raw JSON format (ideal for downstream tools/agents)
    node .jules-companion/scripts/jules_client.js list --json
    
    # Send a reply or manual instruction to a session
    node .jules-companion/scripts/jules_client.js reply <session_id> "your message"
    
    # Pull the latest completed patch to a local file
    node .jules-companion/scripts/jules_client.js pull <session_id> scratch/patch_name.diff
    ```
*   **Auto-deploy customized agent sessions**:
    ```bash
    # Deploys Bolt and Watcher agents, using their templates combined with user instructions
    node .jules-companion/scripts/deploy_session.js --type review --agents bolt,watcher --task "Optimize TUI render path"
    ```
*   **Consolidated Merge Pipeline**:
    ```bash
    # Automatically pulls all COMPLETED sessions, merges them via isolated branches, and runs tests
    node .jules-companion/scripts/merge_pipeline.js
    ```

---

## 🛡️ Clean Uninstallation Cleanup

If the `.jules-companion/` folder is deleted by the user, the cleanup should also revert any local stashes or temporary branches. 

---

## 🛡️ Git Safeguards & Linting Protocol (Conflict Prevention & Rollback)

To protect the local codebase from broken patches or destructive code generation:

### 1. Git Pre-Flight Check & Backup
*   Before applying patches, check local status: `git status`. Ensure the working tree is clean.
*   Run a backup stash: `git stash push -u -m "jules-companion-backup"`.

### 2. Patch-Based Branch Isolation Merge Strategy
When merging multiple patches generated in parallel (or single patches with high collision risks):
1.  Ensure you are on a fresh integration branch (e.g., `jules-integration`).
2.  For each diff, create an isolated branch from the base commit (e.g., `branch-bolt` from `main`):
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
4.  If conflicts arise, Git's 3-way merge engine will highlight conflict markers (`<<<<<<<` and `>>>>>>>`). Resolve them manually, then run `git add .` and `git commit` to finalize.

### 3. Syntax Validation & Linting Gates
After applying/merging any patch, the assistant **MUST** run language-specific validations before presenting the code to the user:
*   **Rust**: Run `cargo check` and `cargo test`.
*   **JavaScript/TypeScript**: Run `npm run check` or `tsc --noEmit`.
*   **Python**: Run `flake8` or `mypy`.
*   Check for unclosed delimiters, unstable syntax features (e.g. `let_chains` in stable Rust), and leftover git conflict markers. Fix any errors immediately.

---

## ⚕️ Evaluation Command `/jules-companion doctor`

Run `/jules-companion doctor` in the chat to check:
*   Local folder and configuration integrity (`SKILL.md`, `.env`, `sessions.json`).
*   Gitignore exclusion status.
*   System dependencies (`node`, `git`, `gh`).
*   Active JULES_API_KEY presence and connectivity.
