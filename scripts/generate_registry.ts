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
    'enforcer'
  ]);

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

    // Populate the master mapping object
    agentsMap[id] = {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      role,
      group,
      description,
      file: `references/agents/${file}`
    };
  };

  // Concurrently parse all markdown templates
  await Promise.all(files.map(processFile));

  const registry: Registry = {
    generatedAt: new Date().toISOString(),
    totalAgents: Object.keys(agentsMap).length,
    agents: agentsMap
  };

  // Persist the extracted metadata database to disk for fast runtime access
  const registryPath = path.join(agentsDir, 'registry.json');
  await fs.promises.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`Registry generated successfully at ${registryPath} (${registry.totalAgents} agents index).`);

  return registry;
}

if (require.main === module) {
  generateRegistry().catch(err => {
    console.error(`Failed to generate registry: ${err.message}`);
    process.exit(1);
  });
}
