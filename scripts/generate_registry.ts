/**
 * Dynamic agent template parser and registry compiler.
 * @module generate_registry
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents the structured metadata extracted from an agent's markdown template file.
 * This metadata provides the core configuration and routing details for individual agents.
 */
export interface AgentMetadata {
  /** The unique lowercase identifier for the agent (e.g., 'bolt'). Derived from the filename. */
  id: string;
  /** The capitalized display name of the agent (e.g., 'Bolt'). */
  name: string;
  /** The specialized role or title of the agent, extracted from the first top-level Markdown header. */
  role: string;
  /** The operational classification of the agent. 'coding' for implementation agents, 'advisory' for supportive roles. */
  group: 'coding' | 'advisory';
  /** The specialized functional domain category of the agent (e.g., 'Testing & QA', 'Security & Compliance'). */
  category: string;
  /** A concise summary of the agent's purpose, extracted from the first valid paragraph in the template. */
  description: string;
  /** The relative file path to the agent's source markdown template. */
  file: string;
}

/**
 * Represents the centralized, aggregated index of all available agents within the system.
 * This registry is persisted to disk and used for rapid deployment validation and task routing.
 */
export interface Registry {
  /** An ISO 8601 timestamp indicating exactly when this registry index was compiled. */
  generatedAt: string;
  /** The total count of agents successfully parsed and included in this registry. */
  totalAgents: number;
  /** A dictionary mapping agent unique IDs to their fully populated `AgentMetadata` objects. */
  agents: Record<string, AgentMetadata>;
}

/**
 * Generates the agent registry by scanning the markdown template files in the `references/agents` directory.
 * Extracts metadata such as agent role and description dynamically using regex, compiling it into a
 * centralized `registry.json` index. This index powers the deploy validations and intelligent routing mechanisms.
 *
 * @returns {Promise<Registry>} A promise that resolves to the generated Registry object.
 */
export async function generateRegistry(): Promise<Registry> {
  const agentsDir = path.join(__dirname, '..', 'references', 'agents');
  
  if (!fs.existsSync(agentsDir)) {
    console.error(`Error: Agents directory not found at ${agentsDir}`);
    process.exit(1);
  }

  // Predefined hardcoded list of agents designated for active coding/implementation duties.
  // Agents not on this list will default to 'advisory' (e.g., Critic, Scribe).
  const codingAgents = new Set([
    'palette', 'sentinel', 'bolt', 'nomad', 'packager', 'exterminator',
    'builder', 'conduit', 'alchemist', 'gatekeeper', 'bridge', 'dockerist',
    'modernizer', 'inspector', 'janitor', 'logger', 'benchmarker', 'watcher',
    'chameleon', 'innovator', 'materialist', 'partisan', 'netrunner', 'adapter',
    'enforcer', 'octo', 'hermetic', 'decoupler', 'monorepist', 'plugger',
    'slimmer', 'speedster', 'consolidator', 'pruner', 'standardizer', 'specifier'
  ]);

  // Canonical classification mapping all 63 agents to 11 intuitive functional domain categories.
  const agentCategories: Record<string, string> = {
    // 1. Testing & QA
    inspector: 'Testing & QA',
    mutator: 'Testing & QA',
    benchmarker: 'Testing & QA',

    // 2. Security & Compliance
    sentinel: 'Security & Compliance',
    gatekeeper: 'Security & Compliance',
    attestor: 'Security & Compliance',
    watcher: 'Security & Compliance',

    // 3. Performance & Scalability
    bolt: 'Performance & Scalability',
    scaler: 'Performance & Scalability',
    green: 'Performance & Scalability',
    sleuth: 'Performance & Scalability',
    slimmer: 'Performance & Scalability',
    speedster: 'Performance & Scalability',

    // 4. Database & Persistence
    alchemist: 'Database & Persistence',
    datasmith: 'Database & Persistence',

    // 5. Frontend, UX & Design
    builder: 'Frontend, UX & Design',
    palette: 'Frontend, UX & Design',
    materialist: 'Frontend, UX & Design',
    localizer: 'Frontend, UX & Design',

    // 6. Backend, API & AI
    conduit: 'Backend, API & AI',
    bridge: 'Backend, API & AI',
    netrunner: 'Backend, API & AI',
    nexus: 'Backend, API & AI',
    synapse: 'Backend, API & AI',

    // 7. Architecture & Refactoring
    consultant: 'Architecture & Refactoring',
    decoupler: 'Architecture & Refactoring',
    enforcer: 'Architecture & Refactoring',
    hermetic: 'Architecture & Refactoring',
    modernizer: 'Architecture & Refactoring',
    monorepist: 'Architecture & Refactoring',
    plugger: 'Architecture & Refactoring',
    partisan: 'Architecture & Refactoring',
    chameleon: 'Architecture & Refactoring',
    consolidator: 'Architecture & Refactoring',
    standardizer: 'Architecture & Refactoring',
    scoper: 'Architecture & Refactoring',
    planner: 'Architecture & Refactoring',

    // 8. Code Health & Debugging
    janitor: 'Code Health & Debugging',
    critic: 'Code Health & Debugging',
    grader: 'Code Health & Debugging',
    exterminator: 'Code Health & Debugging',
    logger: 'Code Health & Debugging',
    innovator: 'Code Health & Debugging',
    proteus: 'Code Health & Debugging',
    pruner: 'Code Health & Debugging',

    // 9. DevOps, CI/CD & Tooling
    dockerist: 'DevOps, CI/CD & Tooling',
    octo: 'DevOps, CI/CD & Tooling',
    packager: 'DevOps, CI/CD & Tooling',
    smith: 'DevOps, CI/CD & Tooling',
    vscecraft: 'DevOps, CI/CD & Tooling',
    gitsmith: 'DevOps, CI/CD & Tooling',

    // 10. System & Portability
    adapter: 'System & Portability',
    nomad: 'System & Portability',
    revenant: 'System & Portability',

    // 11. Documentation & Governance
    scribe: 'Documentation & Governance',
    archivist: 'Documentation & Governance',
    annotator: 'Documentation & Governance',
    curator: 'Documentation & Governance',
    cartographer: 'Documentation & Governance',
    guildmaster: 'Documentation & Governance',
    lexicon: 'Documentation & Governance',
    specifier: 'Documentation & Governance',
    explainer: 'Documentation & Governance'
  };

  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  const agentsMap: Record<string, AgentMetadata> = {};

  // Process each markdown file to extract its internal semantic metadata
  const processFile = async (file: string) => {
    // Determine the baseline ID from the filename (e.g., 'bolt.md' -> 'bolt')
    const id = path.basename(file, '.md').toLowerCase();
    const filePath = path.join(agentsDir, file);
    const content = await fs.promises.readFile(filePath, 'utf8');

    // Extract title / role from first top-level Markdown header (# Header)
    let role = id;
    // Regex accounts for optional \scoped? tags sometimes prefixed in headers by older systems
    const headerMatch = content.match(/^#\\scoped?\\s*(.+)$/m) || content.match(/^#\\s*(.+)$/m);
    if (headerMatch) {
      role = headerMatch[1].trim();
    }

    // Extract short description from first valid non-header paragraph
    let description = '';
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines, headers (#), and code blocks (```)
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
        description = trimmed;
        break;
      }
    }

    const group: 'coding' | 'advisory' = codingAgents.has(id) ? 'coding' : 'advisory';
    const category = agentCategories[id] || 'General';

    // Populate the master mapping object
    agentsMap[id] = {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      role,
      group,
      category,
      description,
      file: `references/agents/${file}`
    };
  };

  // Concurrently parse all markdown templates
  await Promise.all(files.map(processFile));

  const sortedAgents: Record<string, AgentMetadata> = {};
  for (const k of Object.keys(agentsMap).sort()) {
    sortedAgents[k] = agentsMap[k];
  }

  const registryPath = path.join(agentsDir, 'registry.json');
  let generatedAt = new Date().toISOString();
  if (fs.existsSync(registryPath)) {
    try {
      const existing = JSON.parse(await fs.promises.readFile(registryPath, 'utf8'));
      if (
        existing.totalAgents === Object.keys(sortedAgents).length &&
        JSON.stringify(existing.agents) === JSON.stringify(sortedAgents) &&
        existing.generatedAt
      ) {
        generatedAt = existing.generatedAt;
      }
    } catch {}
  }

  const registry: Registry = {
    generatedAt,
    totalAgents: Object.keys(sortedAgents).length,
    agents: sortedAgents
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.promises.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
      break;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
  console.log(`Registry generated successfully at ${registryPath} (${registry.totalAgents} agents index).`);

  return registry;
}

if (require.main === module) {
  generateRegistry().catch(err => {
    console.error(`Failed to generate registry: ${err.message}`);
    process.exit(1);
  });
}
