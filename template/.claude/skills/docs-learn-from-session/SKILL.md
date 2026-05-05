---
name: docs-learn-from-session
description: Applies user feedback captured in `.claude/session-notes/*.md` to the documentation skill files themselves. Reads the notes produced by the session-notes collection step of `/docs-generate-from-code`, proposes a concrete edit per entry to the targeted `SKILL.md` or resource, waits for per-entry user approval, applies it, and marks the note processed. Trigger when the user asks to "apply session notes", "learn from session feedback", "process session notes", "update the docs skills from the last run", "improve the docs skills from session feedback", mentions `.claude/session-notes/` as the input, or asks to turn session notes into skill edits. DO NOT trigger for generating documentation pages, resolving in-content TODOs, editing `CLAUDE.md`, or editing files outside `.claude/skills/` and `.claude/commands/`. Always inherits rules from CLAUDE.md.
---

# docs-learn-from-session — Feedback → skill updates

## When to use

Trigger this skill when the user wants the feedback accumulated in
`.claude/session-notes/` — produced by `/docs-generate-from-code` during
previous runs — to be applied to the relevant skill definitions
(`SKILL.md` files and their `resources/`).

Concrete trigger phrases include:

- "apply the session notes" / "apply session feedback"
- "learn from the last run" / "learn from session feedback"
- "process session notes" / "process unprocessed session notes"
- "update the docs skills from the last session"
- "improve the docs skills based on the session notes"
- any direct reference to unprocessed files in `.claude/session-notes/`.

The skill is the **only** component in this project authorized to modify
skill files in reaction to session notes. The collection step in the
orchestrator is deliberately read-only; this skill is where updates
happen. There is **no** dedicated slash command — invoke the skill by
name or via any of the trigger phrases above.

Do **NOT** use this skill for:

- Generating or editing documentation pages — those are owned by
  `docs-from-code`, `docs-technical-from-code`, `docs-functional-from-code`,
  `docs-diagrams-from-code`, `docs-wireframes-from-code`.
- Resolving `⚠️ TODO` markers inside generated documentation — that is the
  orchestrator's TODO-resolution step.
- Editing files outside `.claude/skills/` or `.claude/commands/` (per §11
  of CLAUDE.md).
- Editing `CLAUDE.md` itself — project-wide rules are the user's decision.

## Inputs you must confirm before starting

1. **Session-notes folder** — default `.claude/session-notes/`. The user may
   override with a different path.
2. **Scope** — which session-notes files to consume:
   - `unprocessed` (default) — every file with `status: unprocessed`.
   - `latest` — only the most recent file by `run_date`.
   - an explicit file path.
3. **Target whitelist** — which files this run is allowed to modify. By
   default: every `file:` referenced in the selected session notes that
   lives under `.claude/skills/` or `.claude/commands/`. Anything outside
   this prefix requires explicit user confirmation before any write
   (§11 of CLAUDE.md).
4. **`auto_mode`** — boolean. Default `false` (pause per entry for
   approval). Never auto-apply unless the user explicitly opts in for
   this run (§3 of CLAUDE.md).

**NEVER** start applying changes before the user confirms the input
summary.

## Workflow

### Step 1 — Load and validate session notes

1. Scan the session-notes folder, honouring the scope filter above.
2. Skip files whose frontmatter `consumed_by` is not
   `docs-learn-from-session` (they belong to a different workflow).
3. Parse every YAML entry. Each entry must have:
   `skill`, `file`, `kind`, `excerpt`, `context`.
   If an entry is malformed, list it and ask the user whether to fix,
   skip, or abort.
4. Group entries by `file`, then by `kind`.
5. Produce a **plan table** and show it to the user:

   ```
   | Note file          | Skill                     | Target file                                      | Kind        | Entries |
   | ------------------ | ------------------------- | ------------------------------------------------ | ----------- | ------- |
   | 2026-04-23-1405.md | docs-technical-from-code  | .claude/skills/docs-technical-from-code/SKILL.md | preference  | 2       |
   | 2026-04-23-1405.md | docs-wireframes-from-code | .claude/skills/docs-wireframes-from-code/SKILL.md| missed-step | 1       |
   ```

   Ask: "Proceed to process these entries? (y / edit scope / cancel)".

**NEVER** proceed past this step without user approval of the plan.

### Step 2 — Per-entry dialog and application

For every entry, in the order shown in the plan:

1. Read the target `file`. Keep the exact block being edited in scope
   for the diff.
2. Consult [`resources/kind-playbook.md`](resources/kind-playbook.md) to
   translate the `kind` into a concrete edit (insert / edit / delete),
   citing the `excerpt` verbatim as justification.
3. Show the dialog defined in
   [`resources/entry-dialog.md`](resources/entry-dialog.md): note file,
   entry index, target file, `kind`, verbatim `excerpt`, proposed diff,
   one-line rationale.
4. Wait for the user's choice: `y / edit / skip / defer`.
   - `y` → apply the diff exactly as shown.
   - `edit` → user supplies replacement text; insert it verbatim (no
     paraphrasing that changes meaning — §1 of CLAUDE.md).
   - `skip` → drop this entry; mark it `skipped` in the run report.
   - `defer` → leave the entry unprocessed; it remains in the session
     note for a later run.
5. After applying, immediately re-read the edited file and run the
   relevant subset of
   [`resources/review-checklist.md`](resources/review-checklist.md) on
   it.

**NEVER** batch-apply changes across multiple entries without
individual approval, unless `auto_mode` is on.

### Step 3 — Handle contradictions and duplicates

- If two entries target the same block with contradictory guidance,
  do **NOT** pick one automatically. Surface both excerpts
  side-by-side and ask the user which to apply (or how to combine).
- If an entry restates a rule that already exists verbatim in the
  target file, mark it `already-present` and skip — do not duplicate.
- If the target file or the exact block referenced by the entry
  cannot be located, ask the user to point to the correct location or
  confirm `skip`.

### Step 4 — Update session-notes status

After every entry in a given session-notes file has been processed,
update that file's frontmatter:

- All entries applied or explicitly skipped → `status: processed`.
- At least one entry deferred → `status: partial`, plus
  `deferred_entries: [<indexes>]`.
- Processing blocked by errors → `status: error`, plus a short
  machine-friendly `last_error:` field.

Also add `processed_at: <YYYY-MM-DD HH:MM>` using `currentDate`.

**NEVER** delete a session-notes file from this skill. Retention is a
separate, user-driven decision.

### Step 5 — Small review + skill self-check

- Run [`resources/review-checklist.md`](resources/review-checklist.md)
  over every touched file (skill files and session-notes files).
  Report the result as a compact table.
- Skill self-check (§10 of CLAUDE.md): re-read this `SKILL.md` and
  confirm every rule and step above was applied. Report any gap
  before finishing.

## Safety rules

- **Evidence-first**: every change must cite the exact `excerpt` that
  justifies it. If the excerpt does not unambiguously specify the
  change, ask the user — do **NOT** invent wording (§1 of CLAUDE.md).
- **Out-of-tree guard**: if an entry's `file` is not under
  `.claude/skills/` or `.claude/commands/`, pause and ask for explicit
  permission before writing (§11 of CLAUDE.md).
- **No silent overwrite**: show the diff for every edit; require
  per-entry approval unless `auto_mode` is on (§3 of CLAUDE.md).
- **Verbatim user edits**: when the user supplies replacement text via
  `edit`, insert it exactly. Do not rephrase.
- **Do not edit `CLAUDE.md`**: if an entry implies a `CLAUDE.md` edit,
  surface it in the finish report and defer — never apply
  automatically.
- **Mark TODO for ambiguity**: if an entry targets a section that is
  missing from the target file ("add a rule about X" without
  specifying where), insert `⚠️ TODO: [what the user requested]` at a
  plausible location and list it in the finish report.

## Resources

Load each resource only when its trigger applies (progressive
disclosure).

- [`resources/workflow.md`](resources/workflow.md) — detailed
  walkthrough with example prompts for Steps 1–5.
  **Invoke when**: starting a run, or when the user asks how the
  workflow proceeds.

- [`resources/kind-playbook.md`](resources/kind-playbook.md) — how to
  translate each `kind` (`approval`, `correction`, `preference`,
  `missed-step`, `rename`, `other`) into a concrete edit.
  **Invoke when**: drafting the diff for an entry in Step 2.

- [`resources/entry-dialog.md`](resources/entry-dialog.md) — exact
  prompt template for the per-entry approval dialog.
  **Invoke when**: showing an entry to the user in Step 2.

- [`resources/review-checklist.md`](resources/review-checklist.md) —
  small-review checklist for edited skill files and session-notes
  files, plus skill self-check.
  **Invoke when**: entering Step 5, or after applying any single
  change in Step 2.

## Finish report

Report to the user:

- counts per session-notes file
  (`applied / edited / skipped / deferred / already-present / error`),
- the touched-file review table,
- the skill self-check result,
- the updated `status:` of every session-notes file processed,
- any entry that was flagged as implying a `CLAUDE.md` change and
  deferred.

## Out of scope

- Generating or editing documentation pages.
- Editing `CLAUDE.md` (project-wide rules).
- Modifying files outside `.claude/skills/` or `.claude/commands/`
  without explicit user authorization.
- Running `/docs-review` or any documentation-level review.
- Deleting session-notes files.
