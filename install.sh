#!/usr/bin/env bash
set -e

# Jules-Companion One-Line Installer Script
# Usage: curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash

echo "🚀 Installing Jules-Companion AI Skill globally..."

GLOBAL_SKILLS_DIR="${HOME}/.gemini/config/skills"
TARGET_DIR="${GLOBAL_SKILLS_DIR}/jules-companion"

mkdir -p "${GLOBAL_SKILLS_DIR}"

if [ -d "${TARGET_DIR}" ] && [ -d "${TARGET_DIR}/.git" ]; then
  echo "📦 Existing installation found at ${TARGET_DIR}. Updating repository..."
  cd "${TARGET_DIR}"
  git pull origin main
else
  echo "📥 Cloning Jules-Companion from GitHub..."
  rm -rf "${TARGET_DIR}"
  git clone https://github.com/rivadmorin/Jules-Companion.git "${TARGET_DIR}"
  cd "${TARGET_DIR}"
fi

echo "⚙️ Installing dependencies..."
npm install --silent

echo "🔧 Compiling TypeScript to JavaScript..."
npm run build --silent

echo "⚡ Generating Agent Registry & verifying setup..."
node dist/generate_registry.js
node dist/setup.js

echo "🔗 Creating global command shortcut alias..."
mkdir -p "$HOME/.local/bin"
cat << 'EOF' > "$HOME/.local/bin/jules-companion"
#!/usr/bin/env bash
if command -v bun &> /dev/null; then
  bun "$HOME/.gemini/config/skills/jules-companion/dist/jules_menu.js" "$@"
elif [ -f "$HOME/.bun/bin/bun" ]; then
  "$HOME/.bun/bin/bun" "$HOME/.gemini/config/skills/jules-companion/dist/jules_menu.js" "$@"
else
  node "$HOME/.gemini/config/skills/jules-companion/dist/jules_menu.js" "$@"
fi
EOF
chmod +x "$HOME/.local/bin/jules-companion"

echo ""
echo "✅ Jules-Companion skill successfully installed globally!"
echo "📍 Location: ${TARGET_DIR}"
echo "💡 You can now invoke the interactive menu from any directory by typing: jules-companion"
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo "⚠️ Note: Please add '$HOME/.local/bin' to your system PATH to run the shortcut globally."
fi
