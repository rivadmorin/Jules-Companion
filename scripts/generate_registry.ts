import * as fs from 'fs';
import * as path from 'path';

export interface AgentMetadata {
  id: string;
  name: string;
  role: string;
  group: 'coding' | 'advisory';
  description: string;
  file: string;
}

export interface Registry {
  generatedAt: string;
  totalAgents: number;
  agents: Record<string, AgentMetadata>;
}

export function generateRegistry(): Registry {
  const agentsDir = path.join(__dirname, '..', 'references', 'agents');
  
  if (!fs.existsSync(agentsDir)) {
    console.error(`Error: Agents directory not found at ${agentsDir}`);
    process.exit(1);
  }

  const codingAgents = new Set([
    'palette', 'sentinel', 'bolt', 'nomad', 'packager', 'exterminator',
    'builder', 'conduit', 'alchemist', 'gatekeeper', 'bridge', 'dockerist',
    'modernizer', 'inspector', 'janitor', 'logger', 'benchmarker', 'watcher',
    'chameleon', 'innovator', 'materialist', 'partisan', 'netrunner', 'adapter'
  ]);

  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  const agentsMap: Record<string, AgentMetadata> = {};

  for (const file of files) {
    const id = path.basename(file, '.md').toLowerCase();
    const filePath = path.join(agentsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract title / role from first header
    let role = id;
    const headerMatch = content.match(/^#\scoped?\s*(.+)$/m) || content.match(/^#\s*(.+)$/m);
    if (headerMatch) {
      role = headerMatch[1].trim();
    }

    // Extract short description from first non-header paragraph
    let description = '';
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
        description = trimmed;
        break;
      }
    }

    const group: 'coding' | 'advisory' = codingAgents.has(id) ? 'coding' : 'advisory';

    agentsMap[id] = {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      role,
      group,
      description,
      file: `references/agents/${file}`
    };
  }

  const registry: Registry = {
    generatedAt: new Date().toISOString(),
    totalAgents: Object.keys(agentsMap).length,
    agents: agentsMap
  };

  const registryPath = path.join(agentsDir, 'registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`Registry generated successfully at ${registryPath} (${registry.totalAgents} agents index).`);

  return registry;
}

if (require.main === module) {
  generateRegistry();
}
