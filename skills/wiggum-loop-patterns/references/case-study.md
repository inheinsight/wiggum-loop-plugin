# Case Study: PDF Annotation Tool

This documents a real Wiggum Loop deployment for building a PDF annotation tool. It illustrates how the abstract patterns translate to a concrete domain.

## The Problem

A solutions team receives stacks of PDFs (HR forms, tax documents, onboarding packets) that need fillable AcroForm fields for digital completion. Manual annotation is slow. The goal: build a tool that automates the first pass and provides a review UI.

## What Was Built

Two deliverables running together:

### A) Annotation Pipeline (Python)
- Takes unannotated PDFs as input
- Uses PyMuPDF to detect form field regions via geometric analysis
- Produces `fields.json` (field positions, types, dimensions) and `fillable.pdf` (embedded AcroForm widgets)
- AI-powered field renaming (Anthropic Haiku) for descriptive names like `employee_signature`

### B) Ops Cockpit (React/TypeScript)
- Web app for the solutions team to review, edit, and export annotated PDFs
- PDF viewer with field overlays, drag-to-reposition, resize handles
- Batch processing: "Upload PDFs" → "Annotate All" → review → export
- Status tracking per PDF (Not Started, In Progress, Reviewed)

## How the Loop Was Configured

### Builder Prompt (~1,200 lines)
Structured into 9 sections covering:
- Problem context and team workflow
- Technical spec for pipeline and cockpit
- File paths for 20 reference PDFs, 28 test PDFs, verification scripts
- Step-by-step workflow (process all PDFs → run tests → check accuracy → fix issues)
- Field type rules (text, checkbox, signature — no radio)
- Dimension tables from gold-standard reference forms
- Exit checklist with 15+ conditions

### Verifier Prompt (~450 lines)
11-step verification checklist:
1. Pipeline produces outputs for all test PDFs
2. Unit test passes (≥80% of reference PDFs match)
3. Accuracy ≥75% mean, ≥60% min
4. No regressions (each form within 2% of baseline)
5. Cockpit builds and loads
6. Visual comparison of field overlays
7. Field naming quality check
8. No Python tracebacks in output
9. All field types correct (no radio, checkboxes ≤20pt)
10. Correct coordinate system (PDF bottom-left origin)
11. Project CLAUDE.md updated with current metrics

### Safety Hooks
Verifier blocked from:
- Deleting reference PDFs (ground truth)
- Deleting test PDFs (input data)
- Moving or overwriting reference data
- All mutating git commands
- File deletion commands (rm, rmdir, unlink)

### Verification Gate
- **Unit test**: Per-field tolerance matching (position ≤15pt, width ≥75%, height ≥60%)
- **Accuracy calculation**: IoU-based field matching against reference annotations
- **Golden screenshots**: Visual comparison with dimension badges
- Pass criteria: ≥60% match rate AND ≥70% field pass rate per PDF, ≥80% of PDFs pass overall

## Convergence History

| Iteration | Mean Accuracy | Min Accuracy | Key Changes |
|-----------|--------------|--------------|-------------|
| 1-10 | ~40-55% | ~20% | Basic pipeline, coordinate system bugs |
| 11-20 | ~55-65% | ~30% | CropBox fix, checkbox detection |
| 21-30 | ~65-72% | ~45% | Width calibration, signature detection |
| 31-40 | ~72-76% | ~55% | Table cell detection, header filtering |
| 41 | 76.77% | 67.94% | Radio type removed (all → checkbox) |
| 74 | 77.08% | 64.99% | Unit test system added, 17/21 pass |

Key observations:
- **Biggest jumps came from bug fixes** (coordinate system, CropBox vs MediaBox), not algorithm improvements
- **Removing complexity helped** (eliminating radio type improved both accuracy and code simplicity)
- **The verification gate drove convergence** — once unit tests were added at iteration ~60, quality improved faster
- **75% accuracy was the practical ceiling** for geometry-only detection. Further gains would require OCR or ML.

## Lessons Learned

1. **Lower the accuracy bar, raise the UX bar** — The cockpit (review UI) is more valuable than 95% auto-accuracy. A human can fix a bad guess in 2 seconds; missing a field entirely costs 30 seconds.

2. **Confidence threshold should be aggressive** — Setting minimum confidence to 0.20 (very low) increased recall dramatically. False positives are cheap to delete; false negatives are expensive to add.

3. **Domain rules accumulate** — The builder prompt grew from ~400 lines in iteration 1 to ~1,200 lines by iteration 74. Each verifier report revealed edge cases that became permanent rules (e.g., "Checkboxes must be ≤20pt", "Spanish pages should be skipped").

4. **The CLAUDE.md file is essential** — Storing iteration baselines, non-regression thresholds, and domain rules in the project `CLAUDE.md` meant the builder always had current context without the prompt growing unbounded.

5. **Visual verification catches what metrics miss** — Golden screenshot comparison caught field alignment issues that IoU metrics rated as "passing." Always include a visual check step.

6. **The verifier should update project state** — Allowing the verifier to edit `CLAUDE.md` (updating iteration history, baselines) kept the project plan current without manual intervention.
