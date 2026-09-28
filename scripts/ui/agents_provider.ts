/**
 * TreeDataProvider and tree items for the Jules Agent Roster in the VS Code sidebar.
 * @module ui/agents_provider
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Metadata representation of a registered Jules agent.
 */
export interface AgentEntry {
  id: string;
  name: string;
  role: string;
  group: string;
  description: string;
  file: string;
}

/**
 * TreeItem representing an individual agent or an agent functional group in the sidebar.
 */
export class AgentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly agent?: AgentEntry,
    public readonly groupName?: string
  ) {
    super(label, collapsibleState);

    if (agent) {
      this.id = `agent-${agent.id}`;
      this.description = agent.role || agent.group;
      
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`### Agent: **${agent.name}** (\`${agent.id}\`)\n\n`);
      tooltip.appendMarkdown(`- **Role:** \`${agent.role}\`\n`);
      tooltip.appendMarkdown(`- **Group:** \`${agent.group}\`\n\n`);
      tooltip.appendMarkdown(`${agent.description}\n`);
      this.tooltip = tooltip;

      this.iconPath = new vscode.ThemeIcon('sparkle');
      this.contextValue = 'agent-item';
      this.command = {
        command: 'jules.openAgentDoc',
        title: 'Open Agent Directives',
        arguments: [agent]
      };
    } else if (groupName) {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.contextValue = 'agent-group';
    }
  }
}

/**
 * TreeDataProvider displaying categorized Jules agents in the VS Code sidebar.
 */
export class AgentsTreeDataProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> =
    new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private registryCache: Record<string, AgentEntry> | null = null;

  constructor(private extensionPath: string, private getWorkspaceRoot: () => string) {}

  refresh(): void {
    this.registryCache = null;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  private loadRegistry(): Record<string, AgentEntry> {
    if (this.registryCache) return this.registryCache;

    const candidates = [
      path.join(this.getWorkspaceRoot(), 'references', 'agents', 'registry.json'),
      path.join(this.extensionPath, 'references', 'agents', 'registry.json')
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          this.registryCache = raw.agents || raw;
          return this.registryCache!;
        } catch {
          // continue
        }
      }
    }

    return {};
  }

  async getChildren(element?: AgentTreeItem): Promise<AgentTreeItem[]> {
    const agentsMap = this.loadRegistry();
    const agents = Object.values(agentsMap);

    if (agents.length === 0) {
      return [new AgentTreeItem('No agent registry found', vscode.TreeItemCollapsibleState.None)];
    }

    if (!element) {
      // Group agents by their group property
      const groups = new Map<string, AgentEntry[]>();
      for (const a of agents) {
        const grp = a.group || 'general';
        if (!groups.has(grp)) groups.set(grp, []);
        groups.get(grp)!.push(a);
      }

      const groupItems: AgentTreeItem[] = [];
      for (const [groupName, groupAgents] of groups.entries()) {
        const title = groupName.charAt(0).toUpperCase() + groupName.slice(1);
        groupItems.push(
          new AgentTreeItem(
            `${title} (${groupAgents.length})`,
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            groupName
          )
        );
      }

      return groupItems.sort((a, b) => a.label.localeCompare(b.label));
    } else if (element.groupName) {
      // Return agents belonging to this group
      const filtered = agents
        .filter(a => (a.group || 'general') === element.groupName)
        .sort((a, b) => a.name.localeCompare(b.name));

      return filtered.map(
        a => new AgentTreeItem(
          `${a.name} (${a.id})`,
          vscode.TreeItemCollapsibleState.None,
          a
        )
      );
    }

    return [];
  }
}
