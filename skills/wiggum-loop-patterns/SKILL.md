---
name: wiggum-loop-patterns
description: "Architecture and implementation patterns for building builder-verifier agentic loops using the Claude Agent SDK. Use this skill when designing autonomous multi-iteration systems, writing builder/verifier prompts, implementing safety hooks, or structuring feedback loops between agents."
---

# Wiggum Loop Patterns

The Wiggum Loop is a **builder-verifier dual-agent iteration pattern** for autonomous multi-iteration tasks. A *builder* agent works on a task with full tool access, then a *verifier* agent with restricted permissions reviews the work. If the verifier finds issues, it produces structured feedback that gets appended to the next builder's prompt. The loop continues until both agents agree the work is complete — or a maximum iteration count is reached.

## When to Use This Pattern

Use a Wiggum Loop when:

- The task requires **multiple iterations** to converge on quality (annotation, code generation, data processing pipelines)
- You need **separation of concerns** between "doing the work" and "checking the work"
- The builder should have **full autonomy** (file creation, tool use, network access) but the verifier should be **read-only** to prevent it from "fixing" things itself
- You want **structured feedback** that accumulates across iterations to drive convergence
- Quality can be measured by a **verification gate** (test suite, accuracy metric, visual comparison)

Do NOT use this pattern for simple one-shot tasks, conversational workflows, or tasks where human-in-the-loop review replaces automated verification.

## Core Architecture

The loop has exactly three components running in sequence:

1. **Builder Session** — A fresh Claude Agent SDK `query()` call with a comprehensive prompt containing the full task specification plus any prior verifier feedback. The builder has `bypassPermissions` and full tool access. When satisfied, it emits a completion marker: `===WIGGUM_COMPLETE===`.

2. **Verifier Session** — A separate `query()` call with a verification-focused prompt. The verifier has `PreToolUse` hooks that block destructive operations (file deletion, mutating git commands, domain-specific protections). It runs the verification gate, inspects outputs, and either emits `===VERIFIER_COMPLETE===` (done) or produces a `<verifier-report>` describing what needs to change.

3. **Feedback Concatenation** — The verifier's report is extracted and appended to the next builder prompt under a heading like "LATEST VERIFIER REPORT (MUST ADDRESS FULLY)". This single piece of state is what drives convergence.

Each session is **stateless** — a fresh SDK call with no conversation history carried over. All context comes from the prompt itself, the filesystem, and the verifier report. This makes the loop resilient to context window limits.

## Key Principles

### 1. The Prompt IS the Spec

Builder and verifier prompts are comprehensive, self-contained documents — often 1000+ lines. They contain everything: problem statement, technical spec, file paths, verification commands, exit criteria, and rules. The agent never needs to "figure out" what to do.

### 2. Iteration > Perfection

The builder doesn't need to get everything right on the first pass. The loop is designed for convergence: each iteration addresses the verifier's feedback, and the feedback becomes more specific over time. Set aggressive recall thresholds (e.g., confidence ≥0.20) — it's better to produce imperfect output that gets refined than to miss things entirely.

### 3. Verifier = "Disconfirm Done" Mindset

The verifier's job is NOT to rubber-stamp completion. It actively tries to find problems. Its prompt should frame verification as a checklist of things that must all pass, with the default assumption being "not done yet."

### 4. Safety Through Hooks, Not Trust

The verifier gets `PreToolUse` hooks that enforce read-only behavior. It can inspect files, run tests, and read outputs — but it cannot delete files, push to git, or modify protected directories. This is enforced programmatically, not by prompt instruction alone.

### 5. Single State Variable

The only state passed between iterations is the verifier report string. Everything else lives on disk (code, outputs, test results). This keeps the loop simple and debuggable.

## Prompt Architecture

Builder prompts follow a numbered-section structure:

1. **The Problem** — Background, what you're building, why
2. **The Spec** — Technical requirements, file formats, constraints
3. **Resources** — File paths, reference data, existing code
4. **Workflow** — Step-by-step process the builder should follow
5. **Verification** — How to self-check before claiming done
6. **Rules** — Hard constraints (never do X, always do Y)
7. **Environment** — Tools available, working directory, SDK details
8. **Exit Checklist** — Numbered list of everything that must be true before emitting the completion marker

The verifier prompt mirrors this but focuses on checking: run the test suite, compare outputs against references, verify no regressions, produce structured feedback.

See `references/` for detailed guidance on each component:
- `architecture.md` — Loop orchestrator, session runner, SDK configuration
- `prompt-design.md` — How to write effective builder and verifier prompts
- `hook-patterns.md` — Safety hook design and implementation
- `feedback-format.md` — Verifier report schema and feedback concatenation
- `case-study.md` — PDF annotation as a worked example showing the pattern in action
