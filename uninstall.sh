#!/usr/bin/env bash
set -e

# Jules-Companion One-Line Uninstaller Script
# Usage: curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash

echo "㏬️ Uninstalling Jules-Companion AI Skill globally..."

GLOBAL_SKILLS_DIR="${HOME}/.gemini/config/skills"
TARGET_DIR="${GLOBAL_SKILLS_DIR}/jules-companion"
BIN_DIR="${HOME}/.local/bin"
BIN_FILE="${BIN_DIR}/jules-companion"

if [ -d "${TARGET_DIR}" ]; then
  echo "🧽 Removing directory: ${TARGET_DIR}"
  rm -rf "${TARGET_DIR}"
else
  echo "℧️ Directory ${TARGET_DIR} not found."
fi

if [ -f "${BIN_FILE}" ]; then
  echo "🧽 Removing executable shortcut: ${BIN_FILE}"
  rm -f "${BIN_FILE}"
else
  echo "℧️ Executable shortcut ${BIN_FILE} not found."
fi

echo "✅ ️ Jules-Companion skill successfully uninstalled!"
