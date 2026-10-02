# Graph Report - Jules-Companion  (2026-10-02)

## Corpus Check
- 181 files · ~154,225 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 1, .toml 1)

## Summary
- 984 nodes · 1890 edges · 93 communities (79 shown, 14 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 311 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5e80ca4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- visual_diff.ts
- Defensive Traps & Resolution Matrix
- merge_session.ts
- registry.ts
- Materialist (Specialized Agent)
- Alchemist Agent (Database Migrations & SQL Optimization agent who design database migrations, model relationships, index lookup columns, and optimize slow SQL/NoSQL queries.)
- installer.js
- github.ts
- package.json
- scripts
- Critic Agent (Senior Code Review agent who review code changes (diffs) thoroughly, critiquing readability, design anti-patterns, and logic efficiency.)
- GitHub Contributing Guidelines
- setup.ts
- jules_api.ts
- Scribe Agent Journal Initialization
- compilerOptions
- Jules Companion README
- Palette (Specialized Agent)
- build.js
- Contributing to Jules Companion 🐙
- types.ts
- contributes
- devDependencies
- auto_process.ts
- deploy_session.ts
- Jules Companion — Installation & Setup Guide
- Evals Grading Report
- Google Jules CLI Command Reference
- Google Jules REST API Quickstart Reference
- consolidator.md
- explainer.md
- Networked Agent Orchestration Motif
- Jules Companion Brand Identity
- repository
- Proteus (Specialized Agent)
- Scribe (Specialized Agent)
- Sentinel (Specialized Agent)
- Google Jules Agent Templates Manifest
- Bug Report Issue Template
- CodeQL Static Application Security Testing Workflow
- install.sh script
- uninstall.sh script
- 📓 Development Notes, Gotchas & Operational Autopsy
- JulesActivityChannel
- ref_path
- extension.ts
- gitsmith.md
- attestor.md
- Dockerist Agent (Containerization & CI/CD Pipelines agent who write optimized Dockerfiles, design modular docker-compose setups, and automate test/build execution in CI/CD pipeline files.)
- decoupler.md
- Jules Companion - Codebase Master Documentation Index
- Cartographer Agent (Codebase Structures & ASCII Layout Mapping agent who analyze codebase directory structures, map out component dependencies, and design flowcharts in Mermaid and ASCII layouts.)
- Jules Companion Agent Skill Specification
- guildmaster.md
- Jules Companion Project Changelog
- Troubleshooting Guide
- Exterminator Agent (Bug Hunting & Error Log Resolution agent who inspect crash logs, analyze compilation or runtime exceptions, investigate system failures, and patch bugs cleanly without regressions.)
- Conduit Agent (Backend API Routing & Middleware agent who build secure backend RESTful, GraphQL, or RPC API endpoints, validate input parameters, and standardize response models.)
- Innovator Agent (New Feature Implementation agent who design, implement, and integrate new functional features into the codebase following established architectural patterns.)
- hermetic.md
- planner.md
- pruner.md
- Gatekeeper Agent (Authentication & RBAC Authorization agent who configure user authentication mechanisms, secure token handling, and enforce role-based access control (RBAC) across endpoints.)
- Green Agent (Energy Efficiency & Green Computing agent who optimize code and architectures to minimize carbon footprint, reduce CPU/RAM utilization, and lower energy consumption.)
- lexicon.md
- monorepist.md
- mutator.md
- plugger.md
- vscecraft.md
- scoper.md
- slimmer.md
- specifier.md
- speedster.md
- standardizer.md
- Jules Companion - Comprehensive Application Guide & Architecture Overview
- run_tests.js
- 00 - Master Architecture & System Design
- jules.apiKey
- runGit
- install_hooks.js
- jules-deploy.md
- jules-inspect.md
- jules-merge.md
- jules-review.md
- jules-auto.md
- jules-doctor.md
- jules-status.md
- doc_coverage.test.ts
- 🛠️ Step-by-Step Developer Playbooks
- 🛠️ Contributor & AI Agent Tooling (Ponytail, Sentrux & Graphify)
- 💻 Development Environment Setup

## God Nodes (most connected - your core abstractions)
1. `activate()` - 56 edges
2. `Jules Companion - Codebase Master Documentation Index` - 40 edges
3. `Jules Companion - Codebase Architecture Map & Governance Guide` - 35 edges
4. `loadSessions()` - 30 edges
5. `00 - Master Architecture & System Design` - 24 edges
6. `getApiKey()` - 23 edges
7. `runGit()` - 23 edges
8. `saveSessions()` - 23 edges
9. `scripts` - 21 edges
10. `request()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `2.2 Validation Order Precedence (Offline Test Safety)` --references--> `deploySessionCore()`  [INFERRED]
  NOTE.md → scripts/deploy_session.ts
- `1. Adding a New VS Code Command` --references--> `activate()`  [INFERRED]
  CONTRIBUTING.md → scripts/extension.ts
- `5.1 CLI Argument Parser Multi-Mapping (`parseArgs`)` --references--> `parseArgs()`  [INFERRED]
  NOTE.md → scripts/utils.ts
- `4.2 Auto-Modification of `registry.json` during Test Runs` --references--> `createCustomAgentScaffold()`  [INFERRED]
  NOTE.md → scripts/utils.ts
- `C. Sentrux Layering Governance` --references--> `deploySessionCore()`  [INFERRED]
  docs/application-overview.md → scripts/deploy_session.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Execution Modes Multi-Layer Coordination** — readme_execution_modes, skill_execution_modes, faq_execution_modes [EXTRACTED 1.00]
- **Jules Companion Delivery and Packaging Cluster** — references_agents_netrunner_netrunner_agent, references_agents_nexus_nexus_agent, references_agents_nomad_nomad_agent, references_agents_octo_octo_agent, references_agents_packager_packager_agent, references_agents_palette_palette_agent [INFERRED 0.75]
- **Jules Companion Maintenance and Monitoring Cluster** — references_agents_partisan_partisan_agent, references_agents_proteus_proteus_agent, references_agents_revenant_revenant_agent, references_agents_scaler_scaler_agent, references_agents_scribe_scribe_agent, references_agents_sentinel_sentinel_agent, references_agents_sleuth_sleuth_agent, references_agents_smith_smith_agent, references_agents_synapse_synapse_agent, references_agents_watcher_watcher_agent [INFERRED 0.75]
- **Jules Companion Operational Agents Cluster** — references_agents_inspector_inspector_agent, references_agents_janitor_janitor_agent, references_agents_localizer_localizer_agent, references_agents_logger_logger_agent, references_agents_materialist_materialist_agent, references_agents_modernizer_modernizer_agent [INFERRED 0.75]
- **Jules Companion Architecture Documentation Suite** — docs_codebase_00_master_architecture_document, docs_codebase_01_core_subsystem_document, docs_codebase_02_api_client_subsystem_document, docs_codebase_03_session_lifecycle_document, docs_codebase_04_vscode_extension_ui_document [INFERRED 0.85]
- **Jules Activity Bar UI Identity** — media_jules_icon_svg, media_jules_icon_robot_avatar, media_jules_icon_activity_bar_spec [INFERRED 0.85]
- **Jules Companion Brand and Symbolic Architecture** — media_logo_branding, media_logo_cybernetic_octopus, media_logo_agent_orchestration_concept [INFERRED 0.85]
- **Jules Companion Visual Brand System** — media_logo_logo_image, media_logo_octopus_circuit_motif, media_logo_branding_identity [INFERRED 0.85]
- **Backend Data Management and Infrastructure Cluster** — references_agents_alchemist_alchemist_agent, references_agents_datasmith_datasmith_agent, references_agents_conduit_conduit_agent, references_agents_dockerist_dockerist_agent [INFERRED 0.85]
- **Automated Code Quality and Verification Ecosystem** — references_agents_critic_critic_agent, references_agents_grader_grader_agent, references_agents_enforcer_enforcer_agent, references_agents_gatekeeper_gatekeeper_agent [INFERRED 0.85]
- **UI Presentation and Cross-Platform Execution Framework** — references_agents_builder_builder_agent, references_agents_chameleon_chameleon_agent, references_agents_adapter_adapter_agent [INFERRED 0.85]
- **Google Jules API & CLI Protocol Documentation** — references_jules_api_document, references_jules_cli_document, references_prompt_templates_document [INFERRED 0.85]

## Communities (93 total, 14 thin omitted)

### Community 0 - "visual_diff.ts"
Cohesion: 0.09
Nodes (19): Custom Agent Wizard (ui/custom_agent_wizard.ts) (04-vscode-extension-ui), 04 - VS Code Extension & UI Layer Reference, Extension Controller (extension.ts) (04-vscode-extension-ui), Live Sync Manager Subsystem (ui/live_sync.ts) (04-vscode-extension-ui), Tree Data Providers Subsystem (04-vscode-extension-ui), Visual Diff Viewer (ui/visual_diff.ts) (04-vscode-extension-ui), ref_vscode, AgentEntry (+11 more)

### Community 1 - "Defensive Traps & Resolution Matrix"
Cohesion: 0.14
Nodes (13): 10. `OFFLINE_TEST_RESILIENCE`, 11. `STORAGE_ATOMICITY`, 1. `POWERSHELL_OPERATOR_TRAP`, 2. `POWERSHELL_SUBEXPRESSION_TRAP`, 3. `POWERSHELL_PATH_WITH_SPACES`, 4. `POWERSHELL_CD_PROHIBITION`, 5. `GIT_INDEX_LOCK_TRAP`, 6. `INLINE_DOC_DENSITY_STANDARD` (+5 more)

### Community 2 - "merge_session.ts"
Cohesion: 0.20
Nodes (13): approveMerge(), checkoutSessionBranch(), generateDiffSummary(), generateMarkdownReport(), inspectSession(), mergeSession(), mergeSessionCore(), MergeSessionOptions (+5 more)

### Community 3 - "registry.ts"
Cohesion: 0.13
Nodes (17): Catalog of the 20 Native MCP Tools (06-mcp-server-subsystem), 06 - Model Context Protocol (MCP) Server Subsystem, Dynamic Tool Registry (mcp/registry.ts) (06-mcp-server-subsystem), MCP Client Configuration Example (06-mcp-server-subsystem), MCP Server Architecture (06-mcp-server-subsystem), ref_os, McpToolDefinition, allTools (+9 more)

### Community 4 - "Materialist (Specialized Agent)"
Cohesion: 0.05
Nodes (48): Inspector Architectural Philosophy, Inspector Daily Execution Protocol, Inspector (Specialized Agent), Janitor Architectural Philosophy, Janitor Daily Execution Protocol, Janitor (Specialized Agent), Localizer Architectural Philosophy, Localizer Daily Execution Protocol (+40 more)

### Community 5 - "Alchemist Agent (Database Migrations & SQL Optimization agent who design database migrations, model relationships, index lookup columns, and optimize slow SQL/NoSQL queries.)"
Cohesion: 0.31
Nodes (9): Adapter Agent (Cross-Platform Compatibility (Windows/Linux/macOS) agent who ensure the application executes cleanly across Windows, Linux, and macOS without path resolution or shell script failures.), Adapter Architectural Philosophy, Adapter Daily Execution Protocol, Alchemist Agent (Database Migrations & SQL Optimization agent who design database migrations, model relationships, index lookup columns, and optimize slow SQL/NoSQL queries.), Alchemist Architectural Philosophy, Alchemist Daily Execution Protocol, Bridge Agent (Third-Party API Integration agent who build secure integrations with third-party API providers and write mock mock-servers/stubs for unit testing.), Bridge Architectural Philosophy (+1 more)

### Community 6 - "installer.js"
Cohesion: 0.07
Nodes (33): ref_readline, configureApiKey(), copySkillBundle(), { execSync }, findInstalledEditors(), fs, homeDir, installMcpServers() (+25 more)

### Community 7 - "github.ts"
Cohesion: 0.21
Nodes (10): GitExecutionResult, createGitHubPullRequest(), getGhCliToken(), getGitHubPullRequestForBranch(), getGitHubUserInfo(), GitHubPRCreateOptions, GitHubPRResult, GitHubUserInfo (+2 more)

### Community 8 - "package.json"
Cohesion: 0.09
Nodes (22): activationEvents, author, categories, dependencies, @modelcontextprotocol/sdk, description, displayName, engines (+14 more)

### Community 9 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, client, commit, deploy, graphify:update, installer, mcp (+13 more)

### Community 10 - "Critic Agent (Senior Code Review agent who review code changes (diffs) thoroughly, critiquing readability, design anti-patterns, and logic efficiency.)"
Cohesion: 0.22
Nodes (13): Archivist Agent (Changelog, Release Notes & Deprecation Guide agent who authors structured changelogs, manages release documentation, tracks deprecated APIs, and drafts migration guides across versions.), Archivist Architectural Philosophy, Benchmarker Agent (Stress-Testing & Latency Audits agent who write stress testing scripts, simulate concurrent traffic, profile memory utilization, and analyze latencies under load.), Benchmarker Architectural Philosophy, Benchmarker Daily Execution Protocol, Critic Architectural Philosophy, Critic Agent (Senior Code Review agent who review code changes (diffs) thoroughly, critiquing readability, design anti-patterns, and logic efficiency.), Critic Daily Execution Protocol (+5 more)

### Community 11 - "GitHub Contributing Guidelines"
Cohesion: 0.17
Nodes (13): GitHub Contributing Development Setup, GitHub Contributing Guidelines, GitHub Contributing Pull Request Process, Dependabot Dependency Automation Configuration, Conventional Commits Specification, Pull Request Template, Node.js Matrix Verification (18.x, 20.x, 22.x), Continuous Integration Workflow (+5 more)

### Community 12 - "setup.ts"
Cohesion: 0.10
Nodes (25): Agent Template Specification (references/agents/.md) (07-agents-and-customization), Behavioral Guardrails (07-agents-and-customization), Catalog of the 30 Specialist Agents (07-agents-and-customization), Core Principles & Directives (07-agents-and-customization), 07 - Agent System & Customization Reference, Specialist Agent Architecture (07-agents-and-customization), Central Utilities Hub (utils.ts) (08-utilities-and-cli), CLI Tooling Scripts (08-utilities-and-cli) (+17 more)

### Community 13 - "jules_api.ts"
Cohesion: 0.32
Nodes (15): Inviolable Invariants:, directoryApiKeyCache, getApiKey(), request(), resetApiKeyCache(), approvePlanApi(), cancelSessionApi(), getActivitiesApi() (+7 more)

### Community 15 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, skipLibCheck, strict (+2 more)

### Community 16 - "Jules Companion README"
Cohesion: 0.21
Nodes (10): Release VSIX Extension Workflow, Jules Companion README, Four Execution Modes (Direct, Plan-Review, Supervised, Autonomous), Dokumentasi Jules Companion (Bahasa Indonesia), Fitur Utama Jules Companion (ID), Integrasi Server MCP Jules Companion (ID), MCP Server Setup & JSON Configuration, Mission Control Webview User Interface (+2 more)

### Community 17 - "Palette (Specialized Agent)"
Cohesion: 0.22
Nodes (9): Nomad Architectural Philosophy, Nomad Daily Execution Protocol, Nomad (Specialized Agent), Palette Architectural Philosophy, Palette Daily Execution Protocol, Palette (Specialized Agent), Synapse Architectural Philosophy, Synapse Daily Execution Protocol (+1 more)

### Community 18 - "build.js"
Cohesion: 0.25
Nodes (7): esbuild, entryPoints, esbuild, fs, getTsFiles(), path, scriptsDir

### Community 19 - "Contributing to Jules Companion 🐙"
Cohesion: 0.15
Nodes (13): 1. Branch Naming, 2. Commit Message Convention, 🏛️ Architecture Invariants & Governance, 📝 Coding Standards & Style Guide, Contributing to Jules Companion 🐙, ⚡ Core Development Philosophy, 🔀 Git Workflow & Commit Standards, 📦 Packaging & Local Installation (+5 more)

### Community 20 - "types.ts"
Cohesion: 0.14
Nodes (16): 01 - Core Subsystem Reference, Domain Types & Contracts (types.ts) (01-core-subsystem), Git CLI Subsystem (git.ts) (01-core-subsystem), Storage Subsystem (storage.ts) (01-core-subsystem), Task Scheduler Engine (scheduler.ts) (01-core-subsystem), 🛡️ Panduan Keberlanjutan Kode, Quality Assurance & Roadmap Jules-Companion, Peta Jalan Pengembangan Berkelanjutan (Development Roadmap) (development-and-contribution-guide), Piramida Pengujian & Standar Quality Assurance (53 Tests) (development-and-contribution-guide) (+8 more)

### Community 21 - "contributes"
Cohesion: 0.17
Nodes (12): Activity Bar Icon Design Specification, Jules Robot Avatar Concept, Jules Activity Bar SVG Icon, contributes, commands, menus, views, viewsContainers (+4 more)

### Community 22 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, esbuild, tsx, @types/node, @types/vscode, typescript, @vscode/vsce

### Community 23 - "auto_process.ts"
Cohesion: 0.18
Nodes (12): Autonomous Process Loop (auto_process.ts) (03-session-lifecycle), Deploy Session Engine (deploy_session.ts) (03-session-lifecycle), 03 - Session Lifecycle & Execution Modes Reference, Merge Engine & Safety Gate (merge_session.ts) (03-session-lifecycle), The Four Google Jules Execution Modes (03-session-lifecycle), autoProcess(), autoProcessCore(), AutoProcessOptions (+4 more)

### Community 24 - "deploy_session.ts"
Cohesion: 0.26
Nodes (12): deploySession(), deploySessionCore(), DeploySessionOptions, DeploySessionResult, getCurrentBranch(), getDefaultRemoteBranch(), getGitRemoteRepo(), isBranchOnRemote() (+4 more)

### Community 25 - "Jules Companion — Installation & Setup Guide"
Cohesion: 0.10
Nodes (21): 1. Quick 1-Click Installation, 1. Run Doctor Check, 2. Run Test Suite, 2. What Gets Installed Automatically, 3. Check IDE Status Bar, 3. Editor Extension Details (Antigravity IDE & VS Code), 4. Antigravity AI Skills Discovery, 5. Model Context Protocol (MCP) Setup (+13 more)

### Community 26 - "Evals Grading Report"
Cohesion: 0.33
Nodes (6): Evals Grading Report, Test Case: TC_001_OS_SETUP_SELF_COPY (grader), Test Case: TC_002_SELF_HEALING_INTEGRITY (grader), Test Case: TC_003_UNIFIED_SYNC_MERGE (grader), Test Case: TC_004_DOCTOR_CHECK (grader), Test Case: TC_005_PARTISAN_DECENTRAL (grader)

### Community 27 - "Google Jules CLI Command Reference"
Cohesion: 0.33
Nodes (6): Authentication (jules-cli), Command Reference (jules-cli), Google Jules CLI Command Reference, Installation (jules-cli), Interactive Dashboard (TUI) (jules-cli), Version Check (jules-cli)

### Community 28 - "Google Jules REST API Quickstart Reference"
Cohesion: 0.40
Nodes (5): Authentication (jules-api), Base URL (jules-api), Core Resources & Endpoints (jules-api), Google Jules REST API Quickstart Reference, Session Lifecycle States (jules-api)

### Community 29 - "consolidator.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 30 - "explainer.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 31 - "Networked Agent Orchestration Motif"
Cohesion: 1.00
Nodes (3): Networked Agent Orchestration Motif, Jules Companion Visual Identity, Cybernetic Octopus Mascot

### Community 32 - "Jules Companion Brand Identity"
Cohesion: 1.00
Nodes (3): Jules Companion Brand Identity, Jules Companion Logo Image, Octopus Circuit Network Motif

### Community 33 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 34 - "Proteus (Specialized Agent)"
Cohesion: 0.67
Nodes (3): Proteus Architectural Philosophy, Proteus Daily Execution Protocol, Proteus (Specialized Agent)

### Community 35 - "Scribe (Specialized Agent)"
Cohesion: 0.67
Nodes (3): Scribe Architectural Philosophy, Scribe Daily Execution Protocol, Scribe (Specialized Agent)

### Community 36 - "Sentinel (Specialized Agent)"
Cohesion: 0.67
Nodes (3): Sentinel Architectural Philosophy, Sentinel Daily Execution Protocol, Sentinel (Specialized Agent)

### Community 37 - "Google Jules Agent Templates Manifest"
Cohesion: 0.67
Nodes (3): 💻 CODING GROUP (Write & Modify Code - 26 Agents) (prompt-templates), Google Jules Agent Templates Manifest, 📝 DOCUMENTING & ADVISORY GROUP (Only Write Markdown & Review - 18 Agents) (prompt-templates)

### Community 44 - "📓 Development Notes, Gotchas & Operational Autopsy"
Cohesion: 0.10
Nodes (19): 1.1 Path Separators & Line Endings, 1.2 Cross-Platform Globbing & Shell Expansion, 🪟 1. Platform & Cross-Environment Traps, 2.1 REST API Request Body (`prompt` vs `message`), 2.2 Validation Order Precedence (Offline Test Safety), 2.3 Unhandled Promise Rejections in MCP Tools, 🌐 2. Google Jules Cloud API Gotchas, 3.2 Secret Storage vs Environment Variables (+11 more)

### Community 45 - "JulesActivityChannel"
Cohesion: 0.08
Nodes (13): Agent, Core Concepts, Domain Glossary, Launch Mode, Operational Mode, Safety Gate, Scheduled Task, Session (+5 more)

### Community 46 - "ref_path"
Cohesion: 0.12
Nodes (18): ref_child_process, ref_fs, ref_node_assert, ref_node_test, ref_path, scripts_utils_getprojectdirs, scripts_utils_rungit, TEST_DIR (+10 more)

### Community 47 - "extension.ts"
Cohesion: 0.08
Nodes (61): 02-10-2026 - [Term Collision: Launch Mode vs Operational Mode], 3.1 Atomic JSON File Persistence, deleteSessionApi(), checkPatchConflict(), PatchCheckResult, addScheduledTask(), cancelScheduledTask(), deleteScheduledTask() (+53 more)

### Community 48 - "gitsmith.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 49 - "attestor.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 50 - "Dockerist Agent (Containerization & CI/CD Pipelines agent who write optimized Dockerfiles, design modular docker-compose setups, and automate test/build execution in CI/CD pipeline files.)"
Cohesion: 0.33
Nodes (9): Builder Agent (Frontend Component Scaffolding agent who build clean, modular, reusable, and responsive frontend UI components following established visual structures.), Builder Architectural Philosophy, Builder Daily Execution Protocol, Chameleon Agent (Language & Stack Porting agent who translate, restyle, and port modules or code blocks between programming languages or frameworks idiomatic to the target environment.), Chameleon Architectural Philosophy, Chameleon Daily Execution Protocol, Dockerist Architectural Philosophy, Dockerist Daily Execution Protocol (+1 more)

### Community 51 - "decoupler.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 52 - "Jules Companion - Codebase Master Documentation Index"
Cohesion: 0.09
Nodes (25): 02 - API Client Subsystem Reference, Google Jules REST API Mapping (jules_api.ts) (02-api-client-subsystem), Jules CLI Subprocess Wrapper (jules_client.ts) (02-api-client-subsystem), Native HTTP Client Architecture (http.ts) (02-api-client-subsystem), Differentiated Dynamic Banners (05-mission-control-webview), 05 - Mission Control Webview Subsystem Reference, Overview & Purpose (05-mission-control-webview), Security & Content Security Policy (CSP) (05-mission-control-webview) (+17 more)

### Community 53 - "Cartographer Agent (Codebase Structures & ASCII Layout Mapping agent who analyze codebase directory structures, map out component dependencies, and design flowcharts in Mermaid and ASCII layouts.)"
Cohesion: 0.32
Nodes (8): Annotator Agent (Inline Documentation & Code Clarity agent who analyzes complex logic and adds precise line-by-line comments and block documentation to ensure long-term codebase sustainability.), Annotator Architectural Philosophy, Annotator Daily Execution Protocol, Cartographer Agent (Codebase Structures & ASCII Layout Mapping agent who analyze codebase directory structures, map out component dependencies, and design flowcharts in Mermaid and ASCII layouts.), Cartographer Architectural Philosophy, Cartographer Daily Execution Protocol, Curator Architectural Philosophy, Curator Agent (Internal Knowledge Base & Tribal Knowledge Curator agent who captures domain knowledge, architectural rationale, developer onboarding notes, and gotchas into a searchable repository knowledge base.)

### Community 54 - "Jules Companion Agent Skill Specification"
Cohesion: 0.40
Nodes (6): Feature Request & Agent Proposal Template, Release 1.2.0 - Team Engine & Preset Workflows, 44 Specialist Agents Roster (Coding & Advisory), Jules Companion Agent Skill Specification, Agent Prompt Construction & Task Specification, Multi-Agent Team Presets (deploy_team)

### Community 55 - "guildmaster.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 56 - "Jules Companion Project Changelog"
Cohesion: 0.25
Nodes (8): Project Security Policy, Supported Security Versions Specification, Changelog Header Formatting Convention, Jules Companion Project Changelog, Release 1.0.0 - Initial Jules Companion Release, Release 1.1.0 - 20 Native MCP Tools & Webview, Native MCP Tool Suite (20 Tools), MCP Server Connection & Path Resolution Troubleshooting

### Community 57 - "Troubleshooting Guide"
Cohesion: 0.29
Nodes (8): Frequently Asked Questions, FAQ: 4 Execution Modes Explained, FAQ: Standalone MCP Server Integration, FAQ: Git Safety Gate Mechanics, API Authentication & 401 Unauthorized Troubleshooting, Troubleshooting Guide, Git Safety Gate Merge Rejection Troubleshooting, Mission Control Webview Unresponsiveness Troubleshooting

### Community 58 - "Exterminator Agent (Bug Hunting & Error Log Resolution agent who inspect crash logs, analyze compilation or runtime exceptions, investigate system failures, and patch bugs cleanly without regressions.)"
Cohesion: 0.47
Nodes (6): Bolt Agent (Performance, Memoization & Caching agent who identify and implement one performance improvement to make the application measurably faster, memory-efficient, or optimized.), Bolt Architectural Philosophy, Bolt Daily Execution Protocol, Exterminator Architectural Philosophy, Exterminator Daily Execution Protocol, Exterminator Agent (Bug Hunting & Error Log Resolution agent who inspect crash logs, analyze compilation or runtime exceptions, investigate system failures, and patch bugs cleanly without regressions.)

### Community 59 - "Conduit Agent (Backend API Routing & Middleware agent who build secure backend RESTful, GraphQL, or RPC API endpoints, validate input parameters, and standardize response models.)"
Cohesion: 0.47
Nodes (6): Conduit Agent (Backend API Routing & Middleware agent who build secure backend RESTful, GraphQL, or RPC API endpoints, validate input parameters, and standardize response models.), Conduit Architectural Philosophy, Conduit Daily Execution Protocol, Datasmith Architectural Philosophy, Datasmith Daily Execution Protocol, Datasmith Agent (SQLite Database specialist agent who designs robust database schemas, optimizes complex queries, implements efficient indexing strategies, and ensures local data integrity.)

### Community 60 - "Innovator Agent (New Feature Implementation agent who design, implement, and integrate new functional features into the codebase following established architectural patterns.)"
Cohesion: 0.47
Nodes (6): Consultant Agent (Framework Recommendations & ADRs agent who evaluate project feature needs and author Architectural Decision Records (ADRs) suggesting framework or library choices.), Consultant Architectural Philosophy, Consultant Daily Execution Protocol, Innovator Architectural Philosophy, Innovator Daily Execution Protocol, Innovator Agent (New Feature Implementation agent who design, implement, and integrate new functional features into the codebase following established architectural patterns.)

### Community 61 - "hermetic.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 62 - "planner.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 63 - "pruner.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 64 - "Gatekeeper Agent (Authentication & RBAC Authorization agent who configure user authentication mechanisms, secure token handling, and enforce role-based access control (RBAC) across endpoints.)"
Cohesion: 1.00
Nodes (3): Gatekeeper Architectural Philosophy, Gatekeeper Daily Execution Protocol, Gatekeeper Agent (Authentication & RBAC Authorization agent who configure user authentication mechanisms, secure token handling, and enforce role-based access control (RBAC) across endpoints.)

### Community 65 - "Green Agent (Energy Efficiency & Green Computing agent who optimize code and architectures to minimize carbon footprint, reduce CPU/RAM utilization, and lower energy consumption.)"
Cohesion: 1.00
Nodes (3): Green Architectural Philosophy, Green Daily Execution Protocol, Green Agent (Energy Efficiency & Green Computing agent who optimize code and architectures to minimize carbon footprint, reduce CPU/RAM utilization, and lower energy consumption.)

### Community 66 - "lexicon.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 67 - "monorepist.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 68 - "mutator.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 69 - "plugger.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 70 - "vscecraft.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 71 - "scoper.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 72 - "slimmer.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 73 - "specifier.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 74 - "speedster.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 75 - "standardizer.md"
Cohesion: 0.40
Nodes (4): Boundaries, Core Directives & Chain of Thought, Error Handling & Ambiguity Resolution, Output Formatting & Communication Style

### Community 76 - "Jules Companion - Comprehensive Application Guide & Architecture Overview"
Cohesion: 0.05
Nodes (39): 10. Troubleshooting & Diagnostics, 11. Related Technical Documentation, 1. Four Interaction Modalities, 2. Universal 1-Click Multi-Agent & IDE Installer, 3. Complete 20 Model Context Protocol (MCP) Tools Catalog, 4. Specialist Agent Roster (63 Agents Across 11 Functional Clusters), 5. Cloud Session Lifecycle Finite State Machine (FSM), 6. Two-Stage Git Safety Gate & Merge Engine (+31 more)

### Community 77 - "run_tests.js"
Cohesion: 0.25
Nodes (6): fs, path, result, { spawnSync }, testDir, testFiles

### Community 78 - "00 - Master Architecture & System Design"
Cohesion: 0.33
Nodes (6): Data Flow & Subsystem Interactions (00-master-architecture), 00 - Master Architecture & System Design, High-Level Layered Architecture (00-master-architecture), Overview & Architectural Goals (00-master-architecture), Security & Isolation Policies (00-master-architecture), State Machine & Status Reconciliation (00-master-architecture)

### Community 79 - "jules.apiKey"
Cohesion: 0.29
Nodes (7): properties, title, configuration, default, description, type, jules.apiKey

### Community 80 - "runGit"
Cohesion: 0.17
Nodes (10): getCurrentBranch(), patchCheckCache, runGit(), getWorkspaceContextInfo(), GitOriginInfo, parseGitOrigin(), WorkspaceContextInfo, WorkspaceItemCategory (+2 more)

### Community 81 - "install_hooks.js"
Cohesion: 0.33
Nodes (5): { execSync }, fs, hookDir, hookFile, path

### Community 89 - "doc_coverage.test.ts"
Cohesion: 0.40
Nodes (4): AGENTS_DIR, getAllScriptFiles(), getTsFilesRecursive(), SCRIPTS_DIR

### Community 90 - "🛠️ Step-by-Step Developer Playbooks"
Cohesion: 0.50
Nodes (4): 1. Adding a New VS Code Command, 2. Implementing a New MCP Tool, 3. Authoring a New Specialist Agent, 🛠️ Step-by-Step Developer Playbooks

### Community 91 - "🛠️ Contributor & AI Agent Tooling (Ponytail, Sentrux & Graphify)"
Cohesion: 0.50
Nodes (4): 1. Ponytail — The Pragmatic Senior Developer Engine, 2. Sentrux — AI Architectural Linter & Quality Sensor, 3. Graphify — Codebase Knowledge Graph & Architecture Navigation, 🛠️ Contributor & AI Agent Tooling (Ponytail, Sentrux & Graphify)

### Community 92 - "💻 Development Environment Setup"
Cohesion: 0.50
Nodes (4): 1. Prerequisites, 2. Initial Setup, 3. Running & Debugging in VS Code, 💻 Development Environment Setup

## Knowledge Gaps
- **432 isolated node(s):** `install.sh script`, `name`, `version`, `description`, `displayName` (+427 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 509 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Jules Companion - Codebase Master Documentation Index` connect `Jules Companion - Codebase Master Documentation Index` to `visual_diff.ts`, `merge_session.ts`, `registry.ts`, `setup.ts`, `jules_api.ts`, `00 - Master Architecture & System Design`, `extension.ts`, `runGit`, `ref_path`, `Jules Companion README`, `types.ts`, `auto_process.ts`, `Jules Companion Project Changelog`, `deploy_session.ts`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `@modelcontextprotocol/sdk` connect `package.json` to `registry.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Jules Companion - Codebase Architecture Map & Governance Guide` connect `Jules Companion - Codebase Master Documentation Index` to `visual_diff.ts`, `merge_session.ts`, `registry.ts`, `Jules Companion - Comprehensive Application Guide & Architecture Overview`, `setup.ts`, `00 - Master Architecture & System Design`, `jules_api.ts`, `runGit`, `extension.ts`, `types.ts`, `auto_process.ts`, `deploy_session.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `activate()` (e.g. with `1. Adding a New VS Code Command` and `getWorkspaceRoot()`) actually correct?**
  _`activate()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `Jules Companion - Codebase Master Documentation Index` (e.g. with `📚 Complete Module Documentation Directory (README)` and `auto_process.ts`) actually correct?**
  _`Jules Companion - Codebase Master Documentation Index` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `Jules Companion - Codebase Architecture Map & Governance Guide` (e.g. with `Architectural Governance (.sentrux/rules.toml) (codebase-architecture-map)` and `Architectural Layering Hierarchy (codebase-architecture-map)`) actually correct?**
  _`Jules Companion - Codebase Architecture Map & Governance Guide` has 23 INFERRED edges - model-reasoned connections that need verification._
- **What connects `install.sh script`, `name`, `version` to the rest of the system?**
  _432 weakly-connected nodes found - possible documentation gaps or missing edges._