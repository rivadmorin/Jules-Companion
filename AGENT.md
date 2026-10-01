# AGENT.md - Autonomous AI Coding Agent Operating Specification (Algorithmic Protocol)

> **Audience**: Autonomous AI Coding Agents (`agy`, Jules, Claude Code, Copilot CLI, Codex, Hermes, Cursor, Windsurf)  
> **Target Repository**: [Jules Companion](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion)  
> **Environment Spec**: Windows 10/11, PowerShell (`pwsh`), Google Antigravity IDE (VS Code Engine), Node.js 20+, TypeScript 5.9, Model Context Protocol (MCP)  
> **Knowledge Vault**: Obsidian LLM Wiki (`E:\Markdown Artificial Intelligence\LLM Wiki`)  
> **Specification Paradigm**: Structured Pseudocode, Algorithmic State Guards, and Type-Safe Invariant Contracts.

---

```typescript
// ============================================================================
// SYSTEM MANIFEST & GLOBAL ENVIRONMENT CONFIGURATION
// ============================================================================
const SYSTEM_SPEC = {
  platform: "Jules Companion",
  role: "Enterprise Developer Orchestration Platform (IDEs + MCP <-> Google Jules Cloud)",
  environment: {
    os: "Windows 10/11 (PowerShell pwsh)",
    runtime: "Node.js >= 20.x, TypeScript 5.9",
    hostIde: "Google Antigravity IDE (VS Code Engine)",
    mcpGlobalPath: "~/.gemini/antigravity-ide/mcp/jules-companion/",
    wikiVaultPath: "E:\\Markdown Artificial Intelligence\\LLM Wiki"
  },
  metricsBaseline: {
    specialistAgentsCount: 53, // 30 Coding & Architecture + 23 Advisory & Review
    mcpToolsCount: 20,
    testCoverage: { tests: 124, suites: 39, maxFailures: 0 },
    entrypointsCount: 30,
    graphifyGraph: { nodes: 820, edges: 1696, communities: 73 }
  }
} as const;

// ============================================================================
// COMMUNICATION & MULTILINGUAL CONVERSATION PROTOCOL
// ============================================================================
const COMMUNICATION_PROTOCOL = {
  conversationalLayer: {
    rule: "Always dynamically mirror the language used by the user in their prompt.",
    behavior: (userPrompt: string) => {
      // E.g., If user prompts in Indonesian (id), respond fluently in Indonesian.
      // If user prompts in English (en), respond in English.
      return detectLanguage(userPrompt);
    }
  },
  repositoryArtifactLayer: {
    rule: "All codebase artifacts must remain strictly in professional English.",
    artifacts: [
      "Source code and variable/function/class naming",
      "TSDoc / JSDoc comment blocks",
      "Git commit messages and PR descriptions",
      "CHANGELOG.md, README.md, and documentation files"
    ]
  }
} as const;

// ============================================================================
// TOOLING SUITE & FAST COMMAND REFERENCE
// ============================================================================
const TOOLING_SUITE = {
  ponytail: { role: "Anti-overengineering & YAGNI enforcement", invocation: "Active by default (full)" },
  sequentialThinking: { role: "Cognitive reasoning & architectural analysis", invocation: "mcp: sequentialthinking" },
  contextMode: { role: "Token-optimized in-memory file & data analysis", invocation: "mcp: ctx_execute_file, ctx_execute" },
  rtk: { role: "CLI output token compression (git, npm, tsc)", invocation: "shell prefix: rtk <cmd>" },
  sentrux: { role: "Architectural layering linter (zero cycles)", invocation: "rtk sentrux check ." },
  graphify: { role: "Codebase AST knowledge graph & visualizer", invocation: "rtk graphify update . | rtk graphify query" },
  obsidianWiki: { role: "Persistent cross-session knowledge distillation", vault: "E:\\Markdown Artificial Intelligence\\LLM Wiki" }
} as const;
```

---

## ⚡ 1. The 14 Golden Invariants (Executable Logic & State Guards)

```typescript
// ============================================================================
// INVARIANT 1: PONYTAIL MODE (ANTI-OVERENGINEERING PROTOCOL)
// Source: DietrichGebert/ponytail | Default Intensity: FULL
// ============================================================================
function applyPonytailLadder<T>(task: Task, candidate: T): Diff {
  // Step 1: Evaluate YAGNI
  if (isSpeculativeAbstraction(candidate) || isSingleUseInterfaceOrFactory(candidate)) {
    throw new SkipFeatureException("YAGNI: Do not add speculative interfaces, factories, or static configs.");
  }

  // Step 2: Traverse Ponytail Ladder reflexively
  const rungs = [
    () => reuseExistingHelperOrUtil(candidate),
    () => implementWithNodeStdlib(candidate, ["node:fs", "node:path", "node:crypto", "node:child_process", "node:test", "node:assert"]),
    () => useNativePlatformFeature(candidate, "Browser/OS native API"),
    () => useAlreadyInstalledDependency(candidate),
    () => makeItOneLine(candidate),
    () => implementShortestWorkingCode(candidate)
  ];

  const resolution = rungs.find(rung => rung().isViable())!();

  // Step 3: Enforce Shortest Working Diff & Root Cause Bottleneck Fix
  assert(resolution.isShortestWorkingDiff(), "Touch only target lines. Zero unsolicited cleanups or reformatting.");
  assert(resolution.fixesRootCauseAtSharedBottleneck(), "Fix root cause at shared bottleneck; no caller workarounds.");

  return resolution.generateDiff();
}

// ============================================================================
// INVARIANT 2: KARPATHY BEHAVIORAL CODING PRINCIPLES
// ============================================================================
function enforceKarpathyProtocol(task: Task, diff: Diff): void {
  // 1. Think Before Coding
  assert(task.assumptionsStated() && task.ambiguitiesSurfaced(), "Surface all hidden assumptions and trade-offs explicitly.");
  // 2. Simplicity First
  assert(diff.lineCount <= diff.optimalMinimalLines, "Reject unnecessary complexity; rewrite 200 lines to 50 if possible.");
  // 3. Surgical Changes
  assert(diff.hasZeroCollateralModifications(), "Every changed line must trace directly to user request.");
  // 4. Goal-Driven Execution
  assert(task.hasVerifiableSuccessCriteria(), "Define [Step] -> verify: [check] loop before touching code.");
}

// ============================================================================
// INVARIANT 3: COGNITIVE REASONING PROTOCOL (SEQUENTIAL THINKING)
// Tool: mcp_sequential-thinking_sequentialthinking
// ============================================================================
async function executeSequentialThinkingProtocol(problem: ComplexProblem): Promise<VerifiedExecutionPlan> {
  let step = 1;
  let totalEstimated = 5;
  let nextThoughtNeeded = true;
  let currentThought = "";

  while (nextThoughtNeeded) {
    const analysis = await callMcp("sequentialthinking", {
      thought: analyzeDeeply(problem, step),
      thoughtNumber: step,
      totalThoughts: totalEstimated,
      nextThoughtNeeded: nextThoughtNeeded,
      isRevision: checkContradiction(step),
      revisesThought: checkContradiction(step) ? getContradictedStep(step) : undefined,
      branchFromThought: hasAlternativeArchitectures(step) ? step : undefined,
      branchId: hasAlternativeArchitectures(step) ? "eval-tradeoffs" : undefined
    });

    if (analysis.isFullyResolved && !analysis.hasAmbiguity) {
      nextThoughtNeeded = false;
    } else {
      step++;
      if (step >= totalEstimated) totalEstimated += 2;
    }
  }

  return assembleVerifiedPlan();
}

// ============================================================================
// INVARIANT 4: TOKEN OPTIMIZATION VIA CONTEXT-MODE & RTK
// ============================================================================
class TokenOptimizationPolicy {
  // Mandatory: Think in Code (Never dump raw file contents)
  static async analyzeFile(filePath: string, analysisScript: string): Promise<SummaryResult> {
    assert(!analysisScript.includes("print(FILE_CONTENT)") && !analysisScript.includes("console.log(FILE_CONTENT)"), 
      "Context-Mode Violation: Dumping entire file content is strictly forbidden.");
    
    return await callMcp("context-mode", "ctx_execute_file", {
      path: filePath,
      language: "javascript",
      code: analysisScript // Process in-memory; log only derived metrics, line counts, or exact summaries
    });
  }

  // Shell Command Token Compression
  static formatCommand(cmd: string): string {
    const rtkSupportedPrefixes = ["git", "npm", "cargo", "pytest", "gh", "tsc", "pnpm"];
    const needsPrefix = rtkSupportedPrefixes.some(prefix => cmd.trim().startsWith(prefix));
    return needsPrefix ? `rtk ${cmd}` : cmd;
  }
}

// ============================================================================
// INVARIANT 5: 100% TSDoc / JSDoc & INLINE CODE DOCUMENTATION AUDIT
// Enforced by: tests/doc_coverage.test.ts (6 Automated Audits)
// ============================================================================
function validateCodeDocumentation(file: SourceFile): void {
  // Top-level module tag
  assert(file.header.includes("@module"), "Missing @module tag at the top of file.");

  // All exported symbols
  for (const symbol of file.exportedSymbols) {
    assert(symbol.hasDocBlock(), `Symbol ${symbol.name} lacks TSDoc docblock.`);
    assert(symbol.hasDescription(), `Symbol ${symbol.name} lacks clear description.`);
    for (const param of symbol.parameters) {
      assert(symbol.hasParamTag(param.name), `Missing @param ${param.name} tag.`);
    }
    if (symbol.returnsValue) {
      assert(symbol.hasReturnsTag(), `Missing @returns tag on ${symbol.name}.`);
    }
  }

  // Inline comment density requirements
  const density = file.inlineCommentLines / file.totalLines;
  if (file.path.startsWith("scripts/ui/") || file.path.startsWith("scripts/core/") || file.path.startsWith("scripts/utils.ts")) {
    assert(density >= 0.10, `Inline comment density (${(density*100).toFixed(1)}%) must be >= 10% for libraries/utils.`);
  } else if (file.path === "scripts/extension.ts") {
    assert(density >= 0.04, `Inline comment density must be >= 4% for monolithic extension.ts.`);
  }

  // Step-by-step logic phase comments
  if (file.isScriptRunnerOrMcpHandler()) {
    assert(file.hasCommentsPattern(/\/\/\s*Step\s*\d+:/), "Build/test scripts and MCP handlers must use '// Step N: ...' comments.");
  }
}

// ============================================================================
// INVARIANT 6: STRICT DOWNWARD LAYERING & ZERO CIRCULAR DEPENDENCIES
// Sensor: Sentrux (sentrux/sentrux) | Config: .sentrux/rules.toml (max_cycles = 0)
// ============================================================================
enum ArchitecturalTier {
  Tier0_Tests = 0,        // tests/
  Tier1_Interfaces = 1,   // scripts/extension.ts, scripts/mcp_server.ts
  Tier2_ToolsAndUI = 2,   // scripts/ui/*, scripts/mcp/*
  Tier3_CoreEngines = 3,  // scripts/deploy_session.ts, scripts/merge_session.ts, scripts/jules_client.ts
  Tier4_Client = 4,       // scripts/client/* (http.ts, jules_api.ts)
  Tier5_Foundation = 5    // scripts/core/* (types.ts, storage.ts, git.ts, scheduler.ts, utils.ts)
}

function enforceLayeringRule(importer: SourceFile, imported: SourceFile): void {
  const importerTier = getTier(importer);
  const importedTier = getTier(imported);

  // Downward layering: higher tier number = lower foundation level
  assert(importedTier >= importerTier, 
    `Layering Violation: Tier ${importerTier} (${importer.path}) cannot import from Tier ${importedTier} (${imported.path}).`);
  
  if (importerTier >= ArchitecturalTier.Tier4_Client) {
    assert(importedTier !== ArchitecturalTier.Tier2_ToolsAndUI, 
      "Foundation/Client modules must NEVER import from UI or MCP tools.");
  }
}

// ============================================================================
// INVARIANT 7: STATUS DISAMBIGUATION (PLAN APPROVAL vs USER INPUT)
// ============================================================================
type SessionStatus = "AWAITING_PLAN_APPROVAL" | "AWAITING_USER_INPUT" | "AWAITING_USER_FEEDBACK" | "SUCCEEDED" | "RUNNING";

function renderSessionStatus(session: JulesSession): StatusUIConfiguration {
  switch (session.status) {
    case "AWAITING_PLAN_APPROVAL":
      return {
        statusBar: { color: "green", text: "$(bell-dot) Jules: Plan Approval Needed" },
        treeViewAction: { icon: "$(pass)", label: "Approve Plan" },
        actionCenterItem: { icon: "$(pass)", title: "Approve Proposed Execution Plan" },
        actionApi: () => julesApi.approvePlan(session.id)
      };

    case "AWAITING_USER_INPUT":
    case "AWAITING_USER_FEEDBACK":
      return {
        statusBar: { color: "amber", text: "$(comment-discussion) Jules: Input Needed" },
        treeViewAction: { icon: "$(comment-discussion)", label: "Send Response / Instructions" },
        actionCenterItem: { icon: "$(comment-discussion)", title: "Send Response / Instructions to Agent" },
        actionApi: (msg: string) => julesApi.sendMessage(session.id, msg)
      };

    default:
      return renderStandardStatus(session.status);
  }
  // Regression check: Never conflate plan authorization with user input
}

// ============================================================================
// INVARIANT 8: PURE NATIVE IDE GUI & STATE DISCIPLINE
// ============================================================================
const NativeUiArchitecture = {
  webviews: "STRICTLY_RETIRED (0% HTML webview usage)",
  primitives: {
    logsAndStreaming: "vscode.window.createOutputChannel('Jules Activity Stream')",
    actionHub: "vscode.window.showQuickPick() -> Keyboard-Navigable Action Center",
    hierarchicalViews: "vscode.TreeDataProvider -> Dynamic Execution Plan (X/Y completed)",
    diffInspection: "vscode.diff -> Side-by-side native diff viewing",
    statusBar: "vscode.window.createStatusBarItem()"
  },
  persistencePolicy: {
    syncTrigger: (currentSession, liveSession) => {
      // Zero-churn disk write: Only persist when state actually mutated
      if (currentSession.status !== liveSession.status) {
        saveSessions();
      }
    }
  }
};

// ============================================================================
// INVARIANT 9: FAIL-SAFE GIT SAFETY GATE & IN-MEMORY PATCH CACHING
// ============================================================================
class GitSafetyGate {
  private static patchCheckCache = new Map<string, { result: boolean; timestamp: number }>();
  private static readonly TTL_MS = 30_000; // 30 seconds TTL

  static async verifyPreMergeCondition(session: JulesSession): Promise<void> {
    // Condition 1: Cloud session must be SUCCEEDED
    assert(session.status === "SUCCEEDED", `Cannot merge session ${session.id}: Status is ${session.status}, not SUCCEEDED.`);
    
    // Condition 2: Local working tree must be strictly clean
    const status = await runShell("git status --porcelain");
    assert(status.trim() === "", "Working tree contains uncommitted changes. Stash or commit before merging.");
  }

  static async checkPatchConflictCached(patchContent: string): Promise<boolean> {
    const hash = crypto.createHash("sha256").update(patchContent).digest("hex");
    const cached = this.patchCheckCache.get(hash);

    if (cached && (Date.now() - cached.timestamp < this.TTL_MS)) {
      return cached.result; // Zero disk write, zero spawn overhead
    }

    const checkResult = await gitCore.applyCheck(patchContent);
    this.patchCheckCache.set(hash, { result: checkResult, timestamp: Date.now() });
    return checkResult;
  }

  static cleanSessionScratch(sessionId: string): void {
    removeDirectory(`.jules-companion/diffs/${sessionId}`);
    removeDirectory(`.jules-companion/scratch/${sessionId}`);
  }
}

// ============================================================================
// INVARIANT 10: WINDOWS POWERSHELL & ANTIGRAVITY IDE SPECIFICS
// ============================================================================
const WindowsEnvironmentRules = {
  commandChaining: {
    invalidOperator: "&&", // Fails on PowerShell 5.1 (ParserError)
    validSeparator: ";",   // Use semicolon or discrete sequential calls
    example: "rtk git add -A; rtk git commit -m '...'"
  },
  codiconFonts: {
    missingGlyph: "0xEC6F ($(git-branch)) renders blank box in Antigravity codicon.ttf",
    replacements: ["$(source-control)", "$(repo-forked)"]
  },
  stringEscaping: {
    subexpressionTrap: "pwsh evaluates $(...) inside double quotes",
    remedy: "Use single quotes '...' or escape backtick `$(...)"
  },
  executionPrivilege: "Run Antigravity IDE as Standard User (Non-Admin) to preserve CUA input injection",
  extensionInstallation: "antigravity-ide.cmd --install-extension jules-companion-1.3.0.vsix --force"
};

// ============================================================================
// INVARIANT 11: CROSS-PLATFORM BUILD & CI/CD PIPELINE INTEGRITY
// ============================================================================
const CicdRules = {
  runners: ["Ubuntu Linux", "Windows", "Node.js 20.x, 22.x"],
  shellGlobbing: "FORBIDDEN in package.json (e.g. scripts/**/*.ts fails in Linux). Use scripts/build.js.",
  headlessMocks: "All tests must pass headlessly without display or live API keys.",
  networkTimeout: "All client requests in scripts/client/http.ts MUST use AbortSignal.timeout(15000)."
};

// ============================================================================
// INVARIANT 12: CLI TRUTH & 53 AGENT ROSTER ALIGNMENT
// ============================================================================
const AgentRosterAuthority = {
  authorityFile: "references/agents/registry.json",
  totalPersonas: 53, // 30 Coding + 23 Advisory
  prohibition: "Zero phantom agents allowed. Documented CLI commands must be 100% executable by Node.",
  schemaSync: "npm run sync -> Refreshes ~/.gemini/antigravity-ide/mcp/jules-companion/"
};

// ============================================================================
// INVARIANT 13: CODEBASE KNOWLEDGE GRAPH & ARCHITECTURE NAVIGATION (GRAPHIFY)
// Source: safishamsi/graphify | Persistent AST Knowledge Graph
// ============================================================================
const GraphifyProtocol = {
  artifacts: {
    graphJson: "graphify-out/graph.json",
    graphReport: "graphify-out/GRAPH_REPORT.md",
    wikiIndex: "graphify-out/wiki/index.md",
    visualization: "graphify-out/graph.html"
  },
  metrics: { nodes: 820, edges: 1696, communities: 73 },
  queryFirstReflex: {
    rule: "Treat any codebase, data-flow, or architectural inquiry as a Graphify query first before broad text grepping.",
    operations: {
      query: (question: string) => `rtk graphify query "${question}"`,           // Scoped subgraphs with minimal tokens
      tracePath: (from: string, to: string) => `rtk graphify path "${from}" "${to}"`, // Cross-module call chains & dependencies
      explain: (concept: string) => `rtk graphify explain "${concept}"`           // Inspect God Nodes or complex components
    }
  },
  hierarchicalNavigation: "If graphify-out/wiki/index.md exists, navigate community-clustered markdown articles instead of reading raw code files.",
  postEditHygiene: "Run 'rtk graphify update .' immediately after modifying code to synchronize AST and community clusters at zero API cost."
};

// ============================================================================
// INVARIANT 14: DOCUMENTATION & OBSIDIAN LLM WIKI PRESERVATION
// ============================================================================
const KnowledgePreservationPolicy = {
  repoDocs: ["CHANGELOG.md", "README.md", "docs/codebase/*"],
  llmWikiVault: "E:\\Markdown Artificial Intelligence\\LLM Wiki",
  skillsToUse: ["llm-wiki", "wiki-update", "wiki-capture"],
  action: "Sync architectural decisions, post-mortems, and debugging logs to vault immediately."
};
```

---

## 🗺️ 2. Architectural Tier Mapping & Codebase Navigation

```text
Tier 0: Tests (tests/)
  └── tests/doc_coverage.test.ts (100% TSDoc check)
  └── tests/scheduler.test.ts, action_center.test.ts, activity_channel.test.ts
  └── tests/status_bar.test.ts, sessions_provider.test.ts, mcp.test.ts, merge_session.test.ts

Tier 1: Extension Entrypoints (scripts/)
  ├── scripts/extension.ts       (IDE plugin entrypoint: 35 registered commands)
  └── scripts/mcp_server.ts      (JSON-RPC MCP daemon entrypoint)

Tier 2: Tools & Presentation (scripts/ui/, scripts/mcp/)
  ├── scripts/ui/                (ActionCenter, ActivityChannel, StatusBar, TreeView Providers)
  └── scripts/mcp/               (registry.ts [20 tools] + scripts/mcp/tools/*.ts)

Tier 3: Core Orchestration Engines (scripts/)
  ├── scripts/deploy_session.ts  (4 launch modes: start, review, interactive, team)
  ├── scripts/merge_session.ts   (Merge engine + pre-merge safety gate)
  └── scripts/jules_client.ts    (Consolidated client facade)

Tier 4: Network & Remote Clients (scripts/client/)
  ├── scripts/client/http.ts     (HTTPS transport + AbortSignal.timeout(15000))
  └── scripts/client/jules_api.ts(Google Jules REST API bindings)

Tier 5: Foundation Primitives (scripts/core/, scripts/utils.ts)
  ├── scripts/core/types.ts      (Contracts & interfaces)
  ├── scripts/core/storage.ts    (Atomic JSON read/write)
  ├── scripts/core/scheduler.ts  (Background Task Scheduler engine)
  ├── scripts/core/git.ts        (Git CLI abstraction + in-memory 30s TTL cache)
  └── scripts/utils.ts           (Doctor checks, status helpers)
```

---

## 🛠️ 3. Autonomous AI Agent Operating Playbook (Windows / PowerShell)

```typescript
// ============================================================================
// EXECUTABLE PLAYBOOK PIPELINE
// ============================================================================
async function runAgentOperatingPlaybook(task: Task): Promise<void> {
  // --------------------------------------------------------------------------
  // STEP 1: Cognitive Analysis & Context Gathering
  // --------------------------------------------------------------------------
  await executeSequentialThinkingProtocol(task);
  
  // Query persistent knowledge graph first
  const graphContext = await runShell(`rtk graphify query "${task.componentName}"`);
  
  // In-memory code analysis without flooding tokens
  const metrics = await TokenOptimizationPolicy.analyzeFile(task.targetFile, `
    const lines = FILE_CONTENT.split('\\n');
    console.log({ totalLines: lines.length, exports: lines.filter(l => l.startsWith('export')).length });
  `);

  // --------------------------------------------------------------------------
  // STEP 2: Implement Minimal Surgical Fixes
  // --------------------------------------------------------------------------
  const diff = applyPonytailLadder(task, task.solutionCandidate);
  enforceKarpathyProtocol(task, diff);
  applySurgicalEdit(task.targetFile, diff);
  validateCodeDocumentation(loadSourceFile(task.targetFile));

  // --------------------------------------------------------------------------
  // STEP 3: Run the Verification Suite
  // --------------------------------------------------------------------------
  await runShell("rtk npm test");
  // Full verification (typecheck + 124 tests across 39 suites)
  const verifyResult = await runShell("rtk npm run verify");
  assert(verifyResult.includes("0 failures"), "Test failure detected. Rollback or fix immediately.");

  // --------------------------------------------------------------------------
  // STEP 4: Recompile & Verify Packaging
  // --------------------------------------------------------------------------
  await runShell("rtk npm run build");     // Compile 30 TypeScript entrypoints + sync global schema
  await runShell("rtk npm run registry");  // If agents modified, rebuild registry.json
  await runShell("rtk npm run package");   // Produces jules-companion-${pkg.version}.vsix
  const vsixName = `jules-companion-${loadPackageJson().version}.vsix`;

  // --------------------------------------------------------------------------
  // STEP 5: Install & Hot-Reload in Antigravity IDE
  // --------------------------------------------------------------------------
  await runShell(`antigravity-ide.cmd --install-extension ${vsixName} --force`);

  // --------------------------------------------------------------------------
  // STEP 6: Post-Edit Knowledge Graph Hygiene & Git Ship
  // --------------------------------------------------------------------------
  await runShell("rtk graphify update .");  // Sync AST knowledge graph
  
  // Note: Escape $(...) or use single quotes in PowerShell
  await runShell("rtk git add -A");
  await runShell(`rtk git commit -m 'feat(${task.scope}): ${task.description}'`);
  await runShell("rtk git push origin main");
}
```

---

## 🔌 4. Model Context Protocol (MCP) Tool Calling Catalog (20 Tools)

```typescript
interface JulesCompanionMcpTools {
  // Session Lifecycle & Deployment
  deploy_session(params: { type: "start" | "review" | "interactive"; prompt: string; branch?: string }): Promise<Session>;
  deploy_team(params: { preset: "github-ops" | "full-audit" | "feature-sprint" | "refactor-boost"; prompt: string }): Promise<TeamResult>;
  cancel_session(params: { sessionId: string }): Promise<void>;
  retry_failed_session(params: { sessionId: string }): Promise<Session>;
  get_session_status(params: { sessionId: string }): Promise<SessionStatus>;
  auto_process(params: { sessionId: string }): Promise<AutoProcessSummary>;

  // Code Review & Git Integration
  merge_session(params: { sessionId: string; inspect: boolean; approve: boolean }): Promise<MergeResult>;
  pull_session_diff(params: { sessionId: string }): Promise<{ diffPath: string; conflictStatus: boolean }>;
  checkout_session_branch(params: { sessionId: string }): Promise<{ localBranch: string }>;
  rollback_session(params: { sessionId: string }): Promise<void>;
  create_github_pr(params: { sessionId: string; title?: string; body?: string }): Promise<{ prUrl: string }>;
  get_review_reports(params: { sessionId?: string }): Promise<ReviewReport[]>;

  // Human-in-the-Loop Feedback
  send_session_message(params: { sessionId: string; message: string }): Promise<void>;

  // Specialist Agent Personas (53 Agents)
  list_agents(): Promise<AgentMetadata[]>;
  get_agent_info(params: { agentName: string }): Promise<AgentPromptDetails>;
  create_custom_agent(params: { name: string; role: string; instructions: string }): Promise<void>;
  read_agent_journal(params: { agentName: string }): Promise<JournalEntry[]>;

  // Workspace Diagnostics & Setup
  setup_workspace(): Promise<{ initialized: boolean }>;
  list_sources(): Promise<SourceRepository[]>;
  run_doctor(): Promise<{ healthy: boolean; diagnostics: DiagnosticCheck[] }>;
}
```

---

## 📋 5. Specialist Agent Personas Catalog (53 Agents)

```typescript
const SPECIALIST_AGENT_ROSTER = {
  // Coding & Architecture Specialists (30 Personas)
  codingAndArchitecture: [
    "adapter", "alchemist", "benchmarker", "bolt", "bridge", 
    "builder", "chameleon", "conduit", "decoupler", "dockerist", 
    "enforcer", "exterminator", "gatekeeper", "hermetic", "innovator", 
    "inspector", "janitor", "logger", "materialist", "modernizer", 
    "monorepist", "netrunner", "nomad", "octo", "packager", 
    "palette", "partisan", "plugger", "sentinel", "watcher"
  ],

  // Advisory, Review & Documentation Specialists (23 Personas)
  advisoryAndReview: [
    "annotator", "archivist", "attestor", "cartographer", "consultant", 
    "critic", "curator", "datasmith", "grader", "green", 
    "guildmaster", "lexicon", "localizer", "mutator", "nexus", 
    "proteus", "revenant", "scaler", "scribe", "sleuth", 
    "smith", "synapse", "vscecraft"
  ]
} as const;

// Invariant: Total length strictly equals 53
assert(
  SPECIALIST_AGENT_ROSTER.codingAndArchitecture.length + 
  SPECIALIST_AGENT_ROSTER.advisoryAndReview.length === 53,
  "Roster mismatch! references/agents/registry.json must define exactly 53 specialist agents."
);
```

---

## ⚠️ 6. Operational Gotchas & Defensive Execution Rules

```python
# ==============================================================================
# DEFENSIVE EXECUTION TRAPS & RESOLUTIONS
# ==============================================================================
DEFENSIVE_TRAPS = {
    "POWERSHELL_OPERATOR_TRAP": {
        "hazard": "Using '&&' in PowerShell 5.1 throws ParserError.",
        "remedy": "Separate statements with ';' or execute as separate tool calls."
    },
    "POWERSHELL_SUBEXPRESSION_TRAP": {
        "hazard": "Unescaped '$(...)' evaluates inside double quotes in PowerShell.",
        "remedy": "Use single quotes '...' or escape as `$(...)."
    },
    "INLINE_DOC_DENSITY_STANDARD": {
        "hazard": "Missing comment density fails CI tests/doc_coverage.test.ts.",
        "remedy": "Maintain >=10% comments in utils/core and >=4% in extension.ts; use '// Step N: ...'."
    },
    "CODICON_GLYPH_TRAP": {
        "hazard": "$(git-branch) (0xEC6F) is missing in Antigravity codicon font.",
        "remedy": "Use $(source-control) or $(repo-forked) instead."
    },
    "UI_PRIMITIVE_DISCIPLINE": {
        "hazard": "Chromium Webviews incur heavy memory and DOM parsing overhead.",
        "remedy": "Use vscode.OutputChannel for streaming, QuickPick for actions, TreeView for execution plan."
    },
    "UAC_UIPI_ISOLATION": {
        "hazard": "Admin-elevated IDE blocks CUA input injection tools.",
        "remedy": "Run Antigravity IDE strictly as a standard, non-elevated user."
    },
    "OFFLINE_TEST_RESILIENCE": {
        "hazard": "Tests failing due to missing Jules API credentials or display.",
        "remedy": "Validate inputs and branch logic before checking network credentials; mock APIs."
    },
    "STORAGE_ATOMICITY": {
        "hazard": "Concurrent JSON write corruption.",
        "remedy": "Use atomic write-then-rename pattern (.tmp -> .json) for .jules-companion/ files."
    }
}
```

---

## ✅ 7. Pre-Completion Final Verification Gate (Automated Assertion Checklist)

```typescript
function executePreCompletionGate(): void {
  // Invariant & Scope Checks
  assert(isShortestWorkingDiff(), "Diff must be minimal and strictly targeted.");
  assert(hasNoSpeculativeAbstractions(), "Ponytail YAGNI: No unrequested abstractions.");
  assert(noNewNpmDependenciesAdded(), "No new npm packages added without explicit approval.");
  
  // Documentation & Roster Checks
  assert(verifyDocCoverageTestPassed(), "All public symbols must have 100% TSDoc; density thresholds met.");
  assert(verifyAgentRosterExact53(), "Specialist roster strictly matches references/agents/registry.json.");
  
  // Sentrux Architectural Layering Check
  assert(runCommand("rtk sentrux check .").success, "Sentrux check failed: circular dependency or upward import detected.");

  // Test & Build Suite Checks
  assert(runCommand("rtk npm run verify").success, "Typecheck and 124 tests across 39 suites must pass with 0 failures.");
  assert(runCommand("rtk npm run build").success, "All 30 TypeScript entrypoints must compile cleanly; global sync completed.");
  assert(runCommand("rtk npm run package").success, `Package output jules-companion-${loadPackageJson().version}.vsix must be generated.`);
  assert(reinstallExtensionToIde(), "VSIX successfully hot-reinstalled to Antigravity IDE.");

  // Graphify & Knowledge Vault Checks
  assert(runCommand("rtk graphify update .").success, "Graphify knowledge graph updated (820 nodes, 1696 edges, 73 communities).");
  assert(verifyRepoDocsUpdated(["CHANGELOG.md", "README.md", "docs/codebase/"]), "Project documentation updated.");
  assert(syncObsidianWikiVault("E:\\Markdown Artificial Intelligence\\LLM Wiki"), "Knowledge preserved to Obsidian LLM Wiki.");

  // Clean Working Tree Check
  assert(runCommand("git status --porcelain").stdout.trim() === "", "Working tree must be completely clean before concluding task.");
}
```
