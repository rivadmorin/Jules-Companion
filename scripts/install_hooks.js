/**
 * Git Pre-Commit Hook & Graphify Integration Installer.
 * @module scripts/install_hooks
 * @description Installs the local Git pre-commit verification hook and configures
 * the Graphify post-commit hook and merge driver for AST knowledge graph sync.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Resolve .git/hooks directory path
const hookDir = path.resolve(__dirname, '..', '.git', 'hooks');
const hookFile = path.join(hookDir, 'pre-commit');

// 2. Guard: verify that git repository exists
if (!fs.existsSync(hookDir)) {
  console.log('No .git directory found. Skipping hook installation.');
  process.exit(0);
}

// 3. Define shell script executing full verification prior to any commit
const hookScript = `#!/bin/sh
# Automated Jules Companion Pre-Commit Verification Gate
echo "Running pre-commit hook: verify..."

# Execute TypeScript typecheck and full test suite
npm run verify

# Abort commit if any errors or test regressions are detected
if [ $? -ne 0 ]; then
  echo "Error: Code verification failed."
  echo "Please fix the type errors or failing tests before committing."
  exit 1
fi
`;

// 4. Write executable hook script with POSIX 0o755 permissions
fs.writeFileSync(hookFile, hookScript, { encoding: 'utf8', mode: 0o755 });
console.log('Successfully installed git pre-commit hook.');

// 5. Attempt Graphify hook and merge driver registration if graphify CLI is available
try {
  execSync('graphify hook install', { stdio: 'ignore' });
  console.log('Successfully configured graphify post-commit hook and merge driver.');
} catch {
  // Graphify CLI may not be installed globally; continue gracefully
}
