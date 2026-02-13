/**
 * Verifier PreToolUse hook — guardrails for the verifier agent.
 *
 * The verifier CAN read files, run tests, edit project docs.
 * The verifier CANNOT:
 *   - Delete files via Bash (rm, rmdir, unlink, git clean)
 *   - Run mutating git commands (only status/diff/log/show allowed)
 *   - Modify protected directories (configure PROTECTED_DIRS below)
 *
 * CUSTOMIZATION:
 *   1. Edit PROTECTED_DIRS to list directories the verifier must not modify
 *   2. Add domain-specific checks in isDangerousDomainCommand()
 *   3. Optionally extend READONLY_GIT if you want to allow more git subcommands
 */

import type {
  HookCallback,
  PreToolUseHookInput,
} from "@anthropic-ai/claude-agent-sdk";

// === CUSTOMIZE: Directories the verifier must not delete or move ===
const PROTECTED_DIRS: string[] = [
  // Add your protected directories here, e.g.:
  // "reference_data",
  // "ground_truth",
  // "fixtures",
  // "test_inputs",
];

// Git subcommands the verifier is allowed to run (read-only)
const READONLY_GIT = new Set(["status", "diff", "log", "show"]);

function isDangerousGit(cmd: string): { deny: boolean; reason?: string } {
  const trimmed = cmd.trim();
  if (!/^git(\s|$)/.test(trimmed)) return { deny: false };

  const parts = trimmed.split(/\s+/);
  const sub = parts[1] ?? "";

  if (READONLY_GIT.has(sub)) return { deny: false };

  return {
    deny: true,
    reason: `Blocked git command: git ${sub || "(unknown)"}. Only git status/diff/log/show are allowed in verifier mode.`,
  };
}

function isDeleteCommand(cmd: string): { deny: boolean; reason?: string } {
  if (/\brm\b/.test(cmd) || /\brmdir\b/.test(cmd) || /\bunlink\b/.test(cmd)) {
    return {
      deny: true,
      reason:
        "Blocked: rm/rmdir/unlink commands are not allowed in verifier mode.",
    };
  }
  if (/\bgit\s+clean\b/.test(cmd)) {
    return {
      deny: true,
      reason:
        "Blocked: git clean (deletes files) is not allowed in verifier mode.",
    };
  }
  return { deny: false };
}

// === CUSTOMIZE: Add domain-specific dangerous command detection ===
function isDangerousDomainCommand(cmd: string): {
  deny: boolean;
  reason?: string;
} {
  for (const dir of PROTECTED_DIRS) {
    // Block deletion of protected directories
    if (
      new RegExp(`\\brm\\b.*${dir}`).test(cmd) ||
      new RegExp(`${dir}.*\\brm\\b`).test(cmd)
    ) {
      return {
        deny: true,
        reason: `Blocked: Cannot delete ${dir}/ (protected data). This directory must remain unchanged.`,
      };
    }

    // Block moving/overwriting protected directories
    if (new RegExp(`\\bmv\\b.*${dir}`).test(cmd)) {
      return {
        deny: true,
        reason: `Blocked: Cannot move files in ${dir}/ (protected data).`,
      };
    }
  }

  // === ADD YOUR DOMAIN-SPECIFIC RULES HERE ===
  // Example: Block network side effects
  // if (/\bcurl\b/.test(cmd) || /\bwget\b/.test(cmd)) {
  //   return { deny: true, reason: "Network requests blocked in verifier mode." };
  // }

  return { deny: false };
}

export function makeVerifierPreToolUseHook(): HookCallback {
  const hook: HookCallback = async (input, _toolUseId, _ctx) => {
    if (!input || (input as any).hook_event_name !== "PreToolUse") return {};

    const pre = input as PreToolUseHookInput;

    // Only police Bash commands
    if (pre.tool_name !== "Bash") return {};

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

    return {}; // allow
  };

  return hook;
}
