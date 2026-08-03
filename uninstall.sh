#!/usr/bin/env bash
set -e

# Jules-Companion One-Line Uninstaller Script
# Usage: curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash

echo "Uninstalling Jules-Companion AI Skill globally..."

GLOBAL_SKILLS_DIR="${HOME}/.gemini/config/skills"
TARGET_DIR="${GLOBAL_SKILLS_DIR}/jules-companion"
BIN_DIR="${HOME}/.local/bin"
BIN_FILE="${BIN_DIR}/jules-companion"

echo "Removing MCP Server registrations..."
node -e "
const fs = require('fs');
const path = require('path');
const home = process.env.HOME || process.env.USERPROFILE;
const paths = [
    path.join(home, '.gemini/config/mcp_config.json'),
    path.join(home, '.gemini/settings.json')
];
paths.forEach(p => {
    if (fs.existsSync(p)) {
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data.mcpServers && data.mcpServers['jules-companion']) {
                delete data.mcpServers['jules-companion'];
                fs.writeFileSync(p, JSON.stringify(data, null, 2));
                console.log('Removed jules-companion from ' + p);
            }
        } catch(e) {}
    }
});
" || true

if [ -d "${TARGET_DIR}" ]; then
  echo "Removing directory: ${TARGET_DIR}"
  rm -rf "${TARGET_DIR}"
else
  echo "Directory ${TARGET_DIR} not found."
fi

if [ -f "${BIN_FILE}" ]; then
  echo "Removing executable shortcut: ${BIN_FILE}"
  rm -f "${BIN_FILE}"
else
  echo "Executable shortcut ${BIN_FILE} not found."
fi

echo "Jules-Companion skill successfully uninstalled!"
