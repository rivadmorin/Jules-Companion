---
name: jules-companion
description: Assists the user to view, study, develop, and test code using Google Jules CLI (jules) and GitHub CLI (gh) with 63 specialized language-agnostic agents via native MCP tools or CLI wrappers.
---

# Jules Companion: Specialized AI-Agent Coordination Skill

This custom skill serves as the primary coordinator to launch, synchronize, test, and maintain autonomous **Google Jules** work sessions inside your project by mobilizing **63 language-agnostic specialized agent roles** divided into Coding and Advisory groups.

---

## 🚀 Session Initialization Workflow (The 4 Execution Modes)

At the start of every Jules session, the assistant **MUST** query or identify the following parameters:

1. **Session Execution Mode**:
   - 🚀 **Start (`start`)**: Autonomous execution without pausing for plan approval (`requirePlanApproval: false`). Best for quick tasks, low-risk changes, or routine implementations.
   - 📑 **Review (`review`)**: Jules drafts an execution plan and pauses in `AWAITING_PLAN_APPROVAL`. The developer must authorize the plan before code edits begin. Recommended for complex/core updates.
   - 🎯 **Interactive plan (`interactive`)**: Jules engages in conversational dialogue to clarify goals before formulating an execution plan (pauses in `AWAITING_USER_FEEDBACK`). Best when requirements are exploratory.
   - ⏰ **Scheduled task (`scheduled`)**: Queues a task into `.jules-companion/schedules.json` to execute autonomously at a target future timestamp or delay. Best for overnight/off-peak work.
2. **Agent Assignment**: Which specialized agent (from the 63 agents below) should be deployed? Select the most relevant role based on the task description.
3. **Execution Delegation**: Once sessions are deployed, monitoring is non-blocking. The assistant checks statuses, verifies cloud completion, and assists in inspecting diffs, running tests, and merging completed patches.

---

## 📝 Agent Prompt Construction & Deployment Workflow

When deploying a specialized agent session, the assistant **MUST** construct the session prompt using the following structure:
1. **Load Template**: Read the corresponding agent template file from `references/agents/<agent_name>.md`.
2. **Append Specific Tasks**: Below the template content, append a clear separator (`---`) followed by the user's specific context, instructions, codebase modules to target, and constraints.
3. **Launch/Deploy**: Send the combined prompt text as the primary session instruction.

Example prompt format:
```markdown
[Contents of references/agents/innovator.md]

---
## Specific Task Requirements for this Session:
- Refactor the auth middleware to support bearer tokens and session cookies.
- Ensure strict type safety and zero circular dependencies.
```

---

## 🛠️ The 63 Specialist Agents Roster

### 💻 Coding & Architecture Group (36 Agents)
- **adapter 🔌**: Cross-Platform Compatibility (Windows/Linux/macOS) ensuring zero path resolution or shell failures.
- **alchemist 🧪**: Database migrations, model relationships, indexing lookup columns, and SQL query tuning.
- **benchmarker ⏱️**: Stress testing scripts, concurrent traffic simulation, and latency profiling under load.
- **bolt ⚡**: Algorithmic performance, memoization, caching, and execution speed optimizations.
- **bridge 🧲**: Third-party API provider integrations, webhook contracts, and mock test servers.
- **builder 🧱**: Clean, modular, reusable, and responsive frontend UI component scaffolding.
- **chameleon 🦎**: Language and stack porting, translating modules idiomatically between ecosystems.
- **conduit 🔌**: Backend API routing, middleware, RESTful/GraphQL endpoints, and response models.
- **consolidator 🧩**: DRY consolidation, extracting copy-pasted duplicate logic across files into clean shared helpers.
- **decoupler 🧩**: Inversion of Control & Loose Coupling, breaking module knots and untangling circular dependencies.
- **dockerist 🐳**: Dockerfiles, modular docker-compose environments, and containerized test execution.
- **enforcer 📏**: Coding standards, directory conventions, SOLID principles, and architectural boundaries.
- **exterminator 🐛**: Deep-dive bug investigation, crash log analysis, and regression-free patches.
- **gatekeeper 🔑**: User authentication mechanisms, secure token handling, and RBAC authorization.
- **hermetic 🧊**: Data immutability, pure deterministic functions, and side-effect isolation across components.
- **innovator 💡**: Designing and implementing new functional capabilities following existing architectural patterns.
- **inspector 🔎**: Authoring unit, integration, and E2E test suites to maintain zero regressions.
- **janitor 🧹**: Cleaning dead code, resolving linter warnings, formatting compliance, and stale dependencies.
- **logger 🪵**: Structured JSON logging patterns, request correlation tracing, and telemetry metrics.
- **materialist 🎴**: Styling UI interfaces to strictly adhere to Google Material Design 3 guidelines.
- **modernizer ⚙️**: Upgrading legacy codebases to modern standards (ESNext, TypeScript, latest SDKs).
- **monorepist 🏗️**: Monorepo workspaces, multi-package architecture, and cross-package dependency optimization.
- **netrunner 🌐**: Web server configurations, reverse proxies, port routing, and SSL/TLS certificates.
- **nomad 🎒**: Ensuring applications run 100% offline and locally without internet connectivity.
- **octo 🐙**: GitHub Workflows, Actions, and repository operations with strict non-destructive preservation and evolutionary enhancement boundaries.
- **packager 💿**: Clean installers, uninstaller routines, portable bundler configs, and distribution packages.
- **palette 🎨**: Micro-UX enhancements and frontend accessibility compliance (WCAG/ARIA).
- **partisan 🛰️**: Decentralized architectures, peer-to-peer (P2P) communications, and censor-resistance.
- **plugger 🔌**: Plugin architecture, lifecycle hooks, and extensible microkernel registries without core modifications.
- **pruner ✂️**: Dependency diet and dead package manifest purging, eliminating unimported ghost dependencies.
- **sentinel 🛡️**: Code security audits, input sanitization, and SQL injection/XSS prevention.
- **slimmer 📦**: Bundle size, tree-shaking, code splitting, and client-side asset diet optimization.
- **specifier 📑**: OpenAPI 3.0/3.1 and Swagger machine-readable contract authoring and validation.
- **speedster 🏎️**: Build time, incremental compiler tuning, persistent caching, and dev loop acceleration.
- **standardizer 📐**: Error handling hierarchies, predictable HTTP status codes, and unified API response envelopes.
- **watcher 👁️**: Data integrity, incoming/outgoing schema validations, and runtime type safety constraints.

### 📋 Advisory, Review & Documentation Group (27 Agents)
- **annotator 🏷️**: Precise inline code comments, block documentation (TSDoc/JSDoc), and code clarity.
- **archivist 📜**: Structured changelogs, release documentation, deprecated API tracking, and migration guides.
- **attestor 🔏**: Security policies, STRIDE threat modeling, vulnerability disclosure protocols, and compliance documentation.
- **cartographer 🗺️**: Codebase directory mapping, dependency flowcharts, and Mermaid/ASCII topology layouts.
- **consultant 🧠**: Framework evaluations and Architectural Decision Records (ADRs).
- **critic 🗣️**: Senior code review, critiquing diffs, design anti-patterns, and logic efficiency.
- **curator 📚**: Repository knowledge bases, developer onboarding guides, and architectural notes.
- **datasmith 🗄️**: SQLite database specialist, schema normalization, query indexing, and local data integrity.
- **explainer 💡**: Complex logic walkthroughs, conceptual guides, and algorithmic step-by-step traces.
- **gitsmith 🌿**: Git history hygiene, Conventional Commits, interactive rebase squashing, and branch cleanliness.
- **grader 📊**: Code health audits, cognitive complexity calculation, and technical debt prioritization.
- **green 🌱**: Energy efficiency, minimizing carbon footprint, reducing CPU/RAM, and green computing.
- **guildmaster 🤝**: Contributor experience, CONTRIBUTING guidelines, PR templates, and open-source governance.
- **lexicon 📖**: Domain glossary, ubiquitous language standardization, and naming consistency across code and docs.
- **localizer 🌍**: UI localization, i18n string extraction, date/number formatting, and RTL support.
- **mutator 🧬**: Mutation testing, test resilience audits, and synthetic bug injection to eliminate false coverage.
- **nexus 🔗**: MCP (Model Context Protocol) AI integration specialist designing context servers and LLM tools.
- **planner 📋**: Step-by-step TDD implementation blueprints with verifiable execution criteria before coding.
- **proteus 🎭**: Flexible, adaptive analysis tailored to unique custom developer requests.
- **revenant 🧟**: Cross-platform background service persistence (Windows, Linux, macOS).
- **scaler 📈**: High availability, caching strategies, load balancing, and traffic spike handling.
- **scoper 🎯**: MVP slicing, YAGNI enforcement, and ruthless scope pruning for 1-day shippable delivery.
- **scribe ✍️**: README.md authoring, technical documentation, API specifications, and developer guides.
- **sleuth 🕵️**: Forensics, memory leak tracing, crash dump analysis, and deep production log inspection.
- **smith 🧰**: Developer Experience (DevEx), internal tooling, Git hooks, and developer workflow tuning.
- **synapse 🧠**: AI integration, prompt engineering, RAG pipelines, and LLM token optimization.
- **vscecraft 💿**: VS Code extension bundling, packaging optimization, `.vscodeignore` auditing, and marketplace release.

---

## 👥 Multi-Agent Team Presets (`deploy_team`)

Deploy coordinated specialist teams to solve multifaceted tasks simultaneously:
- **`github-ops`** (`octo,smith,scribe,archivist`): Full GitHub CI/CD automation, DevEx tooling, pipeline documentation, and release changelog hygiene.
- **`full-audit`** (`sentinel,janitor,annotator,grader`): Comprehensive security scan, lint cleanup, inline documentation annotation, and technical debt audit.
- **`feature-sprint`** (`innovator,builder,inspector`): End-to-end feature delivery: architecture design, UI component scaffolding, and automated unit/integration tests.
- **`refactor-boost`** (`modernizer,bolt,inspector`): Legacy code upgrades, algorithmic performance optimization, and regression testing.

---

## 🔌 Primary Execution Standard: Native MCP Tool Calls

When operating in an MCP-compliant host environment (Antigravity IDE, Claude Code, Cursor, Windsurf, OpenCode), AI Agents **MUST** call native **MCP Tools** rather than running terminal CLI commands:

### Available MCP Tools (20 Tools)

1. **`deploy_session`**: Deploys a new Jules session with launch mode (`start`, `review`, `interactive`) and assigned agent.
2. **`merge_session`**: Verifies cloud status via Safety Gate and merges the session branch.
3. **`auto_process`**: Autonomous pipeline: deploy -> monitor -> approve plan -> merge upon success.
4. **`get_session_status`**: Queries real-time session status from Google Jules Cloud REST API.
5. **`setup_workspace`**: Initializes workspace `.jules/` directory and staging files.
6. **`list_agents`**: Lists all 63 specialist agents and their metadata from `registry.json`.
7. **`get_agent_info`**: Reads directives and guardrails for a target agent.
8. **`list_sources`**: Queries linked repository sources registered under the Jules account.
9. **`run_doctor`**: Runs environment health diagnostics (Node.js, Git, API Key, registry integrity).
10. **`create_custom_agent`**: Scaffolds a new custom agent template and updates `registry.json`.
11. **`cancel_session`**: Cancels an active cloud session safely.
12. **`send_session_message`**: Sends a reply or guidance to a session awaiting feedback.
13. **`retry_failed_session`**: Redeploys a failed session using initial task parameters.
14. **`deploy_team`**: Deploys multi-agent team presets (`github-ops`, `full-audit`, `feature-sprint`, `refactor-boost`).
15. **`pull_session_diff`**: Extracts raw unified Git `.diff` file and verifies patch conflict status (`git apply --check`).
16. **`checkout_session_branch`**: Checks out the isolated Git branch created by Jules.
17. **`create_github_pr`**: Creates a GitHub Pull Request using GitHub CLI (`gh`).
18. **`read_agent_journal`**: Reads operational notes logged in `.jules/<agent>.md`.
19. **`get_review_reports`**: Scans and lists markdown audit reports in `docs/jules-reviews/`.
20. **`rollback_session`**: Safely reverts a session merge commit from local branch.

---

## 🛠️ Secondary Execution Fallback: CLI Node Scripts

If the host environment does not support native MCP tool invocation:
* **Workspace Setup**: `node dist/setup.js`
* **Session Deployment**: `node dist/deploy_session.js --type start --agents bolt --task "Optimize query caching" --mode code`
* **Team Deployment**: `node dist/deploy_session.js --type start --team github-ops --task "Set up CI/CD matrix"`
* **Session Review Deployment**: `node dist/deploy_session.js --type review --agents sentinel --task "Security audit" --mode review`
* **Session Inspection (Stage 1)**: `node dist/merge_session.js --inspect <sessionId>`
* **Session Approval & Merge (Stage 2)**: `node dist/merge_session.js --approve <sessionId>`
* **Inspect All Completed Sessions**: `node dist/merge_session.js --inspect-all`
* **Pull Unified Diff**: `node dist/merge_session.js --diff <sessionId>`
* **Auto-Process Pipeline**: `node dist/auto_process.js --all`
* **Status Check**: `node dist/jules_client.js list`
