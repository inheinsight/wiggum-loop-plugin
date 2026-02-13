---
description: "Show Wiggum Loop help and available commands"
---

# Wiggum Help Command

Display help information about the Wiggum Loop plugin.

Print the following to the user:

```
WIGGUM LOOP — Builder-Verifier Agentic Loop Pattern

COMMANDS:
  /wiggum-scaffold <name>   Create a new harness in ./harness/ with all template files
  /wiggum-help              Show this help message

WHAT IS A WIGGUM LOOP?

A builder-verifier dual-agent iteration pattern for autonomous multi-iteration
tasks using the Claude Agent SDK. A builder agent works on a task with full tool
access, then a verifier agent with restricted permissions reviews the work. If
the verifier finds issues, structured feedback drives the next iteration.

QUICK START:

  1. /wiggum-scaffold my-project    # Create harness
  2. cd harness && npm install      # Install deps
  3. ./run.sh --sanity-check        # Verify loop works
  4. Edit prompts.ts                # Add your domain prompts
  5. Edit hooks.ts                  # Add your safety guardrails
  6. ./run.sh                       # Run for real

KEY FILES (after scaffold):
  harness/
  ├── wiggum-loop.ts    Loop orchestrator (usually no changes needed)
  ├── prompts.ts        YOUR PROMPTS — the main file to customize
  ├── hooks.ts          Safety hooks for the verifier agent
  ├── logger.ts         Logging utilities (usually no changes needed)
  ├── run.sh            Launcher with prerequisite checks
  ├── package.json      Dependencies
  ├── tsconfig.json     TypeScript config
  ├── .env.example      Environment variable template
  └── project/
      └── CLAUDE.md     Project plan, metrics, baselines

ARCHITECTURE:

  Builder (full access) ──→ ===WIGGUM_COMPLETE=== ──→ Verifier (read-only)
       ↑                                                      │
       │                                                      ▼
       └──── feedback concatenation ◄──── <verifier-report>...</verifier-report>

ENVIRONMENT VARIABLES:
  WIGGUM_MAX_LOOPS=20              Max builder iterations
  WIGGUM_COOLDOWN_SECONDS=2        Sleep between iterations
  WIGGUM_REPO_ROOT=.               Working directory for agents
  WIGGUM_PLAN_DIR=harness/project  Directory with CLAUDE.md
  WIGGUM_HARNESS_DIR=harness       Harness code directory

For deeper pattern guidance, just ask Claude about builder-verifier loops,
prompt design, safety hooks, or feedback formats — the wiggum-loop-patterns
skill will activate with detailed architectural advice.
```
