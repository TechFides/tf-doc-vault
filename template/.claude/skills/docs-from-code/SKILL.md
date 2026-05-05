---
name: docs-from-code
description: Orchestrator skill for generating project documentation from an existing codebase. Drives the full workflow — preflight, phase selection, delegation to phase skills (technical, functional, diagrams, wireframes), TODO resolution, and the small in-run review. Trigger when the user asks to generate documentation from code or from an existing codebase, or invokes /docs-generate-from-code. DO NOT trigger for pre-code design docs, sales or marketing documentation, or documentation/analysis review — those scopes have their own skills. Always inherits rules from CLAUDE.md.
---

# docs-from-code — Orchestrator

## When to use

Trigger this skill when the user asks to generate documentation **from an
existing codebase** (not pre-code design, not sales analysis). The command
`/docs-generate-from-code` routes here.

Do **NOT** use this skill for:

- Pre-code / design documentation.
- Sales or marketing documentation.
- Reviewing existing documentation (that is handled by `/docs-review`).

## Inputs you must confirm before starting

1. **Source location** — the repository or folder with the code to document.
2. **Output version folder** — which `docs/vN/` to write into. If `v1/` does
   not exist, create it. If a later version is active, ask the user.
3. **Scope of this run** — one of:
   - `technical` (e.g. architecture, API, sequences, …),
   - `functional` (e.g. use-cases, functions-overview, …),
   - `diagrams` (only after textual content is stable),
   - `wireframes` (only after diagrams or explicit user OK),
   - `full` — run phases in order: technical → functional → diagrams →
     wireframes, pausing between each phase for user confirmation.
4. **Source version stamp** — resolve from git tag first, `package.json`
   second. If neither is available, mark as `⚠️ TODO: source version`.
5. **Screenshots** (only for wireframes phase) — ask if the user has
   screenshots to use as reference.

**NEVER** start generation without all five inputs resolved or explicitly
deferred by the user.

## Workflow

### Step 1 — Preflight

- Read `CLAUDE.md` at project root. Apply all rules from it.
- Detect existing `docs/` structure. If files would be overwritten, list them
  and ask the user per §11 of CLAUDE.md.
- Record current date (`currentDate`) and source version into a run context
  that every generated file's header must use.

### Step 2 — Phase dispatch

Based on the scope chosen in input (3), delegate to the phase skill:

| Scope        | Skill invoked               |
| ------------ | --------------------------- |
| `technical`  | `docs-technical-from-code`  |
| `functional` | `docs-functional-from-code` |
| `diagrams`   | `docs-diagrams-from-code`   |
| `wireframes` | `docs-wireframes-from-code` |
| `full`       | All four, in order          |

For `full`, pause after each phase and ask the user:

> "Phase X finished. Review the generated files. Proceed to phase Y? (y/n/stop)"

**NEVER** auto-advance between phases without user confirmation, unless the
user explicitly activated `--auto` mode for this run (§3 of CLAUDE.md).

### Step 3 — TODO resolution

After the last phase of the run completes, perform the TODO resolution flow
described in §2 of CLAUDE.md. The orchestrator owns this step — phase skills
only produce TODOs, they do not resolve them.

### Step 4 — Small in-run review

Run the review checklist from §10 of CLAUDE.md **for every generated file**.
Report the result as a compact table:

```
| File                          | Frontmatter | Links | Lang | TODO |
| ----------------------------- | ----------- | ----- | ---- | ---- |
| docs/v1/technical/api/...md   | ok          | ok    | ok   | 0    |
```

### Step 5 — Skill self-check

Before reporting the run as finished, re-read the `SKILL.md` of every phase
skill that ran and verify that all listed rules and steps were applied.
Report any gap.

## Handoff contract for phase skills

Every phase skill that this orchestrator delegates to MUST:

- Accept the run context (source path, version stamp, output version folder,
  date) as input.
- Produce files only inside the chosen `docs/vN/` subtree.
- Emit `⚠️ TODO` markers for any gap (do not resolve them).
- Return a list of generated file paths and a TODO count to the orchestrator.

## Resources

Load each resource only when its trigger applies — do **not** read all of
them upfront (progressive disclosure).

- [`resources/workflow.md`](resources/workflow.md) — detailed step-by-step
  walkthrough with example prompts.
  **Invoke when**: starting a new run, or when the user asks how the
  workflow proceeds.

- [`resources/run-context-template.md`](resources/run-context-template.md) —
  the run-context structure passed to phase skills.
  **Invoke when**: preparing the handoff to a phase skill in Step 2 and the
  exact payload shape is needed.

- [`resources/frontmatter-template.md`](resources/frontmatter-template.md) —
  canonical frontmatter blocks (content page, section index, group index,
  Confluence mark).
  **Invoke when**: about to create any `.md` file and the exact shape needs
  confirmation.

- [`resources/todo-resolution.md`](resources/todo-resolution.md) — exact
  dialog template for the a/b/c TODO resolution flow.
  **Invoke when**: entering Step 3 and at least one TODO is present.

- [`resources/review-checklist-small.md`](resources/review-checklist-small.md)
  — checklist for the in-run review and skill self-check.
  **Invoke when**: entering Step 4 (small review) or Step 5 (self-check).

## Out of scope

- Comprehensive review (handled by `/docs-review`, not yet implemented).
- Any code changes outside `docs/`.
- Publishing to Confluence (CLI handles this; this skill only writes the
  marks described in §6 of CLAUDE.md).
