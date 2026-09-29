const fs = require('fs');
const path = require('path');

const hookDir = path.resolve(__dirname, '..', '.git', 'hooks');
const hookFile = path.join(hookDir, 'pre-commit');

if (!fs.existsSync(hookDir)) {
  console.log('No .git directory found. Skipping hook installation.');
  process.exit(0);
}

const hookScript = `#!/bin/sh
echo "Running pre-commit hook: verify..."

npm run verify

if [ $? -ne 0 ]; then
  echo "Error: Code verification failed."
  echo "Please fix the type errors or failing tests before committing."
  exit 1
fi
`;

fs.writeFileSync(hookFile, hookScript, { encoding: 'utf8', mode: 0o755 });
console.log('Successfully installed git pre-commit hook.');
