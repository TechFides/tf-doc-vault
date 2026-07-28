# docs-learn-from-session: detailed walkthrough

Use this walkthrough when starting a run or when the user asks how the
workflow proceeds. It expands the 5 steps in `SKILL.md` with concrete
prompts and transitions.

## Overview

Preflight (inputs) → Load & group notes → Per-entry dialog + apply →
Update session-notes status → Small review + skill self-check → Finish.

## Step 0: Preflight

Collect and confirm the four inputs listed in `SKILL.md`:

```
session_notes_folder: .claude/session-notes/
scope:                unprocessed
target_whitelist:     .claude/skills/**, .claude/commands/**
auto_mode:            off
current_date:         <from system>
```

Show the summary and wait for `y / edit / cancel`.

## Step 1: Load and group notes

1. Resolve the scope filter to a concrete list of `.md` files.
2. For each file:
   - parse frontmatter; skip if `consumed_by` ≠ `docs-learn-from-session`;
   - parse the YAML list of entries;
   - validate the five required fields (`skill`, `file`, `kind`,
     `excerpt`, `context`).
3. Malformed entries → list them, ask `fix / skip / abort`.
4. Build the plan table (note file × skill × target file × kind ×
   entry count) and show it to the user.

Example prompt:

> "Found 2 unprocessed session-notes files with 6 entries total.
> Proceed to process them one-by-one? (y / edit scope / cancel)"

**NEVER** proceed past this step without explicit `y`.

## Step 2: Per-entry dialog + apply

For each entry (in the order shown in the plan):

1. Read the target file. Locate the block the entry references.
2. Draft the edit using `kind-playbook.md`:
   - quote the `excerpt` verbatim in the rationale;
   - produce a minimal diff.
3. Show `entry-dialog.md` to the user.
4. Apply the user's choice (`y / edit / skip / defer`).
5. Re-read the file; run the relevant checklist subset from
   `review-checklist.md` (frontmatter intact, Markdown parses,
   internal links still resolve).

Example dialog header:

> "Entry 3 / 6, session note `2026-04-23-1405.md`
> Target: `.claude/skills/docs-technical-from-code/SKILL.md`
> Kind: preference
> Excerpt: \"ALWAYS ask the user which groups to skip before writing.\"
>
> Proposed change: insert a new bullet under §Workflow → Step 1, after
> the existing `skip: no evidence` rule (see diff below).
>
> (y / edit / skip / defer)?"

## Step 3: Contradictions and duplicates

- Two entries → same block → contradictory guidance: surface both
  excerpts; ask which to apply or how to combine. Do **NOT** auto-pick.
- Entry restates an existing rule verbatim: mark `already-present`,
  skip, report in finish.
- Target block not found: ask the user to point to the correct
  location; if they cannot, `skip` with a note.

## Step 4: Update session-notes status

Once every entry in a given session-notes file has been processed,
rewrite its frontmatter:

```yaml
---
run_date: 2026-04-23 14:05
scope: full
source_version: v1.4.2
consumed_by: docs-learn-from-session
status: processed # or: partial | error
processed_at: 2026-04-24 10:12
deferred_entries: [] # only when status == partial
last_error: "" # only when status == error
---
```

**NEVER** delete the file.

## Step 5: Small review + skill self-check

- Run `review-checklist.md` over every file this run touched.
- Present the table to the user.
- Re-read this skill's `SKILL.md` and confirm each listed rule and
  step was applied.

## Finish

Report:

- per-session-notes counts
  (`applied / edited / skipped / deferred / already-present / error`),
- review table for all touched files,
- self-check result,
- any deferred `CLAUDE.md`-implying entries surfaced for the user.
