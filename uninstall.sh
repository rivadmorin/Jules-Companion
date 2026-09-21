#!/usr/bin/env bash
set -e

echo "🧹 Uninstalling Jules Companion..."
rm -rf "$HOME/.gemini/config/skills/jules-companion"
rm -rf "$HOME/.gemini/antigravity-ide/mcp/jules-companion"

echo "✅ Jules Companion removed successfully."
echo "👉 Remember to remove the 'jules-companion' entry from your mcp_config.json."
