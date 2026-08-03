import * as fs from 'fs';
import * as path from 'path';

const agentsDir = path.join(__dirname, '..', 'references', 'agents');
const julesDir = path.join(__dirname, '..', '.jules');

function updateAgentFiles() {
  console.log(`Scanning agent prompt files in: ${agentsDir}`);
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

  let updatedCount = 0;
  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let modified = false;

    // 1. Replace YYYY-MM-DD header format with DD-MM-YYYY
    if (content.includes('## YYYY-MM-DD - [Title]')) {
      content = content.replace(/## YYYY-MM-DD - \[Title\]/g, '## DD-MM-YYYY - [Title]');
      modified = true;
    }

    // 2. Add Critical Journal Rules if not already present
    if (!content.includes('CRITICAL JOURNAL PRESERVATION & DATE RULES')) {
      const rulesBlock = `

⚠️ CRITICAL JOURNAL PRESERVATION & DATE RULES:
- ALWAYS APPEND new entries to the end of \`.jules/<agent>.md\`. NEVER delete, clear, replace, or overwrite existing journal entries.
- ALWAYS use the exact date format \`DD-MM-YYYY\` (e.g. 03-08-2026) using today's actual system date provided in the session context. NEVER guess or hallucinate past dates.`;

      // Insert right after the markdown codeblock containing ## DD-MM-YYYY - [Title]
      if (content.includes('## DD-MM-YYYY - [Title]')) {
        content = content.replace(/(## DD-MM-YYYY - \[Title\][\s\S]*?```)/, `$1${rulesBlock}`);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} agent prompt files.`);
}

function updateJulesJournalFiles() {
  if (!fs.existsSync(julesDir)) {
    console.log(`No .jules directory found at ${julesDir}`);
    return;
  }

  console.log(`Scanning existing journal files in: ${julesDir}`);
  const files = fs.readdirSync(julesDir).filter(f => f.endsWith('.md'));

  let updatedCount = 0;
  for (const file of files) {
    const filePath = path.join(julesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace dates in format YYYY-MM-DD (e.g. 2024-05-18) to DD-MM-YYYY (e.g. 18-05-2024)
    const dateRegex = /##\s+(\d{4})-(\d{2})-(\d{2})/g;
    if (dateRegex.test(content)) {
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
