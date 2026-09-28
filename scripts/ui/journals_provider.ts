/**
 * TreeDataProvider and tree items for Jules Agent Journals and Review Reports in the VS Code sidebar.
 * @module ui/journals_provider
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TreeItem representing a journal markdown file or a report directory.
 */
export class JournalTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath?: string,
    public readonly isFolder?: boolean
  ) {
    super(label, collapsibleState);

    if (filePath && !isFolder) {
      this.resourceUri = vscode.Uri.file(filePath);
      this.command = {
        command: 'vscode.open',
        title: 'Open Journal File',
        arguments: [vscode.Uri.file(filePath)]
      };
      this.iconPath = new vscode.ThemeIcon('file-text');
      this.contextValue = 'journal-file';
      this.tooltip = filePath;
    } else if (isFolder) {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.contextValue = 'journal-folder';
    }
  }
}

/**
 * TreeDataProvider displaying Jules journals and review documents in the VS Code sidebar.
 */
export class JournalsTreeDataProvider implements vscode.TreeDataProvider<JournalTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<JournalTreeItem | undefined | null | void> =
    new vscode.EventEmitter<JournalTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<JournalTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private getWorkspaceRoot: () => string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: JournalTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: JournalTreeItem): Promise<JournalTreeItem[]> {
    const rootPath = this.getWorkspaceRoot();
    if (!rootPath) {
      return [new JournalTreeItem('No workspace open', vscode.TreeItemCollapsibleState.None)];
    }

    const checkDirs = [
      { name: 'Agent Journals', dir: path.join(rootPath, '.jules', 'journals') },
      { name: 'Reviews', dir: path.join(rootPath, 'docs', 'jules-reviews') },
      { name: 'Reports', dir: path.join(rootPath, 'docs', 'jules-reports') }
    ];

    if (!element) {
      const items: JournalTreeItem[] = [];
      for (const cd of checkDirs) {
        if (fs.existsSync(cd.dir)) {
          const files = fs.readdirSync(cd.dir).filter(f => f.endsWith('.md'));
          if (files.length > 0) {
            items.push(
              new JournalTreeItem(
                `${cd.name} (${files.length})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                cd.dir,
                true
              )
            );
          }
        }
      }

      if (items.length === 0) {
        return [new JournalTreeItem('No journals or reports found', vscode.TreeItemCollapsibleState.None)];
      }

      return items;
    } else if (element.filePath && element.isFolder) {
      try {
        const files = fs.readdirSync(element.filePath).filter(f => f.endsWith('.md'));
        return files.map(
          f => new JournalTreeItem(f, vscode.TreeItemCollapsibleState.None, path.join(element.filePath!, f))
        );
      } catch {
        return [];
      }
    }

    return [];
  }
}
