#!/bin/bash
# auto_process.sh
# Automate plan approvals and feedback replies for Jules remote sessions.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/auto_process.js"
