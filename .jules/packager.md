# Packager Learnings

## Context
When building developer companion tools that expose multiple scripts/workflows, the build process speed is critical for fast iteration by AI agents and humans alike. Additionally, to provide seamless integrations, exposing CLI scripts as direct tools via Model Context Protocol (MCP) drastically improves usability for Large Language Models (LLMs).

## Learnings
*   **Build Optimization (esbuild vs tsc):** Replacing `tsc` (TypeScript compiler) with `esbuild` for transpiling Node scripts reduces build times by over 99% (from ~3.3 seconds to ~17 milliseconds) on small-to-medium CLI tools. This is a crucial improvement when agents need to constantly re-build code during development loops.
*   **CLI to MCP Transition Strategy:** Converting existing CLI-focused TypeScript functions (`deploy_session`, `merge_session`) into MCP tools requires intercepting/redirecting standard input/output.
    *   **Argument Injection:** The CLI scripts use `process.argv`. To reuse them without major refactoring, you must temporarily modify `process.argv` before calling the core function, and restore it afterward.
    *   **Output Capture:** The CLI scripts use `console.log` heavily to display information to the user. MCP tools expect returned strings. A `captureOutput` wrapper that temporarily overrides `console.log` and `console.error` is an effective strategy to pipe CLI output into an MCP tool response.
*   **MCP Server Transport:** For local AI integrations (like Claude Desktop or Cursor), the `StdioServerTransport` is the standard and most reliable method for hosting an MCP server.
