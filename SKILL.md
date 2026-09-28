---
name: jules-companion
description: Assists the user to view, study, develop, and test code using Google Jules CLI (jules) and GitHub CLI (gh) with 30 specialized language-agnostic agents via native MCP tools or CLI wrappers.
---

# Jules Companion: Specialized AI-Agent Coordination Skill

This custom skill serves as the primary coordinator to launch, synchronize, test, and maintain autonomous **Google Jules** work sessions inside your project by mobilizing **30 language-agnostic specialized agent roles** divided into Coding and Advisory groups.

---

## 🚀 Session Initialization Workflow (The 4 Execution Modes)

At the start of every Jules session, the assistant **MUST** query or identify the following parameters:

1. **Session Execution Mode**:
   - 🚀 **Start (`start`)**: Autonomous execution without pausing for plan approval (`requirePlanApproval: false`). Best for quick tasks, low-risk changes, or routine implementations.
   - 📑 **Review (`review`)**: Jules drafts an execution plan and pauses in `AWAITING_PLAN_APPROVAL`. The developer must authorize the plan before code edits begin. Recommended for complex/core updates.
   - 🎯 **Interactive plan (`interactive`)**: Jules engages in conversational dialogue to clarify goals before formulating an execution plan (pauses in `AWAITING_USER_FEEDBACK`). Best when requirements are exploratory.
   - ⏰ **Scheduled task (`scheduled`)**: Queues a task into `.jules-companion/schedules.json` to execute autonomously at a target future timestamp or delay. Best for overnight/off-peak work.
2. **Agent Assignment**: Which specialized agent (from the 30 agents below) should be deployed? Select the most relevant role based on the task description.
3. **Execution Delegation**: Once sessions are deployed, monitoring is non-blocking. The assistant checks statuses, verifies cloud completion, and assists in inspecting diffs, running tests, and merging completed patches.

---

## 📝 Agent Prompt Construction & Deployment Workflow

When deploying a specialized agent session, the assistant **MUST** construct the session prompt using the following structure:
1. **Load Template**: Read the corresponding agent template file from `references/agents/<agent_name>.md`.
2. **Append Specific Tasks**: Below the template content, append a clear separator (`---`) followed by the user's specific context, instructions, codebase modules to target, and constraints.
3. **Launch/Deploy**: Send the combined prompt text as the primary session instruction.

Example prompt format:
```markdown
[Contents of references/agents/architect.md]

---
## Specific Task Requirements for this Session:
- Refactor the auth middleware to support bearer tokens and session cookies.
- Ensure strict type safety and zero circular dependencies.
```

---

## 🛠️ The 30 Specialist Agents Roster

### 💻 Coding & Architecture Group (Full Implementation Permissions)
- **architect 🏛️**: Senior Systems Architect designing high-level boundaries, clean contracts, and modular interfaces.
- **coder 💻**: Core feature implementation, business logic refactoring, and bug fixes.
- **datasmith 🗄️**: Database schema design, migrations, indexing, and SQL/NoSQL query tuning.
- **deployer 🚀**: CI/CD pipelines, release automation, Docker/containerization, and deployment scripting.
- **exterminator 🪲**: Deep-dive bug investigation, crash log analysis, and root-cause debugging.
- **innovator 💡**: Designing and implementing new functional capabilities following existing architectural patterns.
- **inspector 🔎**: Authoring unit, integration, and E2E test suites to ensure zero regressions.
- **janitor 🧹**: Cleaning up dead code, linting warnings, formatting compliance, and stale dependencies.
- **materialist 🎴**: Styling UI interfaces to strictly adhere to Google Material Design 3 guidelines.
- **modernizer ⚡**: Upgrading legacy codebases to modern standards (ESNext, TypeScript, latest SDKs).
- **netrunner 🌐**: Web server configurations, reverse proxies, port routing, and SSL/TLS certificates.
- **nexus 🔗**: MCP AI integration specialist designing context servers and LLM-to-tool bridges.
- **nomad 🎒**: Ensuring applications run 100% offline and locally without internet connectivity.
- **optimizer ⏱️**: Algorithmic performance profiling, memory reduction, and execution speed optimization.
- **packager 💿**: Clean installers, uninstaller routines, and portable bundler distributions.
- **palette 🎨**: Micro-UX enhancements and frontend accessibility compliance (WCAG/ARIA).
- **partisan 🛰️**: Decentralized architectures, peer-to-peer (P2P) communications, and censor-resistance.
- **profiler 📊**: CPU profiling, memory heap analysis, and memory leak diagnosis.
- **refactorer 🔨**: Code refactoring for simplicity and readability without altering external behavior.
- **revenant 🧟**: Cross-platform background service persistence (Windows, Linux, macOS).
- **scaler 📈**: High availability, caching strategies, and query load balancing.
- **synthesizer 🧬**: Coordinating multi-agent team workflows and synthesizing multi-file updates.

### 📋 Advisory, Review & Documentation Group
- **auditor 📋**: Auditing compliance, software licensing, dependency vulnerabilities, and security risks.
- **curator 📚**: Curating repository documentation, developer onboarding guides, and architectural notes.
- **localizer 🌍**: UI localization, i18n string extraction, date/number formatting, and RTL support.
- **logger 🪵**: Structured JSON logging patterns, request correlation tracing, and telemetry metrics.
- **proteus 🎭**: Flexible, adaptive analysis tailored to unique custom developer requests.
- **scribe ✍️**: Authoring technical documentation, TSDoc comments, API specifications, and READMEs.
- **sentinel 🛡️**: Cyber-security audits, input sanitization, and SQL injection/XSS prevention.
- **strategist ♟️**: Development roadmaps, technical feasibility analysis, and risk mitigation.

---

## 🔌 Primary Execution Standard: Native MCP Tool Calls

When operating in an MCP-compliant host environment (Antigravity IDE, Claude Code, Cursor, Windsurf, OpenCode), AI Agents **MUST** call native **MCP Tools** rather than running terminal CLI commands:

### Available MCP Tools (20 Tools)

1. **`deploy_session`**: Deploys a new Jules session with launch mode (`start`, `review`, `interactive`) and assigned agent.
2. **`merge_session`**: Verifies cloud status via Safety Gate and merges the session branch.
3. **`auto_process`**: Autonomous pipeline: deploy -> monitor -> approve plan -> merge upon success.
4. **`get_session_status`**: Queries real-time session status from Google Jules Cloud REST API.
5. **`setup_workspace`**: Initializes workspace `.jules/` directory and staging files.
6. **`list_agents`**: Lists all 30 specialist agents and their metadata from `registry.json`.
7. **`get_agent_info`**: Reads directives and guardrails for a target agent.
8. **`list_sources`**: Queries linked repository sources registered under the Jules account.
9. **`run_doctor`**: Runs environment health diagnostics (Node.js, Git, API Key, registry integrity).
10. **`create_custom_agent`**: Scaffolds a new custom agent template and updates `registry.json`.
11. **`cancel_session`**: Cancels an active cloud session safely.
12. **`send_session_message`**: Sends a reply or guidance to a session awaiting feedback.
13. **`retry_failed_session`**: Redeploys a failed session using initial task parameters.
14. **`deploy_team`**: Deploys multi-agent team presets (`full-audit`, `feature-sprint`, `refactor-boost`).
15. **`pull_session_diff`**: Extracts raw unified Git diff patch string without merging.
16. **`checkout_session_branch`**: Checks out the isolated Git branch created by Jules.
17. **`create_github_pr`**: Creates a GitHub Pull Request using GitHub CLI (`gh`).
18. **`read_agent_journal`**: Reads operational notes logged in `references/agents/<agent>.journal.md`.
19. **`get_review_reports`**: Scans and lists markdown audit reports in `docs/jules-reviews/`.
20. **`rollback_session`**: Safely reverts a session merge commit from local branch.

---

## 🛠️ Secondary Execution Fallback: CLI Node Scripts

If the host environment does not support native MCP tool invocation:
* **Workspace Setup**: `npm run setup`
* **Session Deployment**: `node dist/deploy_session.js --type start --agents architect --task "Task description" --mode code`
* **Session Merge**: `node dist/merge_session.js --session <sessionId>`
* **Status Check**: `node dist/jules_client.js session show <sessionId>`
