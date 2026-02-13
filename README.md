# Wiggum Loop Plugin

A Claude Code plugin that provides the **builder-verifier agentic loop pattern** for autonomous multi-iteration tasks using the Claude Agent SDK.

## What Is a Wiggum Loop?

A builder-verifier dual-agent iteration pattern:

1. A **builder** agent works on a task with full tool access
2. When done, a **verifier** agent with restricted permissions reviews the work
3. If the verifier finds issues, structured feedback drives the next builder iteration
4. The loop continues until both agents agree the work is complete

This pattern has been proven on real production workloads (PDF annotation tooling) across 74+ iterations, converging from ~40% to 77%+ accuracy autonomously.

## Quick Start

### 1. Install the plugin

```bash
# Clone this repo
git clone <repo-url> ~/Development/wiggum-loop-plugin

# Load it in Claude Code
claude --plugin-dir ~/Development/wiggum-loop-plugin
```

### 2. Scaffold a new harness

In your project directory:

```
/wiggum-scaffold my-project
```

This creates a `harness/` directory with all template files.

### 3. Verify it works

```bash
cd harness
npm install
./run.sh --sanity-check
```

The sanity check runs one iteration where the builder creates a temp file and the verifier confirms it. If this passes, the loop infrastructure is working.

### 4. Customize for your domain

Edit these files in `harness/`:

| File | What to Customize |
|------|-------------------|
| `prompts.ts` | Replace placeholder sections with your domain-specific builder and verifier prompts |
| `hooks.ts` | Add `PROTECTED_DIRS` and domain-specific guardrails |
| `run.sh` | Add prerequisite checks for your tools and data |
| `project/CLAUDE.md` | Set up your project plan with metrics and baselines |

### 5. Run for real

```bash
./run.sh
```

Monitor progress:
```bash
tail -f harness/logs/wiggum_master.log
```

## Plugin Components

### Skill: `wiggum-loop-patterns`

Provides architectural knowledge about the builder-verifier pattern. When you ask Claude about designing agentic loops, writing builder/verifier prompts, or implementing safety hooks, this skill activates with detailed guidance.

### Commands

- `/wiggum-scaffold <name>` — Create a new harness with all template files
- `/wiggum-help` — Show help and available commands

### Templates

Production-tested template files extracted from a real Wiggum Loop deployment:

- `wiggum-loop.ts` — Loop orchestrator (SDK session management, JSONL logging, marker detection)
- `prompts.ts` — Prompt skeleton with numbered sections and placeholder markers
- `hooks.ts` — Configurable safety hook factory for verifier agents
- `logger.ts` — Logging utilities, XML report extraction, terminal pretty-printing
- `run.sh` — Launcher with prerequisite validation
- `project/CLAUDE.md` — Project plan template with metrics, baselines, iteration history

## Architecture

```
Builder (full access) ──→ ===WIGGUM_COMPLETE=== ──→ Verifier (read-only hooks)
     ↑                                                        │
     │                                                        ▼
     └──── feedback concatenation ◄──── <verifier-report>...</verifier-report>
```

Each session is a **fresh** Claude Agent SDK `query()` call — no conversation history carried over. All context comes from the prompt, the filesystem, and the single verifier report string.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `WIGGUM_MAX_LOOPS` | `20` | Max builder iterations |
| `WIGGUM_COOLDOWN_SECONDS` | `2` | Sleep between iterations |
| `WIGGUM_REPO_ROOT` | `cwd` | Working directory for agents |
| `WIGGUM_PLAN_DIR` | `harness/project` | Directory with CLAUDE.md |
| `WIGGUM_HARNESS_DIR` | `harness` | Harness code directory |
| `WIGGUM_LOG_DIR` | `logs` | Log directory (under harness dir) |

## Further Reading

The skill's reference docs cover each aspect in detail:

- `architecture.md` — Loop orchestrator, session runner, SDK configuration
- `prompt-design.md` — How to write effective builder and verifier prompts
- `hook-patterns.md` — Safety hook design and implementation
- `feedback-format.md` — Verifier report schema and feedback concatenation
- `case-study.md` — PDF annotation as a worked example
