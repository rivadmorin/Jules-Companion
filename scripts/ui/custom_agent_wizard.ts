/**
 * Interactive wizard for designing and registering custom specialized Jules agents.
 * @module ui/custom_agent_wizard
 */

import * as vscode from 'vscode';
import { createCustomAgentScaffold } from '../utils';

/**
 * Launches an interactive multi-step wizard in the IDE to scaffold a new custom specialized agent.
 *
 * @param extensionPath - Absolute path to extension installation directory.
 * @param targetDir - Active workspace root directory.
 * @param onCreated - Optional callback triggered after successful agent registration.
 * @returns A promise resolving when wizard execution completes.
 */
export async function runCustomAgentWizard(
  extensionPath: string,
  targetDir: string,
  onCreated?: () => void
): Promise<void> {
  // Step 1: Unique Identifier
  const agentId = await vscode.window.showInputBox({
    title: 'Custom Agent Builder (1/5): Identifier',
    prompt: 'Enter a lowercase identifier (letters, digits, dashes)',
    placeHolder: 'e.g. fastapi-architect, tailwind-stylist, k8s-operator',
    validateInput: val => {
      if (!val || !val.trim()) return 'Agent identifier cannot be empty';
      if (!/^[a-z0-9-_]+$/.test(val.trim())) return 'Use lowercase letters, numbers, hyphens, and underscores only';
      return null;
    }
  });
  if (!agentId) return;
  const cleanId = agentId.trim().toLowerCase();

  // Step 2: Role / Title
  const role = await vscode.window.showInputBox({
    title: 'Custom Agent Builder (2/5): Role Title',
    prompt: 'Enter the human-readable professional role or persona for this agent',
    placeHolder: 'e.g. FastAPI & Pydantic Microservices Specialist 🚀',
    value: cleanId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
  });
  if (!role || !role.trim()) return;

  // Step 3: Functional Group
  const group = await vscode.window.showQuickPick(
    [
      { label: '$(code) Coding', description: 'Core software implementation & features', value: 'Coding' },
      { label: '$(layers) Architecture', description: 'System design, modular refactoring, scalability', value: 'Architecture' },
      { label: '$(shield) Security', description: 'Vulnerability assessment, auth, dependency auditing', value: 'Security' },
      { label: '$(beaker) Quality Assurance', description: 'Testing, QA, TDD suites, edge cases', value: 'Quality Assurance' },
      { label: '$(server) DevOps & Cloud', description: 'Docker, CI/CD pipelines, cloud infrastructure', value: 'DevOps' },
      { label: '$(browser) Frontend & UI', description: 'React, Vue, CSS styling, UX components', value: 'Frontend' }
    ],
    { title: 'Custom Agent Builder (3/5): Functional Group' }
  );
  if (!group) return;

  // Step 4: Core Directives
  const directives = await vscode.window.showInputBox({
    title: 'Custom Agent Builder (4/5): Core Directives',
    prompt: 'Describe the main objectives, philosophy, and focus for this agent',
    placeHolder: 'e.g. Specialize in designing high-performance async endpoints with strict validation',
    value: `Expert specialist in ${role.trim()}. Ensures clean, maintainable, and well-tested solutions.`
  });
  if (!directives || !directives.trim()) return;

  // Step 5: Boundaries (Always Do & Never Do)
  const boundariesDoRaw = await vscode.window.showInputBox({
    title: 'Custom Agent Builder (5/5a): Mandatory Boundaries (Always Do)',
    prompt: 'Enter comma-separated mandatory actions',
    placeHolder: 'e.g. Write unit tests, Add type hints, Follow PEP8',
    value: 'Write unit tests, Follow project idioms, Keep changes minimal'
  });
  if (boundariesDoRaw === undefined) return;

  const boundariesDontRaw = await vscode.window.showInputBox({
    title: 'Custom Agent Builder (5/5b): Forbidden Boundaries (Never Do)',
    prompt: 'Enter comma-separated forbidden actions',
    placeHolder: 'e.g. Do not use global state, Do not ignore exceptions',
    value: 'Do not introduce unrequested dependencies, Do not delete tests'
  });
  if (boundariesDontRaw === undefined) return;

  const dos = boundariesDoRaw.split(',').map(s => s.trim()).filter(Boolean);
  const donts = boundariesDontRaw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = createCustomAgentScaffold(cleanId, role.trim(), directives.trim(), dos, donts, targetDir);

    const action = await vscode.window.showInformationMessage(
      `🎉 Custom Agent "${role.trim()}" (\`${cleanId}\`) successfully registered!`,
      '🚀 Deploy with this Agent',
      '📖 View Agent Template'
    );

    if (onCreated) onCreated();

    if (action === '🚀 Deploy with this Agent') {
      vscode.commands.executeCommand('jules.deployWithAgent', { agent: { id: cleanId, name: role.trim() } });
    } else if (action === '📖 View Agent Template') {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(res.agentFile));
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to create custom agent: ${err.message}`);
  }
}
