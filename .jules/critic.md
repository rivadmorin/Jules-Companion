# Critic Code Review Learnings

## File: `scripts/jules_client.ts`
- **Issue**: Extraneous read operations on multiple paths for API keys.
- **Recommendation**: Cache results to eliminate redundant filesystem calls.

## File: `scripts/utils.ts`
- **Issue**: Frequent re-allocation and calculation in `getProjectDirs()`.
- **Recommendation**: Use a `Map` cache mapping `targetDir` to `ProjectDirs` for memoization.

## File: `scripts/generate_registry.ts`
- **Issue**: Synchronous and blocking reading/parsing of 30 markdown files inside a loop.
- **Recommendation**: Promisify process and run in parallel with `Promise.all` mapping `fs.promises.readFile`.

## File: `scripts/setup.ts`
- **Issue**: External process executions (`git`, `gh`) block execution due to `spawnSync`.
- **Recommendation**: Wrap with `util.promisify(child_process.exec)` and use `Promise.all` for parallel operations.
