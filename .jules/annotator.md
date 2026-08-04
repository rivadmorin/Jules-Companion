## 03-08-2026 - [Language Consistency]
**Discovery:** While some project documentation (like READMEs) is in Indonesian, inline code comments and JSDocs are expected to remain in English.
**Analysis:** Maintaining a single language for code-level documentation ensures consistency for international developers while keeping end-user docs localized.
**Action:** Always write JSDoc and inline comments in English for this codebase unless explicitly requested otherwise by the user.

## 03-08-2026 - Documenting the TypeScript Tooling Scripts
**Discovery:** I've fully annotated the TypeScript CLI tooling in `scripts/*.ts`. I discovered that the `merge_session.ts` and `deploy_session.ts` logic are intricately linked through their parsing dependencies.
**Analysis:** Adding block documentation explaining that `process.argv` is mutated in `jules_menu.ts` and `mcp_server.ts` to satisfy the parsers in the underlying CLI functions makes it significantly easier to maintain the hybrid CLI/MCP server architecture.
**Action:** When adding documentation for commands exposed through multiple interfaces (CLI vs MCP), always explicitly detail how input parameters are marshaled between the different contexts.
## 04-08-2026 - [Negative Constraints - Redundant Comments]
**Discovery:** My initial code patch was cited in review for violating the "Never do" boundary against adding redundant or obvious comments (e.g., adding a comment exactly describing a line of code when the code is already clear).
**Analysis:** While striving for thoroughness (line-by-line inline annotations), it is essential to balance this against the rule prohibiting redundant comments. Explaining *what* the code is doing is less valuable than explaining *why* it is doing it.
**Action:** When asked to provide line-by-line annotations, focus heavily on business logic, variable intent, and execution consequences, rather than literal translations of code syntax to English. Skip explicitly obvious structural comments (like `// Iterate through each markdown file` immediately before a `for` loop) unless they provide deeper context.
