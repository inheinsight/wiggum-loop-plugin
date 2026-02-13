#!/bin/bash
# Wiggum Loop launcher — TEMPLATE
#
# Usage:
#   ./run.sh                              # Run with defaults
#   ./run.sh --sanity-check               # Quick sanity check (1 loop, trivial prompts)
#   WIGGUM_MAX_LOOPS=20 ./run.sh          # Override max loops
#   WIGGUM_COOLDOWN_SECONDS=5 ./run.sh    # Override cooldown
#
# Environment variables:
#   WIGGUM_MAX_LOOPS          Max builder iterations (default: 20)
#   WIGGUM_COOLDOWN_SECONDS   Seconds between iterations (default: 2)
#   WIGGUM_REPO_ROOT          Override repo root detection

set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HARNESS_DIR/.." && pwd)"

echo "[harness] Checking prerequisites..."
for tool in node npm; do
  if ! command -v "$tool" &> /dev/null; then
    echo "[ERROR] Required tool not found: $tool"
    echo "Please install it before running the harness."
    exit 1
  fi
done

# === CUSTOMIZE: Add your domain-specific prerequisite checks here ===
# Examples:
#   # Check Python
#   command -v python3 &>/dev/null || { echo "[ERROR] python3 not found"; exit 1; }
#
#   # Check a Python package
#   python3 -c "import some_package" 2>/dev/null || {
#     echo "[ERROR] some_package not installed. Run: pip install some_package"
#     exit 1
#   }
#
#   # Check reference data exists
#   REF_COUNT=$(ls "$REPO_ROOT/reference_data/"*.json 2>/dev/null | wc -l | tr -d ' ')
#   if [ "$REF_COUNT" -eq "0" ]; then
#     echo "[ERROR] No reference data found in reference_data/"
#     exit 1
#   fi
#   echo "[harness] Found $REF_COUNT reference file(s)"

echo "[harness] Prerequisites OK"
echo ""

# Install deps if needed
if [ ! -d "$HARNESS_DIR/node_modules" ]; then
  echo "[harness] Installing dependencies..."
  cd "$HARNESS_DIR"
  npm install
  cd "$REPO_ROOT"
fi

echo "[harness] Repo root: $REPO_ROOT"
echo "[harness] Harness:   $HARNESS_DIR"
echo "[harness] Starting Wiggum Loop..."
echo ""

# Run from repo root so cwd is correct for the builder/verifier agents
cd "$REPO_ROOT"

export WIGGUM_REPO_ROOT="$REPO_ROOT"
export WIGGUM_HARNESS_DIR="$HARNESS_DIR"

exec npx tsx "$HARNESS_DIR/wiggum-loop.ts" "$@"
