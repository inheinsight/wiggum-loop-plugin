# Architecture: The Wiggum Loop Orchestrator

## Overview

The loop orchestrator is a Node.js/TypeScript program that drives the builder-verifier cycle. It uses the Claude Agent SDK's `query()` function to spawn fresh agent sessions, streams their output to JSONL logs, detects completion markers, extracts verifier reports, and manages the iteration cycle.

## Execution Flow

```
main()
  │
  ├─ assertRepoLooksRight()         # Validate project plan exists, create log dir
  │
  └─ for i = 1..MAX_LOOPS:
       │
       ├─ runSession("builder", builderPrompt, i)
       │   ├─ Spawns fresh query() with builder prompt + verifier feedback
       │   ├─ Streams JSONL to logs/builder_001_*.jsonl
       │   ├─ Scans combined text for ===WIGGUM_COMPLETE===
       │   └─ Returns RunResult { sawBuilderDone, resultText, ... }
       │
       ├─ if !sawBuilderDone → sleep → continue (builder not finished)
       │
       ├─ runSession("verifier", verifierPrompt, i)
       │   ├─ Spawns fresh query() with verifier prompt
       │   ├─ PreToolUse hooks block destructive operations
       │   ├─ Scans for ===VERIFIER_COMPLETE===
       │   └─ Extracts <verifier-report> if not complete
       │
       ├─ if sawVerifierDone → exit(0)  // SUCCESS
       │
       └─ latestVerifierReport = extractedReport
           └─ Appended to next builder prompt
```

## The Session Runner

`runSession()` is the core function. It:

1. Creates a JSONL log file with a timestamped name
2. Calls `query({ prompt, options })` from the Claude Agent SDK
3. Iterates over the async generator, logging every message
4. Accumulates text from `assistant` messages
5. Captures the final `result` message
6. Scans all accumulated text for completion markers
7. If the verifier didn't complete, extracts the report from `<verifier-report>` XML tags

Key SDK options:

```typescript
const options = {
  cwd: REPO_ROOT,
  settingSources: ["user", "project"],        // Load CLAUDE.md files
  permissionMode: "bypassPermissions",        // Full autonomy
  allowDangerouslySkipPermissions: true,
  ...(kind === "verifier" ? { hooks } : {}),  // Hooks only on verifier
};
```

- `settingSources: ["user", "project"]` loads user-scope settings (MCP servers, skills) plus project `CLAUDE.md` files, so the agent has full context about the project.
- `bypassPermissions` + `allowDangerouslySkipPermissions` gives the builder complete autonomy. The verifier also has bypass, but its hooks enforce read-only behavior.
- Hooks are only injected for the verifier session.

## State Management

The loop maintains exactly one piece of state between iterations: `latestVerifierReport: string | null`. This is the extracted text from the verifier's `<verifier-report>` tags (or the full verifier output if no tags are found).

Everything else — code, outputs, test results, configuration — lives on the filesystem. This means:
- If the loop crashes, you can resume by re-running (previous work is on disk)
- Logs are append-only JSONL files you can tail in real-time
- The master log provides a high-level summary of each iteration

## Configuration

All configuration is via environment variables with sensible defaults:

| Variable | Default | Purpose |
|----------|---------|---------|
| `WIGGUM_REPO_ROOT` | `process.cwd()` | Working directory for agent sessions |
| `WIGGUM_PLAN_DIR` | `harness/project` | Directory containing `CLAUDE.md` project plan |
| `WIGGUM_HARNESS_DIR` | `harness` | Directory containing harness code |
| `WIGGUM_LOG_DIR` | `logs` (under harness dir) | Where JSONL session logs go |
| `WIGGUM_MAX_LOOPS` | `20` | Maximum builder iterations |
| `WIGGUM_COOLDOWN_SECONDS` | `2` | Sleep between iterations |

## Sanity-Check Mode

The `--sanity-check` flag replaces the real prompts with trivial ones:
- Builder: create `/tmp/wiggum-sanity-test.txt` with content `wiggum-ok`, then emit the completion marker
- Verifier: read that file, verify its contents, then emit the verifier completion marker

This proves the entire loop works (SDK connection, logging, marker detection, verifier hooks) without needing any domain-specific setup. Always run sanity-check first when setting up a new harness.

## Logging

Three log levels:

1. **JSONL per session**: `logs/builder_001_2024-01-15_14-30-45.jsonl` — Every SDK message, tool use, and result. Tail with `jq` for real-time monitoring.
2. **Master log**: `logs/wiggum_master.log` — One-line summaries per builder and verifier run (error status, completion, log path).
3. **Terminal output**: Pretty-printed messages showing tool calls, text output, and completion status.

## .env Loading

The orchestrator loads `.env` from the repo root before anything else. This provides `ANTHROPIC_API_KEY` and any other secrets without committing them to the repo. Existing environment variables are NOT overridden.
