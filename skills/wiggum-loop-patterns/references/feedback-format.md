# Feedback Format: Verifier Reports and Feedback Concatenation

## The Verifier Report Schema

When the verifier finds problems, it wraps its feedback in XML tags:

```xml
<verifier-report>
Your structured feedback here.
</verifier-report>
```

The orchestrator extracts text between these tags using a simple string search:

```typescript
const REPORT_OPEN = "<verifier-report>";
const REPORT_CLOSE = "</verifier-report>";

export function extractVerifierReport(text: string): string | null {
  const start = text.indexOf(REPORT_OPEN);
  const end = text.indexOf(REPORT_CLOSE);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start + REPORT_OPEN.length, end).trim();
}
```

If no tags are found, the orchestrator falls back to using the verifier's entire output as the report. This graceful degradation means the feedback loop works even if the verifier forgets the XML tags.

## Structuring Feedback for Maximum Impact

The verifier report should be structured to help the builder prioritize. A proven format:

```xml
<verifier-report>
## Critical Issues (must fix)
1. [FAIL] Unit test: 14/21 PDFs pass (need ≥16). Failing: Form-A, Form-B, ...
2. [FAIL] Mean accuracy dropped to 72.3% (baseline: 77.1%, threshold: 75%)

## Regressions
3. Form-X accuracy dropped from 83% to 71% — check field positioning on page 2

## Improvements Needed
4. Checkbox dimensions too large on Form-Y (24x24pt, should be 8-20pt)
5. Missing fields on Form-Z page 3: signature area not detected

## What's Working (do not break)
- Form-A: 90.6% accuracy, all fields correct
- Cockpit UI loads and displays all PDFs correctly
- Field renaming producing clean names
</verifier-report>
```

### Priority Ordering

Structure the report from most critical to least critical:
1. **Blocking failures** — test suite failures, crashes, missing outputs
2. **Regressions** — things that got worse from the previous iteration
3. **Quality issues** — below threshold but not blocking
4. **Cosmetic/naming issues** — important but lowest priority

The "What's Working" section prevents the builder from accidentally breaking passing tests while fixing failures.

## Feedback Concatenation

The orchestrator appends the report to the next builder prompt:

```typescript
function buildBuilderPrompt(repoRoot, planDir, verifierReport) {
  let prompt = baseBuilderPrompt(repoRoot, planDir);
  if (verifierReport) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LATEST VERIFIER REPORT (MUST ADDRESS FULLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${verifierReport}`;
  }
  return prompt;
}
```

Key design choices:
- **"MUST ADDRESS FULLY"** — This framing prevents the builder from cherry-picking easy fixes
- **Only the latest report** — We don't accumulate all historical reports (context window limits)
- **Raw text, not structured data** — The builder can parse natural language more reliably than JSON
- **Appended at the end** — The most recently-read content tends to have the most influence on the agent's behavior

## Why Only the Latest Report?

You might wonder: why not include all previous reports to show the full history? Three reasons:

1. **Context window limits** — Reports can be 500+ words. After 10 iterations, that's 5000+ words of historical feedback competing with the spec for attention.
2. **Stale feedback** — A report from iteration 3 may reference problems already fixed in iteration 5. Including it confuses the builder.
3. **Filesystem as memory** — The builder can see its own code, outputs, and git history. It doesn't need the report to tell it what it already changed.

If you need historical context, put it in the project's `CLAUDE.md` file (loaded via `settingSources`). For example, update an "Iteration History" table with each run's metrics.

## Tips for Effective Verifier Reports

1. **Be specific** — "Form-X page 2 has 3 extra text fields in the header area" > "Some forms have too many fields"
2. **Include measurements** — "Width is 45pt (should be 8-20pt)" > "Checkbox is too wide"
3. **Reference file paths** — "See `outputs/iteration_005/Form-X_fields.json` line 23"
4. **Suggest direction, not implementation** — "The header detection threshold may be too aggressive" > "Change line 145 from 0.3 to 0.5"
5. **Acknowledge progress** — "Fixed the W-4 regression from last iteration. 3 issues remain."
