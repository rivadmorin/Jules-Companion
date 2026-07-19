#!/bin/bash
# check_sessions.sh
# Check the status of launched Jules sessions.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/../dist/jules_client.js" list

echo ""
echo "=== CHECKING GITHUB PRS ==="
GITHUB_TOKEN="" gh pr list
