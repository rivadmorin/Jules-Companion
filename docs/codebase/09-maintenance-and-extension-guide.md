# 09 - Maintenance & Extension Developer Guide
**Developer Playbook for Long-Term Maintenance and Stable Development**

---

## 1. Guiding Principles

To keep the Jules Companion codebase clean, maintainable, and regression-free over the long term, all contributors should adhere to these core pillars:

1. **[Ponytail](https://github.com/DietrichGebert/ponytail) Mindset (Lazy Senior Developer)**:
   - Avoid speculative abstractions or premature boilerplate (*You Aren't Gonna Need It - YAGNI*).
   - Prefer Node.js standard library modules (`node:fs`, `node:path`, `node:https`, `child_process`) over adding external npm dependencies.
   - Fix root causes rather than patching symptoms.
   - Enforce the shortest working diff on every edit.
2. **[Sentrux](https://github.com/sentrux/sentrux) Architectural Governance**:
   - Maintain 6-tier downward dependency flow with 0 circular dependencies (`max_cycles = 0`).
   - Run `npm run sentrux:check` before submitting PRs.
3. **100% TSDoc / JSDoc Coverage**:
   - Every exported symbol (`export function`, `export class`, `export interface`, `export type`) must include a complete TSDoc comment block with `@param`, `@returns`, and descriptive documentation.
   - Enforced automatically by `tests/doc_coverage.test.ts`.
4. **Zero Regression Policy**:
   - Every modification must pass the full test suite (`npm test`) with a 100% pass rate.
5. **Security & State Isolation**:
   - Never commit sensitive keys or hardcode environment paths into source control.
   - State file writes must be atomic to prevent concurrency corruption.

---

## 2. Extending the Platform

### 2.1. Adding a New VS Code Command

1. **Register in [`package.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/package.json)**:
   - Add to `activationEvents`: `"onCommand:jules.myNewCommand"`.
   - Add to `contributes.commands`:
     ```json
     {
       "command": "jules.myNewCommand",
       "title": "My New Command Title",
       "icon": "$(gear)"
     }
     ```
   - (Optional) Add to `contributes.menus` (`view/title` or `view/item/context`) for sidebar placement.
2. **Implement Handler in [`scripts/extension.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/extension.ts)**:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('jules.myNewCommand', async (item?: any) => {
       // Command implementation logic...
     })
   );
   ```
3. **Write Unit Test**:
   - Add verification tests in the appropriate file in `tests/`.

---

### 2.2. Adding a New Tool to the MCP Server

1. **Implement Tool Handler**:
   - Open the target tool group in `scripts/mcp/tools/`:
     - `session_tools.ts` for session workflows.
     - `agent_tools.ts` for agent discovery.
     - `system_tools.ts` for environment utilities.
2. **Register in [`scripts/mcp/registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/registry.ts)**:
   ```typescript
   this.registerTool({
     name: 'my_new_tool',
     description: 'Clear description explaining the tool capability to an LLM.',
     inputSchema: {
       type: 'object',
       properties: {
         targetDir: { type: 'string', description: 'Target workspace directory' }
       },
       required: []
     },
     handler: async (args) => {
       // Execute logic and return structured result
       return { success: true, result: '...' };
     }
   });
   ```
3. **Verify**:
   - Run `npm test` to ensure tool counts and schemas pass in `tests/mcp.test.ts`.

---

### 2.3. Adding a New Specialist Agent

1. **Create Template Markdown File**:
   - Add a new file at `references/agents/{agent_name}.md`.
   - Provide standard YAML frontmatter:
     ```markdown
     ---
     name: Specialized Name
     role: specialized_role
     group: Coding | Advisory | DevOps | Architecture | Testing | System
     description: Concise summary of agent domain expertise.
     ---
     # Agent Persona: Specialized Name
     ...
     ```
2. **Compile Catalog**:
   - Run `npm run registry`.
   - `references/agents/registry.json` will be automatically updated and sorted.
3. **Verify**:
   - Run `npm test` to verify `tests/generate_registry.test.ts` and `tests/doc_coverage.test.ts`.

---

## 3. Testing & Verification Lifecycle

Before committing and packaging releases, run the full verification pipeline:

```bash
# 1. Compile TypeScript to dist/ and sync registry
npm run build

# 2. Run full unit test suite (108 tests across 35 suites in headless mode)
npm test

# 3. Package extension into VSIX archive
npm run package
```

### Essential Test Suites:
- **`tests/doc_coverage.test.ts`**: Audits 100% of exported TypeScript symbols across `scripts/**/*.ts` to ensure complete documentation tags.
- **`tests/scheduler.test.ts`**: Tests scheduled task persistence, due evaluation, cancellation, and execution.
- **`tests/mission_control.test.ts`**: Validates CSP compliance, event delegation, and plan approval vs user feedback banner separation.
- **`tests/sessions_provider.test.ts`**: Tests TreeView generation and universal session ID resolution.
- **`scripts/build.js` & CI Pipeline**: Cross-platform Node compilation and GitHub Actions matrix tests ([`.github/workflows/ci.yml`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/.github/workflows/ci.yml)) across Ubuntu & Windows.

---

## 4. Extension Distribution & Installation

Once `jules-companion-1.0.1.vsix` is built:

### A. Local Development Direct Sync:
Copy `dist/` and `package.json` directly into your IDE extensions folder:
- **VS Code**: `C:\Users\<User>\.vscode\extensions\rivadmorin.jules-companion-1.0.1`
- **Antigravity IDE**: `C:\Users\<User>\.antigravity-ide\extensions\rivadmorin.jules-companion-1.0.1`

### B. VSIX Installation via GUI:
1. Open VS Code or Antigravity IDE.
2. Go to **Extensions** panel (`Ctrl+Shift+X`).
3. Click the `...` menu in the upper-right corner of the Extensions panel.
4. Select **Install from VSIX...**.
5. Choose `jules-companion-1.0.1.vsix`.

---

## 5. Troubleshooting & Debugging

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| API requests return `401 Unauthorized` | Google Jules API key is missing or invalid. | Run `Jules: Set API Key` (`jules.setApiKey`) or check `JULES_API_KEY` environment variable. |
| Safety Gate rejects merge | Cloud session is not `SUCCEEDED` or local working tree is dirty. | Wait for Jules to complete on web console, or commit/stash local changes before merging. |
| Mission Control buttons unresponsive | CSP violation caused by inline script or onclick handler. | Ensure all clickable elements use `data-action="..."` handled by centralized delegation in `mission_control.ts`. |
| Scheduled tasks not running at target time | LiveSync polling is disabled. | Turn on LiveSync (check `$(sync) Jules Sync` status bar or run `jules.toggleLiveSync`). |
