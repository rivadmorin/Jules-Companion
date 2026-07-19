import * as fs from 'fs';
import * as path from 'path';

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  group: 'coding' | 'advisory';
  file: string;
}

interface AgentRegistry {
  generatedAt: string;
  totalAgents: number;
  agents: Record<string, AgentInfo>;
}

const codingAgents = new Set([
  'palette', 'sentinel', 'bolt', 'watcher', 'exterminator',
  'builder', 'alchemist', 'materialist', 'netrunner', 'dockerist',
  'packager', 'modernizer', 'janitor', 'proteus', 'benchmarker'
]);

export function generateRegistry(): AgentRegistry {
  const agentsDir = path.join(__dirname, '..', 'references', 'agents');
  
  if (!fs.existsSync(agentsDir)) {
    console.error(`Error: Agents directory not found at ${agentsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  const agents: Record<string, AgentInfo> = {};

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const agentId = path.basename(file, '.md').toLowerCase();
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      
      let name = agentId;
      let emoji = '';
      let description = 'Specialized agent';

      // Parse pattern: You are "Name" EMOJI - Description
      const firstLine = lines[0] || '';
      const match = firstLine.match(/You are "([^"]+)"\s*([^\s-]+)?\s*-\s*(.+)/i);

      if (match) {
        name = match[1];
        emoji = match[2] || '';
        description = match[3];
      } else {
        // Fallback: Use first header or non-empty line
        const header = lines.find(l => l.startsWith('#'));
        if (header) {
          name = header.replace(/^#+\s*/, '');
        }
      }

      agents[agentId] = {
        id: agentId,
        name,
        emoji,
        description,
        group: codingAgents.has(agentId) ? 'coding' : 'advisory',
        file: `references/agents/${file}`
      };
    } catch (err: any) {
      console.error(`Warning: Failed to process ${file}:`, err.message);
    }
  }

  const registry: AgentRegistry = {
    generatedAt: new Date().toISOString(),
    totalAgents: Object.keys(agents).length,
    agents
  };

  const outputPath = path.join(agentsDir, 'registry.json');
  fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`Successfully generated registry with ${registry.totalAgents} agents at ${outputPath}`);

  return registry;
}

if (require.main === module) {
  generateRegistry();
}
