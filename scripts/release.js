/**
 * Automated Release & GitHub CI/CD Deployment Orchestrator.
 *
 * Runs tests -> Bumps version -> Updates changelog -> Builds & Packages VSIX
 * -> Creates Git Tag -> Pushes to GitHub -> Triggers GitHub Actions Release.
 *
 * Usage:
 *   npm run release
 *   node scripts/release.js --patch
 *   node scripts/release.js --minor
 *   node scripts/release.js --major
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'changelog.md');

function run(cmd, inherit = false) {
  try {
    const res = execSync(cmd, { cwd: rootDir, stdio: inherit ? 'inherit' : 'pipe', encoding: 'utf8' });
    return (res && typeof res === 'string') ? res.trim() : '';
  } catch (err) {
    if (!inherit) {
      throw new Error(err.stderr || err.message);
    }
    throw err;
  }
}

function parseSemVer(v) {
  const parts = v.split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function formatSemVer({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

async function main() {
  console.log('\n============================================================');
  console.log('       🏷️  JULES COMPANION — RELEASE AUTOMATION 🏷️          ');
  console.log('============================================================\n');

  // 1. Run Pre-flight Tests
  console.log('[1/6] 🧪 Running test suite verification (npm test)...');
  try {
    run('npm test', true);
    console.log('✅ All unit tests passed cleanly!\n');
  } catch (err) {
    console.error('\n❌ Tests failed! Cannot release with failing tests.');
    process.exit(1);
  }

  // 2. Read Current Version
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '1.0.0';
  const sem = parseSemVer(currentVersion);

  const nextPatch = formatSemVer({ ...sem, patch: sem.patch + 1 });
  const nextMinor = formatSemVer({ major: sem.major, minor: sem.minor + 1, patch: 0 });
  const nextMajor = formatSemVer({ major: sem.major + 1, minor: 0, patch: 0 });

  // Check CLI arguments
  const args = process.argv.slice(2);
  let targetVersion = null;

  if (args.includes('--patch')) targetVersion = nextPatch;
  else if (args.includes('--minor')) targetVersion = nextMinor;
  else if (args.includes('--major')) targetVersion = nextMajor;
  else {
    const customIdx = args.indexOf('--version');
    if (customIdx !== -1 && args[customIdx + 1]) {
      targetVersion = args[customIdx + 1];
    }
  }

  let releaseNotes = null;
  const notesIdx = args.indexOf('--notes');
  if (notesIdx !== -1 && args[notesIdx + 1]) {
    releaseNotes = args[notesIdx + 1];
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const prompt = (q) => new Promise(res => rl.question(q, res));

  if (!targetVersion) {
    console.log(`Current version: v${currentVersion}\n`);
    console.log('Select release bump type:');
    console.log(`  1) Patch: v${nextPatch} (bug fixes, small tweaks)`);
    console.log(`  2) Minor: v${nextMinor} (new features, new agents)`);
    console.log(`  3) Major: v${nextMajor} (breaking changes, major overhaul)`);
    console.log('  4) Custom version');

    const choice = (await prompt('\nEnter choice (1-4) [default: 1]: ')).trim() || '1';
    if (choice === '1') targetVersion = nextPatch;
    else if (choice === '2') targetVersion = nextMinor;
    else if (choice === '3') targetVersion = nextMajor;
    else if (choice === '4') {
      targetVersion = (await prompt('Enter custom semver version (e.g. 1.2.0): ')).trim();
    } else {
      targetVersion = nextPatch;
    }
  }

  console.log(`\nTarget Release Version: v${targetVersion}`);

  // 3. Prompt for Release Summary
  if (!releaseNotes) {
    releaseNotes = (await prompt('Enter release summary notes (e.g. Added 1-click installer and GitHub CI/CD): ')).trim() || 'Maintenance release and performance enhancements.';
  }
  rl.close();

  // 4. Update package.json
  console.log('\n[2/6] 📝 Updating package.json...');
  pkg.version = targetVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`✅ Updated package.json version to ${targetVersion}`);

  // 5. Update changelog.md
  console.log('\n[3/6] 📜 Updating changelog.md...');
  const today = new Date().toISOString().split('T')[0];
  const newChangelogEntry = `## [${targetVersion}] - ${today}\n\n### 🚀 Highlights\n- ${releaseNotes}\n\n---\n\n`;

  if (fs.existsSync(changelogPath)) {
    let changelogContent = fs.readFileSync(changelogPath, 'utf8');
    const firstSectionIdx = changelogContent.indexOf('## [');
    if (firstSectionIdx !== -1) {
      changelogContent = changelogContent.slice(0, firstSectionIdx) + newChangelogEntry + changelogContent.slice(firstSectionIdx);
    } else {
      changelogContent += '\n\n' + newChangelogEntry;
    }
    fs.writeFileSync(changelogPath, changelogContent, 'utf8');
    console.log('✅ Updated changelog.md with release notes');
  }

  // 6. Build and Package VSIX
  console.log('\n[4/6] 🔨 Building TypeScript and packaging VSIX extension...');
  run('npm run build', true);
  run('npm run package', true);
  console.log('✅ Extension built and packaged successfully!');

  // 7. Git Commit & Tag
  console.log('\n[5/6] 📦 Committing release and creating Git tag...');
  run('git add .', true);
  run(`git commit -m "chore(release): v${targetVersion} - ${releaseNotes}"`, true);

  const tagName = `v${targetVersion}`;
  try {
    run(`git tag -a ${tagName} -m "Release ${tagName}"`, true);
    console.log(`✅ Created Git tag ${tagName}`);
  } catch (err) {
    console.warn(`⚠️ Tag ${tagName} already exists or failed to create: ${err.message}`);
  }

  // 8. Push to GitHub
  console.log('\n[6/6] 🚀 Pushing to GitHub and triggering CI/CD release workflow...');
  const currentBranch = run('git branch --show-current') || 'main';
  try {
    run(`git push origin ${currentBranch} --tags`, true);
    console.log('\n============================================================');
    console.log(`  🎉 RELEASE v${targetVersion} SUCCESSFULLY PUBLISHED! 🎉`);
    console.log('============================================================');
    console.log('GitHub Actions will now automatically:');
    console.log('1. Run the CI build and test matrix.');
    console.log(`2. Create the official GitHub Release for ${tagName}.`);
    console.log(`3. Upload jules-companion-${targetVersion}.vsix to the GitHub Release assets!\n`);
  } catch (err) {
    console.error('\n⚠️ Push failed. Please run manually:');
    console.log(`git push origin ${currentBranch} --tags\n`);
  }
}

main().catch(err => {
  console.error('\n❌ Release failed:', err.message);
  process.exit(1);
});
