import * as fs from 'fs';
import * as path from 'path';

/**
 * Absolute path to the directory containing reference agent markdown prompt files.
 * This is resolved relative to the current script's directory (`__dirname`).
 * @constant {string}
 */
const agentsDir = path.join(__dirname, '..', 'references', 'agents');

/**
 * Absolute path to the local project's `.jules` journal directory where agent execution logs are stored.
 * This is resolved relative to the current script's directory.
 * @constant {string}
 */
const julesDir = path.join(__dirname, '..', '.jules');

/**
 * @function updateAgentFiles
 * @description Scans and updates agent prompt markdown files in the `references/agents` directory.
 * It enforces structural consistency by replacing outdated date formats in headers
 * and injecting mandatory preservation rules for journal entries to prevent historical data loss.
 * @returns {void}
 */
function updateAgentFiles() {
  // Output the target scanning directory for visibility during execution
  console.log(`Scanning agent prompt files in: ${agentsDir}`);
  
  // Read all files in the directory and filter for markdown files only, representing agent definitions
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  // Initialize a counter to track how many files were actually modified during the run
  let updatedCount = 0;
  
  // Iterate through each markdown file found in the agents directory
  for (const file of files) {
    // Construct the full absolute path to the current file being processed
    const filePath = path.join(agentsDir, file);
    
    // Read the entire file content into memory as a UTF-8 encoded string
    let content = fs.readFileSync(filePath, 'utf8');

    // Track whether any transformations were applied to the file's content
    let modified = false;

    // 1. Standardize Header Date Format
    // Check if the file contains the template placeholder for the old YYYY-MM-DD format
    if (content.includes('## YYYY-MM-DD - [Title]')) {
      // Globally replace the old YYYY-MM-DD template placeholder with the new DD-MM-YYYY format
      content = content.replace(/## YYYY-MM-DD - \[Title\]/g, '## DD-MM-YYYY - [Title]');
      // Flag the content as modified so it gets written back to disk
      modified = true;
    }

    // 2. Inject Critical Journal Rules
    // Check if the mandatory preservation rules block is already present in the file content
    if (!content.includes('CRITICAL JOURNAL PRESERVATION & DATE RULES')) {
      // Define the explicit warning and instruction block regarding journal entry preservation
      const rulesBlock = `\n\n⚠️ CRITICAL JOURNAL PRESERVATION & DATE RULES:\n- ALWAYS APPEND new entries to the end of \`.jules/<agent>.md\`. NEVER delete, clear, replace, or overwrite existing journal entries.\n- ALWAYS use the exact date format \`DD-MM-YYYY\` (e.g. 03-08-2026) using today's actual system date provided in the session context. NEVER guess or hallucinate past dates.`;

      // Check if the file contains the expected journal section header to anchor the injection
      if (content.includes('## DD-MM-YYYY - [Title]')) {
        // Use a non-greedy regex capture group to find the journal header and its following code block,
        // then append the critical rules block immediately after it.
        content = content.replace(/(## DD-MM-YYYY - \[Title\][\s\S]*?```)/, `$1${rulesBlock}`);
        // Flag the content as modified so it gets written back to disk
        modified = true;
      }
    }

    // Only perform an expensive filesystem write operation if the content was actually changed
    if (modified) {
      // Overwrite the original file with the newly transformed content
      fs.writeFileSync(filePath, content, 'utf8');
      // Increment the counter to reflect a successful update
      updatedCount++;
    }
  }

  // Report the total number of agent prompt files that were successfully updated
  console.log(`Successfully updated ${updatedCount} agent prompt files.`);
}

/**
 * @function updateJulesJournalFiles
 * @description Scans existing user journal markdown files in the local `.jules` directory and retroactively
 * reformats any incorrect YYYY-MM-DD dates into the expected DD-MM-YYYY standard format.
 * @returns {void}
 */
function updateJulesJournalFiles() {
  // Check if the .jules directory exists to prevent errors on uninitialized repositories
  if (!fs.existsSync(julesDir)) {
    // Inform the user that the directory is missing and gracefully abort the function
    console.log(`No .jules directory found at ${julesDir}`);
    return;
  }

  // Output the target scanning directory for visibility during execution
  console.log(`Scanning existing journal files in: ${julesDir}`);
  
  // Read all files in the directory and filter for markdown files only, representing user journals
  const files = fs.readdirSync(julesDir).filter(f => f.endsWith('.md'));

  // Initialize a counter to track how many files were actually reformatted
  let updatedCount = 0;
  
  // Iterate through each journal file found in the .jules directory
  for (const file of files) {
    // Construct the full absolute path to the current journal file
    const filePath = path.join(julesDir, file);
    
    // Read the entire file content into memory as a UTF-8 encoded string
    let content = fs.readFileSync(filePath, 'utf8');

    // Define a regular expression to find journal entry headers with the old YYYY-MM-DD format.
    // It captures the year (\d{4}), month (\d{2}), and day (\d{2}) into separate groups for easy reassembly.
    const dateRegex = /##\s+(\d{4})-(\d{2})-(\d{2})/g;

    // Test the file content against the regex to see if any reformatting is needed,
    // avoiding unnecessary string replacements and filesystem writes if not.
    if (dateRegex.test(content)) {
      // Execute the replacement, swapping the captured groups to form the new DD-MM-YYYY layout
      content = content.replace(dateRegex, (match, year, month, day) => {
        // Return the reconstructed header string using the captured date components
        return `## ${day}-${month}-${year}`;
      });
      // Overwrite the original journal file with the reformatted content
      fs.writeFileSync(filePath, content, 'utf8');
      // Increment the counter to reflect a successful format update
      updatedCount++;
    }
  }

  // Report the total number of user journal files that were successfully reformatted
  console.log(`Successfully reformatted ${updatedCount} journal files in .jules/`);
}

// Execute the function to process and update all agent prompt template files
updateAgentFiles();
// Execute the function to process and reformat all existing user journal entry files
updateJulesJournalFiles();
