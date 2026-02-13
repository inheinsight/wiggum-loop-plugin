#!/bin/bash
# Scaffold helper — copies template files to target directory
# Called by the wiggum-scaffold command

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="${1:-wiggum-harness}"
TARGET_DIR="${2:-$(pwd)/harness}"

echo "Creating Wiggum Loop harness at $TARGET_DIR..."

mkdir -p "$TARGET_DIR/project" "$TARGET_DIR/logs"

for f in wiggum-loop.ts hooks.ts logger.ts prompts.ts run.sh package.json tsconfig.json .env.example; do
  cp "$PLUGIN_ROOT/templates/$f" "$TARGET_DIR/$f"
done
cp "$PLUGIN_ROOT/templates/project/CLAUDE.md" "$TARGET_DIR/project/CLAUDE.md"

chmod +x "$TARGET_DIR/run.sh"

# Replace project name in package.json
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/wiggum-harness/$PROJECT_NAME/g" "$TARGET_DIR/package.json"
else
  sed -i "s/wiggum-harness/$PROJECT_NAME/g" "$TARGET_DIR/package.json"
fi

echo "Done! Harness created at $TARGET_DIR"
ls -la "$TARGET_DIR/"
