## 29-09-2026 - Deprecation of Sentrux for type verification
**Discovery:** The 'sentrux' linting package is not available (returns 404 from npm registry), causing the project's 'verify' script to fail.
**Analysis:** Running a codebase validation script with non-existent dependencies blocks developers from correctly verifying code before committing.
**Action:** Use native tools 'npx tsc --noEmit' and 'npm run test' instead of 'sentrux' for static typing and test verification in the package.json hooks.
