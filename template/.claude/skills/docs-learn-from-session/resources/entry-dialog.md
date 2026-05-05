# Per-entry approval dialog

Use this exact template for Step 2 of the workflow. One block per
entry — **NEVER** batch.

## Template

````
Entry <i> / <N>

Session note: <relative path>
Target file:  <relative path>
Skill:        <name>
Kind:         <approval | correction | preference | missed-step | rename | other>

--- excerpt (verbatim) -----------------------------------------------
<excerpt content, unmodified>
--- context ----------------------------------------------------------
<context content, unmodified>
----------------------------------------------------------------------

Proposed change:
  location:  <section / step / line anchor>
  action:    <insert | edit | delete | no-op>
  rationale: <one line, cites the excerpt>

Diff:
```diff
- <old>
+ <new>
````

Choice? (y / edit / skip / defer)

```

## Choice semantics

| Choice   | Behavior                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| `y`      | Apply the diff exactly as shown.                                                    |
| `edit`   | Ask the user for the replacement text; insert it **verbatim** (no paraphrasing).    |
| `skip`   | Drop this entry for this run. It counts as `skipped` in the report.                 |
| `defer`  | Leave this entry in the session note; the note's `status` will become `partial`.    |

## Special cases to surface inside the dialog

Append a one-line flag under the diff when any of these hold:

- `⚠ target block not found` — ask the user to point to the correct
  location before offering `y`.
- `⚠ already-present` — the proposed text already exists verbatim in
  the target file; default to `skip`.
- `⚠ out-of-tree target` — the file is outside `.claude/skills/` and
  `.claude/commands/`; require an explicit `y` acknowledging the
  out-of-tree write (§11 of CLAUDE.md).
- `⚠ contradicts entry <j>` — another entry earlier in the plan
  proposed the opposite change; show both excerpts before asking.
- `⚠ implies CLAUDE.md change` — the excerpt targets project-wide
  rules; default to `defer`, never `y`.

## After the user replies

- `y` or `edit` → apply, then re-read the file and run the relevant
  subset of `review-checklist.md`.
- `skip` / `defer` → record the choice; do not touch the file.
- On any failure (e.g. file write error, validation failure after the
  edit) revert the change if possible and mark the entry `error` in
  the run report.
```
