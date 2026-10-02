# Specialist Agent Personas Catalog (63 Agents)

This document catalogs the complete roster of **63 specialist agent personas** implemented in Jules Companion. The master registry and individual system prompts are defined in [references/agents/registry.json](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/registry.json).

---

## High-Level Roster Structure

The roster consists of **36 Coding & Architecture Specialists** and **27 Advisory, Review & Documentation Specialists**, totaling exactly 63 agents.

```typescript
const SPECIALIST_AGENT_ROSTER = {
  // Coding & Architecture Specialists (36 Personas)
  codingAndArchitecture: [
    "adapter", "alchemist", "benchmarker", "bolt", "bridge", 
    "builder", "chameleon", "conduit", "consolidator", "decoupler", 
    "dockerist", "enforcer", "exterminator", "gatekeeper", "hermetic", 
    "innovator", "inspector", "janitor", "logger", "materialist", 
    "modernizer", "monorepist", "netrunner", "nomad", "octo", 
    "packager", "palette", "partisan", "plugger", "pruner", 
    "sentinel", "slimmer", "specifier", "speedster", "standardizer", 
    "watcher"
  ],

  // Advisory, Review & Documentation Specialists (27 Personas)
  advisoryAndReview: [
    "annotator", "archivist", "attestor", "cartographer", "consultant", 
    "critic", "curator", "datasmith", "explainer", "gitsmith", 
    "grader", "green", "guildmaster", "lexicon", "localizer", 
    "mutator", "nexus", "planner", "proteus", "revenant", 
    "scaler", "scoper", "scribe", "sleuth", "smith", 
    "synapse", "vscecraft"
  ]
} as const;
```

---

## Domain Mapping (11 Functional Clusters)

1. **Core & Architecture**:
   - `builder`, `bridge`, `conduit`, `decoupler`, `consolidator`, `monorepist`, `nexus`, `smith`
2. **Refactoring & Modernization**:
   - `alchemist`, `modernizer`, `innovator`, `chameleon`, `nomad`, `proteus`
3. **Performance & Optimization**:
   - `bolt`, `speedster`, `benchmarker`, `slimmer`, `pruner`, `scaler`
4. **Security & Governance**:
   - `gatekeeper`, `sentinel`, `enforcer`, `hermetic`, `attestor`
5. **Quality Assurance & Testing**:
   - `exterminator`, `inspector`, `mutator`, `grader`, `sleuth`
6. **Maintenance & Hygiene**:
   - `janitor`, `logger`, `watcher`, `standardizer`, `revenant`
7. **Packaging & Infrastructure**:
   - `dockerist`, `packager`, `plugger`, `adapter`, `netrunner`, `octo`, `vscecraft`
8. **UI, UX & Styling**:
   - `materialist`, `palette`, `green`
9. **Planning & Strategy**:
   - `planner`, `scoper`, `consultant`, `critic`, `guildmaster`
10. **Documentation & Knowledge**:
    - `scribe`, `annotator`, `archivist`, `curator`, `explainer`, `lexicon`, `cartographer`
11. **Data & Version Control Integration**:
    - `datasmith`, `gitsmith`, `localizer`, `synapse`, `specifier`

---

## MCP Access & Invocation

Autonomous agents can query and activate these personas via the Jules Companion MCP server:
- `list_agents()`: Returns list of available agents with their short roles.
- `get_agent_info({ agentName: "speedster" })`: Returns the exact system prompt, instructions, and tool access configuration.
- `read_agent_journal({ agentName: "alchemist" })`: Inspects execution journal entries recorded by the agent.
