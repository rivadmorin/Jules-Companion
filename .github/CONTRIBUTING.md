# Contributing to Jules Companion 🐙

Thank you for your interest in contributing to **Jules Companion**! We welcome contributions to our 44 specialist agents, MCP tools, VS Code extension, and core workflow engines.

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rivadmorin/Jules-Companion.git
   cd Jules-Companion
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build TypeScript entrypoints & sync local IDE skills**:
   ```bash
   npm run build
   ```

4. **Run the comprehensive unit test suite**:
   ```bash
   npm test
   ```

5. **Package the extension as `.vsix`**:
   ```bash
   npm run package
   ```

---

## 🚀 Easy Workflows for Commit, Push & Release

We provide automated helper scripts to make shipping changes effortless:

- **Quick Commit & Push**:
  ```bash
  npm run ship
  ```
  Interactively prompts for commit type (`feat`, `fix`, `docs`, etc.), stages changes, creates a Conventional Commit, and pushes to GitHub.

- **Automated Version Release**:
  ```bash
  npm run release
  ```
  Runs pre-flight tests, updates version in `package.json`, logs release in `changelog.md`, builds `.vsix`, creates git tags, and triggers GitHub CI/CD releases.

---

## 📋 Coding Conventions & Guidelines

1. **Architecture & Decoupling**:
   - Keep circular dependencies at **0** (verified via architectural checks).
   - Core engines (`scripts/core/`) should never directly depend on top-level CLI scripts (`scripts/deploy_session.ts`). Use interface callbacks instead.
2. **Specialist Agents**:
   - Agent prompts are located in `references/agents/<agent_name>.md`.
   - Any agent added must be registered in `scripts/generate_registry.ts` and updated in `references/agents/registry.json`.
3. **Docstring Quality**:
   - Every exported module, class, interface, and function must include accurate JSDoc/TSDoc comments with `@param` and `@returns`.
4. **Codebase Knowledge Graph (Graphify)**:
   - Explore the architecture, god nodes, and relationships via `graphify query "<question>"` or open `graphify-out/graph.html` in your browser.
   - Keep the graph synchronized with `npm run graphify:update` (git post-commit hook handles AST updates automatically).

---

## 🤝 Submitting a Pull Request

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Verify all 117+ unit tests pass before opening a PR:
   ```bash
   npm test
   ```
3. Open a Pull Request on GitHub and fill out the provided PR template.
