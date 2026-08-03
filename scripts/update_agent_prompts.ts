import * as fs from 'fs';
import * as path from 'path';

const agentsDir = path.join(__dirname, '..', 'references', 'agents');
const julesDir = path.join(__dirname, '..', '.jules');

/**
 * Scans and updates agent prompt markdown files in the `references/agents` directory.
 * Ensures that the date formatting in the journal section strictly follows the DD-MM-YYYY format
 * and that critical preservation rules are appended to prevent accidental deletion of journal history.
 */
function updateAgentFiles() {
  console.log(`Scanning agent prompt files in: ${agentsDir}`);
  // Only process markdown files within the target agents directory
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  let updatedCount = 0;
  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let modified = false;

    // 1. Replace YYYY-MM-DD header format with DD-MM-YYYY
    // This standardizes the expected date format in the journal template block
    if (content.includes('## YYYY-MM-DD - [Title]')) {
      content = content.replace(/## YYYY-MM-DD - \[Title\]/g, '## DD-MM-YYYY - [Title]');
      modified = true;
    }

    // 2. Add Critical Journal Rules if not already present
    // We append explicit instructions to prevent agents from destructively modifying historical journal entries
    if (!content.includes('CRITICAL JOURNAL PRESERVATION & DATE RULES')) {
      const rulesBlock = `\n\n⚠️ CRITICAL JOURNAL PRESERVATION & DATE RULES:\n- ALWAYS APPEND new entries to the end of \`.jules/<agent>.md\`. NEVER delete, clear, replace, or overwrite existing journal entries.\n- ALWAYS use the exact date format \`DD-MM-YYYY\` (e.g. 03-08-2026) using today's actual system date provided in the session context. NEVER guess or hallucinate past dates.`;

      // Insert the critical rules block immediately following the example journal markdown code block.
      // The regex `[\s\S]*?` non-greedily matches any characters (including newlines) until the closing code fence (```).
      if (content.includes('## DD-MM-YYYY - [Title]')) {
        content = content.replace(/(## DD-MM-YYYY - \[Title\][\s\S]*?```)/, `$1${rulesBlock}`);
        modified = true;
      }
    }

    // Only write to the filesystem if a modification actually occurred to avoid unnecessary I/O
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} agent prompt files.`);
}

/**
 * Scans existing user journal markdown files in the local `.jules` directory and retroactively
 * reformats any incorrect YYYY-MM-DD dates into the expected DD-MM-YYYY standard format.
 */
function updateJulesJournalFiles() {
  // Graceful exit if the project hasn't initialized a local .jules directory yet
  if (!fs.existsSync(julesDir)) {
    console.log(`No .jules directory found at ${julesDir}`);
    return;
  }

  console.log(`Scanning existing journal files in: ${julesDir}`);
  // Target only markdown files that could contain journal entries
  const files = fs.readdirSync(julesDir).filter(f => f.endsWith('.md'));

  let updatedCount = 0;
  for (const file of files) {
    const filePath = path.join(julesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to match markdown headers formatted as YYYY-MM-DD (e.g. `## 2024-05-18`)
    // Captures year (\d{4}), month (\d{2}), and day (\d{2}) groups.
    const dateRegex = /##\s+(\d{4})-(\d{2})-(\d{2})/g;

    // Test before attempting replace to potentially skip filesystem write
    if (dateRegex.test(content)) {
      // Re-arrange capture groups to DD-MM-YYYY format
      content = content.replace(dateRegex, (match, year, month, day) => {
        return `## ${day}-${month}-${year}`;
      });
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
    }
  }

  console.log(`Successfully reformatted ${updatedCount} journal files in .jules/`);
}

updateAgentFiles();
updateJulesJournalFiles();
