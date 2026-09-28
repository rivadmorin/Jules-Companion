/**
 * Interactive Git Commit & Push Assistant.
 * Simplifies conventional commits and automatic pushing to GitHub.
 *
 * Usage: npm run ship
 */

const { execSync } = require('child_process');
const readline = require('readline');

function run(cmd, inherit = false) {
  try {
    const res = execSync(cmd, { stdio: inherit ? 'inherit' : 'pipe', encoding: 'utf8' });
    return (res && typeof res === 'string') ? res.trim() : '';
  } catch (err) {
    if (!inherit) {
      throw new Error(err.stderr || err.message);
    }
    throw err;
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('       🚀 JULES COMPANION — FAST COMMIT & PUSH 🚀            ');
  console.log('============================================================\n');

  // 1. Check working directory status
  const status = run('git status --short');
  if (!status) {
    console.log('✨ Working tree is completely clean! No changes to commit.\n');
    process.exit(0);
  }

  console.log('📋 Changed files:\n' + status + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (q) => new Promise(res => rl.question(q, res));

  // 2. Select Commit Type
  console.log('Select Commit Type:');
  console.log('  1) feat     - New feature or new specialist agent');
  console.log('  2) fix      - Bug fix or patch');
  console.log('  3) docs     - Documentation, README, or agent prompt update');
  console.log('  4) refactor - Code refactoring or architecture decoupling');
  console.log('  5) test     - Adding or updating test cases');
  console.log('  6) chore    - Build scripts, dependencies, or maintenance');

  const typeChoice = (await prompt('\nEnter choice (1-6) [default: 1]: ')).trim() || '1';
  const typeMap = {
    '1': 'feat',
    '2': 'fix',
    '3': 'docs',
    '4': 'refactor',
    '5': 'test',
    '6': 'chore'
  };
  const commitType = typeMap[typeChoice] || 'feat';

  // 3. Commit Scope (optional)
  const scope = (await prompt('Enter scope (e.g. extension, mcp, scheduler, ui) [optional]: ')).trim();

  // 4. Commit Message
  let message = '';
  while (!message) {
    message = (await prompt('Enter commit summary message: ')).trim();
    if (!message) {
      console.log('⚠️ Commit message cannot be empty!');
    }
  }

  rl.close();

  const formattedCommit = scope ? `${commitType}(${scope}): ${message}` : `${commitType}: ${message}`;

  console.log(`\n📦 Staging changes and committing: "${formattedCommit}"...`);
  run('git add .', true);
  run(`git commit -m "${formattedCommit}"`, true);
  console.log('✅ Commit successful!');

  // 5. Ask to push
  const currentBranch = run('git branch --show-current') || 'main';
  console.log(`\n🚀 Pushing to remote branch "${currentBranch}"...`);
  try {
    run(`git push origin ${currentBranch}`, true);
    console.log('\n🎉 Successfully pushed to GitHub!\n');
  } catch (err) {
    console.error('\n⚠️ Push failed or remote not configured:', err.message);
  }
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
