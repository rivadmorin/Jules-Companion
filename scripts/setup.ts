import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync, exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { getProjectDirs } from './utils';
import { generateRegistry } from './generate_registry';

/**
 * Represents the final result and aggregated status of the setup execution.
 * @interface SetupResult
 * @property {string} os - The underlying operating system platform.
 * @property {Record<string, boolean>} dependencies - A mapping of required dependencies to their installation status.
 * @property {boolean} ghAuth - Indicates if the GitHub CLI is authenticated.
 * @property {boolean} gitIdentityOk - Indicates if a valid Git user identity was found or configured.
 * @property {string[]} copiedFiles - A list of reference or agent template files successfully synchronized.
 * @property {boolean} gitignoreUpdated - Indicates if the local .gitignore was patched to ignore internal directories.
 * @property {'SUCCESS' | 'WARNING' | 'ERROR'} status - The overall status of the setup process.
 */
interface SetupResult {
  os: string;
  dependencies: Record<string, boolean>;
  ghAuth: boolean;
  gitIdentityOk: boolean;
  copiedFiles: string[];
  gitignoreUpdated: boolean;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

/**
 * Checks if a specific CLI command exists and is executable in the current environment.
 * Handles cross-platform differences between Unix (`which`) and Windows (`where`).
 *
 * @param {string} cmd - The command to check (e.g., 'git', 'gh').
 * @param {string} osType - The operating system platform identifier (e.g., 'win32', 'linux').
 * @returns {Promise<boolean>} True if the command is available in system PATH, false otherwise.
 */
async function checkCommand(cmd: string, osType: string): Promise<boolean> {
  // Determine the correct path resolution command based on the operating system
  const checkCmd = osType === 'win32' ? 'where' : 'which';
  try {
    // Attempt to execute the resolution command
    await execAsync(`${checkCmd} ${cmd}`);
    // If successful, the command exists in the environment
    return true;
  } catch {
    // If the execution throws, the command is missing or inaccessible
    return false;
  }
}

/**
 * Verifies if the GitHub CLI (gh) is authenticated.
 * This is required for creating Pull Requests or interacting with GitHub APIs.
 *
 * @returns {Promise<boolean>} True if authenticated, false otherwise.
 */
async function checkGhAuth(): Promise<boolean> {
  try {
    // `gh auth status` exits with code 0 if authenticated, non-zero otherwise
    // We run it and wait for its completion to confirm authentication status
    await execAsync('gh auth status');
    // Authentication successful
    return true;
  } catch {
    // Command failed, which means the user is not authenticated
    return false;
  }
}

/**
 * Ensures that a Git user identity (name and email) is configured.
 * Sets a local fallback identity ("Jules Companion") if missing and the context is within a Git repository.
 * This is crucial because `git commit` will fail fatally without an identity configured.
 *
 * @returns {Promise<boolean>} True if identity is verified or successfully configured, false on failure.
 */
async function ensureGitIdentity(): Promise<boolean> {
  try {
    // Check if we are actually inside a Git workspace before attempting to set local configs
    try { 
      // This command will exit cleanly if we are in a valid git tree
      await execAsync('git rev-parse --is-inside-work-tree'); 
    } catch {
      // If we aren't in a git repository, configuring local identity is unnecessary
      console.log('  - Git Identity: Skipped (Not inside a Git repository)');
      return true; // Not a failure condition if we aren't in a git repo
    }

    // Check existing global or local configuration by safely catching errors
    const checkName = execAsync('git config user.name').catch(() => null);
    const checkEmail = execAsync('git config user.email').catch(() => null);
    
    // Resolve both configuration checks concurrently for efficiency
    const [nameRes, emailRes] = await Promise.all([checkName, checkEmail]);

    // Validate if either name or email is missing or strictly empty
    if (!nameRes || !nameRes.stdout.trim() || !emailRes || !emailRes.stdout.trim()) {
      console.log('  - Git Identity: Configuring local fallback identity...');
      
      // Apply local fallback identity specifically for automated commits without polluting global config
      const setLocalName = execAsync('git config --local user.name "Jules Companion"');
      const setLocalEmail = execAsync('git config --local user.email "agent@jules.local"');
      
      // Await both local configuration updates concurrently
      await Promise.all([setLocalName, setLocalEmail]);
      
      // Assume success if no errors were thrown during setting
      return true;
    }

    // Both user.name and user.email exist and are non-empty
    console.log('  - Git Identity: Verified ✓');
    return true;
  } catch (err: any) {
    // A broader failure occurred (e.g., git is completely broken or filesystem issues)
    console.warn(`  - Git Identity: Failed to check/set: ${err.message}`);
    return false;
  }
}

/**
 * Executes the self-healing environment setup process for Jules Companion.
 * Validates dependencies, ensures directory structures, syncs reference files, and generates the agent registry.
 *
 * @param {string} targetDir - The root project directory to set up (defaults to process.cwd()).
 * @returns {Promise<SetupResult>} An object containing the setup status and verification results.
 */
export async function runSetup(targetDir: string = process.cwd()): Promise<SetupResult> {
  // Output a clear header to indicate the setup process is starting
  console.log('=== Jules-Companion Self-Healing Environment Setup ===');

  // Detect the underlying operating system
  const osType = process.platform;
  console.log(`OS Detected: ${osType} (${process.arch})`);

  // 1. Dependency checks
  // Define the core dependencies required for Jules to function properly
  const deps = ['git', 'gh', 'node', 'jules'];
  // Initialize a status mapping to track which dependencies are available
  const depStatus: Record<string, boolean> = {};

  // Map each dependency to a concurrent check promise
  const depChecks = deps.map(async (dep) => {
    // Verify existence of the CLI tool
    const ok = await checkCommand(dep, osType);
    return { dep, ok };
  });
  
  // Wait for all dependency checks to resolve simultaneously
  const results = await Promise.all(depChecks);

  // Iterate through the resolved checks to populate the status record and log output
  for (const { dep, ok } of results) {
    // Store the binary status of the dependency
    depStatus[dep] = ok;
    // Format a visual indicator for console output
    const icon = ok ? '✓' : '⚠️ Missing';
    console.log(`  - ${dep.padEnd(10)}: ${icon}`);
  }

  // 2. Auth & Identity checks
  console.log('Checking Authentication & Git Identity...');
  // Check both GitHub auth and Git identity concurrently
  const [ghAuth, gitIdentityOk] = await Promise.all([checkGhAuth(), ensureGitIdentity()]);
  console.log(`  - GitHub Auth : ${ghAuth ? 'Logged In ✓' : '⚠️ Not Logged In'}`);


  // 3. Project directories setup via utils
  // Ensure the internal state and artifact directories are instantiated
  // Resolve standard directories using the provided target root
  const dirs = getProjectDirs(targetDir);
  // Specifically map the reports output directory
  const docsReportsDir = path.join(targetDir, 'docs', 'jules-reports');
  
  // Iterate through all necessary directories and create them if they are missing
  [dirs.julesDir, dirs.refDir, dirs.agentsDir, dirs.scratchDir, dirs.docsReviewsDir, docsReportsDir].forEach(dir => {
    // Use synchronous check to prevent concurrent folder creation conflicts
    if (!fs.existsSync(dir)) {
      // Create directories recursively, meaning parent folders are also generated if needed
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 4. Find source references directory (Global or Local Package root)
  // This supports both global installation (`npm install -g`) and local repository execution
  const homeDir = os.homedir();
  // Provide potential paths where the reference templates might reside
  const candidateGlobalRoots = [
    path.join(homeDir, '.gemini', 'config', 'skills', 'jules-companion'), // Standard Antigravity global skill path
    path.join(__dirname, '..') // Local development path (one level above 'scripts/')
  ];

  // Attempt to locate a valid references directory
  let sourceRefDir: string | null = null;
  for (const root of candidateGlobalRoots) {
    // Construct the expected sub-path for references
    const p = path.join(root, 'references');
    // If the path exists on disk, assume it's the valid source directory
    if (fs.existsSync(p)) {
      sourceRefDir = p;
      // Stop searching once a valid path is found
      break;
    }
  }

  // Track the list of files that were successfully synchronized
  const copiedFiles: string[] = [];

  if (sourceRefDir) {
    // Copy top-level reference framework files to local project staging area
    const filesToCopy = ['jules-cli.md', 'jules-api.md', 'prompt-templates.md'];
    for (const file of filesToCopy) {
      // Define exact source and destination paths
      const src = path.join(sourceRefDir, file);
      const dest = path.join(dirs.refDir, file);
      // Ensure the source file actually exists before copying
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        copiedFiles.push(file); // Log the copied file
      }
    }

    // Recursively sync agent Markdown templates to local project for customization capabilities
    const sourceAgentsDir = path.join(sourceRefDir, 'agents');
    // Validate the agents subdirectory exists
    if (fs.existsSync(sourceAgentsDir)) {
      // Read all file names in the source agents directory
      const agentFiles = fs.readdirSync(sourceAgentsDir);
      for (const af of agentFiles) {
        // Construct exact source and destination paths for each agent
        const src = path.join(sourceAgentsDir, af);
        const dest = path.join(dirs.agentsDir, af);
        // Ensure we are only copying actual files and ignoring subdirectories
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
          copiedFiles.push(`agents/${af}`); // Log the copied agent file
        }
      }
    }
    console.log(`Self-healing copy completed: ${copiedFiles.length} reference files synchronized.`);
  } else {
    // Log a warning if no template directories were found across the candidates
    console.warn('Warning: Global reference templates not found for self-healing copy.');
  }

  // 5. Update .gitignore
  // Automatically inject `.jules-companion/` into the gitignore to prevent committing internal tool state
  let gitignoreUpdated = false;
  // Determine the target gitignore path in the project root
  const gitignorePath = path.join(targetDir, '.gitignore');
  const entry = '.jules-companion/';

  // Read existing gitignore contents safely if the file exists
  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  // Verify if the entry has already been added
  if (!gitignoreContent.includes(entry)) {
    // Ensure we start on a new line when appending to the file
    const prefix = gitignoreContent && !gitignoreContent.endsWith('\n') ? '\n' : '';
    // Append the entry directly to the gitignore file
    fs.writeFileSync(gitignorePath, `${gitignoreContent}${prefix}${entry}\n`, 'utf8');
    gitignoreUpdated = true;
    console.log('Added .jules-companion/ to .gitignore.');
  } else {
    // Avoid modifying the file if the rule already exists
    console.log('.jules-companion/ is already present in .gitignore.');
  }

  // 6. Synchronize/Generate Registry
  try {
    // Dynamically reconstruct the agent registry from the markdown template headers
    // This allows the system to recognize newly customized or added agent profiles
    await generateRegistry();
  } catch (err: any) {
    // Handle scenarios where registry generation fails safely without halting setup
    console.warn(`Warning: Could not auto-generate registry during setup: ${err.message}`);
  }

  // 7. Initialize config.json & sessions.json if missing
  // Setup the primary local configuration file
  const configPath = path.join(dirs.julesDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    // Provide a default configuration structure if none exists
    fs.writeFileSync(configPath, JSON.stringify({
      os: osType,
      created: new Date().toISOString(),
      version: "1.0.0"
    }, null, 2), 'utf8');
  }

  // Ensure an empty session state file exists
  const sessionsPath = path.join(dirs.julesDir, 'sessions.json');
  if (!fs.existsSync(sessionsPath)) {
    // Start with an empty JSON array if no previous sessions are found
    fs.writeFileSync(sessionsPath, JSON.stringify([], null, 2), 'utf8');
  }

  // Evaluate final status by verifying critical path tools
  // git, gh and a configured git identity are explicitly required to consider the setup successful
  const allCriticalDepsOk = depStatus['git'] && depStatus['gh'] && gitIdentityOk;
  // If not all critical dependencies are met, gracefully downgrade status to WARNING
  const status: SetupResult['status'] = allCriticalDepsOk ? 'SUCCESS' : 'WARNING';

  console.log(`\nSetup completed with status: [${status}]`);
  
  // Return the aggregated execution object
  return {
    os: osType,
    dependencies: depStatus,
    ghAuth,
    gitIdentityOk,
    copiedFiles,
    gitignoreUpdated,
    status
  };
}

// Execute the runSetup flow automatically when this script is invoked directly
if (require.main === module) {
  // Call the main setup task and catch unhandled promise rejections
  runSetup().catch(err => console.error(err));
}
