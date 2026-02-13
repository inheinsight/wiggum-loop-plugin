# Hook Patterns: Safety Hooks for the Verifier Agent

## Why Hooks?

The verifier agent needs to inspect outputs, run tests, and read files — but it must NOT modify the builder's work. If the verifier "helps" by fixing things, the feedback loop breaks: the builder never learns to produce correct output, and the verifier becomes an unaudited co-builder.

Prompt instructions alone ("do not delete files") are not reliable under `bypassPermissions` mode. `PreToolUse` hooks provide programmatic enforcement that cannot be bypassed by the agent.

## Hook Architecture

Hooks are registered when creating the verifier session:

```typescript
const hooks = {
  PreToolUse: [
    { matcher: "Bash", hooks: [makeVerifierPreToolUseHook()] },
  ],
};

const options = {
  // ... other options
  hooks,
};
```

The hook factory `makeVerifierPreToolUseHook()` returns a `HookCallback` that inspects every `Bash` tool invocation before it executes. It can:
- **Allow**: Return `{}` (empty object) — the command runs normally
- **Deny**: Return `{ hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: "..." } }` — the command is blocked with a reason message

## Standard Guardrails

Every Wiggum verifier should block these:

### 1. File Deletion

```typescript
function isDeleteCommand(cmd: string): { deny: boolean; reason?: string } {
  if (/\brm\b/.test(cmd) || /\brmdir\b/.test(cmd) || /\bunlink\b/.test(cmd)) {
    return { deny: true, reason: "rm/rmdir/unlink blocked in verifier mode." };
  }
  if (/\bgit\s+clean\b/.test(cmd)) {
    return { deny: true, reason: "git clean blocked in verifier mode." };
  }
  return { deny: false };
}
```

### 2. Mutating Git Commands

Only allow read-only git operations:

```typescript
const READONLY_GIT = new Set(["status", "diff", "log", "show"]);

function isDangerousGit(cmd: string): { deny: boolean; reason?: string } {
  const trimmed = cmd.trim();
  if (!/^git(\s|$)/.test(trimmed)) return { deny: false };
  const parts = trimmed.split(/\s+/);
  const sub = parts[1] ?? "";
  if (READONLY_GIT.has(sub)) return { deny: false };
  return { deny: true, reason: `git ${sub} blocked. Only status/diff/log/show allowed.` };
}
```

This blocks `git add`, `git commit`, `git push`, `git reset`, `git checkout`, `git rebase`, etc. The verifier can read git state but cannot change it.

### 3. Domain-Specific Protections

Add rules for your domain's protected resources. Pattern:

```typescript
// Configure these for your project
const PROTECTED_DIRS = ["reference_data", "ground_truth", "fixtures"];

function isDangerousDomainCommand(cmd: string): { deny: boolean; reason?: string } {
  for (const dir of PROTECTED_DIRS) {
    if (new RegExp(`\\brm\\b.*${dir}`).test(cmd) || new RegExp(`${dir}.*\\brm\\b`).test(cmd)) {
      return { deny: true, reason: `Cannot delete ${dir}/ (protected data).` };
    }
    if (new RegExp(`\\bmv\\b.*${dir}`).test(cmd)) {
      return { deny: true, reason: `Cannot move files in ${dir}/ (protected data).` };
    }
  }
  return { deny: false };
}
```

## The Hook Factory

Combine all checks into a single factory function:

```typescript
export function makeVerifierPreToolUseHook(): HookCallback {
  const hook: HookCallback = async (input, _toolUseId, _ctx) => {
    if (!input || (input as any).hook_event_name !== "PreToolUse") return {};
    const pre = input as PreToolUseHookInput;
    if (pre.tool_name !== "Bash") return {};  // Only police Bash

    const cmd = String((pre.tool_input as any)?.command ?? "");

    // Chain checks — first match wins
    for (const check of [isDeleteCommand, isDangerousGit, isDangerousDomainCommand]) {
      const result = check(cmd);
      if (result.deny) {
        return {
          hookSpecificOutput: {
            hookEventName: pre.hook_event_name,
            permissionDecision: "deny" as const,
            permissionDecisionReason: result.reason ?? "Blocked by verifier hook",
          },
        };
      }
    }

    return {};  // allow
  };
  return hook;
}
```

## What the Verifier CAN Do

The verifier is not completely locked down. It CAN:
- **Read any file** (Read tool, cat, head, tail)
- **Run test suites** (python3 test.py, npm test)
- **Run analysis scripts** (accuracy calculators, diff tools)
- **Edit files** (Edit tool) — useful for updating project status in CLAUDE.md
- **Use git status/diff/log/show** — to inspect what the builder changed
- **Run linters and formatters** — to check code quality

The verifier CANNOT:
- Delete files (rm, rmdir, unlink, git clean)
- Modify git history (commit, push, reset, checkout, rebase)
- Move or overwrite protected data
- Run network commands that could have side effects (configurable)

## Extending Hooks

To add more guardrails for your domain:

1. Create a new check function following the `{ deny: boolean; reason?: string }` pattern
2. Add it to the chain in `makeVerifierPreToolUseHook()`
3. Test by running the verifier and intentionally triggering the blocked action

Common additions:
- Block `curl`/`wget` (prevent network side effects)
- Block writes to specific config files
- Block `npm publish` or `docker push`
- Block database mutation commands
