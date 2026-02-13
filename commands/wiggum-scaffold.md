---
description: "Scaffold a new Wiggum Loop harness project"
argument-hint: "<project-name>"
allowed-tools: ["Bash(cp:*)", "Bash(mkdir:*)", "Bash(chmod:*)", "Bash(sed:*)", "Bash(ls:*)", "Read", "Write"]
---

# Wiggum Scaffold Command

Create a new Wiggum Loop harness project by copying the template files.

## Instructions

1. Parse the argument to get the project name. If no argument is provided, ask the user for a project name.

2. Determine the target directory. The harness will be created at `<current-working-directory>/harness/` inside the user's project.

3. Copy ALL template files from the plugin's templates directory to the target:

```!
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"
TARGET_DIR="$(pwd)/harness"

# Create directory structure
mkdir -p "$TARGET_DIR/project" "$TARGET_DIR/logs"

# Copy all template files
for f in wiggum-loop.ts hooks.ts logger.ts prompts.ts run.sh package.json tsconfig.json .env.example; do
  cp "$PLUGIN_ROOT/templates/$f" "$TARGET_DIR/$f"
done
cp "$PLUGIN_ROOT/templates/project/CLAUDE.md" "$TARGET_DIR/project/CLAUDE.md"

# Make run.sh executable
chmod +x "$TARGET_DIR/run.sh"

# Replace placeholder project name in package.json
sed -i '' "s/wiggum-harness/$ARGUMENTS/g" "$TARGET_DIR/package.json" 2>/dev/null || sed -i "s/wiggum-harness/$ARGUMENTS/g" "$TARGET_DIR/package.json"

ls -la "$TARGET_DIR/"
```

4. After copying, print the getting-started instructions:

```
Wiggum Loop harness created at ./harness/

NEXT STEPS:

1. Run sanity check to verify the loop works:
   cd harness && npm install && ./run.sh --sanity-check

2. Customize your harness:
   - prompts.ts  — Replace placeholder sections with your domain-specific prompts
   - hooks.ts    — Add protected directories and domain-specific guardrails
   - run.sh      — Add prerequisite checks for your tools/data
   - project/CLAUDE.md — Set up your project plan with metrics and baselines

3. Run your first real iteration:
   ./run.sh

4. Monitor progress:
   tail -f harness/logs/wiggum_master.log

For pattern guidance, ask Claude about the "wiggum loop" — the skill will activate
with architectural advice for builder-verifier loops.
```
