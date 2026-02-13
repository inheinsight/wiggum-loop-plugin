# Prompt Design: Writing Effective Builder and Verifier Prompts

## The "Prompt IS the Spec" Philosophy

In a Wiggum Loop, prompts are not short instructions — they are comprehensive specification documents. A good builder prompt is 500-1500 lines of detailed, structured text that tells the agent everything it needs to know. This is intentional: each session is stateless (no conversation history), so ALL context must be in the prompt.

This is different from interactive chat where you build context over multiple turns. Here, the prompt is a standalone document that could be handed to a human contractor as a complete brief.

## Builder Prompt Structure

Use numbered top-level sections with clear separator lines. This structure has proven effective:

### 1. THE PROBLEM
- Background context: who is the user, what are they trying to accomplish
- What you're building: concrete deliverables
- Guiding philosophy: e.g., "Missing a field is worse than guessing wrong"

### 2. THE SPEC
- Technical requirements with specific numbers (formats, thresholds, dimensions)
- File format schemas (JSON shapes, field names, types)
- Input/output contracts

### 3. RESOURCES
- File paths (relative to repo root) for all relevant code, data, configs
- Which files are read-only vs editable
- Reference data locations and formats

### 4. WORKFLOW
- Step-by-step process: "First do X, then Y, then Z"
- Decision trees for branching logic
- Order of operations matters — be explicit

### 5. VERIFICATION
- Commands to run for self-checking (test suites, accuracy scripts)
- Expected output formats and pass criteria
- What to do if checks fail (fix and retry, not skip)

### 6. RULES
- Hard constraints: "NEVER do X", "ALWAYS do Y"
- Domain-specific invariants
- Things previous iterations got wrong (learned constraints)

### 7. ENVIRONMENT
- Available tools, working directory, installed packages
- SDK details if relevant
- Any external services or APIs available

### 8. EXIT CHECKLIST
- Numbered list of EVERY condition that must be true before emitting `===WIGGUM_COMPLETE===`
- Be exhaustive — this is what the builder checks against before claiming done
- Example: "All 28 test PDFs processed", "No Python tracebacks", "Accuracy ≥75%"

## Verifier Prompt Structure

The verifier prompt is shorter (200-500 lines) but equally structured. Key differences:

- **Mindset**: "Your job is to DISCONFIRM that the builder is done. Look for problems."
- **Checklist-driven**: Frame verification as a numbered checklist of gates
- **Structured output**: Define the exact `<verifier-report>` format
- **Priority ordering**: Tell the verifier what to check first (critical failures before cosmetic issues)

Example verifier structure:
```
You are verifying the builder's work. Your job is to find problems, not rubber-stamp completion.

VERIFICATION CHECKLIST (check in order):
1. Does the output exist? (files, artifacts)
2. Do automated tests pass? (run test suite)
3. Does the output meet quality thresholds? (accuracy, coverage)
4. Are there regressions from the previous iteration?
5. Is the output format correct? (schema validation)
6. Visual/manual spot-check of outputs

If ALL checks pass → output ===VERIFIER_COMPLETE===
If ANY check fails → output <verifier-report>...</verifier-report>
```

## Feedback Concatenation

When the verifier produces a report, the orchestrator appends it to the next builder prompt:

```typescript
function buildBuilderPrompt(repoRoot, planDir, verifierReport) {
  let prompt = baseBuilderPrompt(repoRoot, planDir);
  if (verifierReport) {
    prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LATEST VERIFIER REPORT (MUST ADDRESS FULLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${verifierReport}`;
  }
  return prompt;
}
```

The "MUST ADDRESS FULLY" framing is critical — it tells the builder that ignoring the feedback is not an option. Each issue in the report must be specifically addressed.

## Tips for Effective Prompts

1. **Use concrete examples** — Don't say "produce good field names", say "e.g., `employee_signature`, `federal_filing_status_single`"
2. **Include exact commands** — Don't say "run the tests", say `python3 verification/unit_test.py --reference-dir reference_pdfs --iteration-dir outputs/iteration_NNN`
3. **Specify file paths explicitly** — The agent doesn't know your directory structure
4. **State iteration count** — "You have 20 iterations" sets expectations and urgency
5. **Define "done" precisely** — Vague completion criteria lead to premature completion claims
6. **Anticipate failure modes** — Add rules for things that went wrong in early iterations
7. **Use CLAUDE.md for stable context** — Put iteration status, baselines, and domain rules in the project `CLAUDE.md` (loaded via `settingSources`)

## Anti-Patterns

- **Too-short prompts**: A 50-line prompt means the agent will spend most of its time exploring and guessing
- **Relying on conversation history**: Each session starts fresh — don't assume the agent remembers anything
- **Soft completion criteria**: "Try to make it work" → the builder will claim done too early
- **Verifier that fixes instead of reports**: The verifier should DESCRIBE problems, not fix them — that's the builder's job
- **No exit checklist**: Without explicit conditions, the builder will emit the completion marker based on vibes
