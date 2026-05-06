# TODO resolution dialog

The orchestrator runs this once, at the end of a run (§2 of
`CLAUDE.md`). Phase skills only _emit_ TODOs — they never resolve them.

## TODO kinds produced across phases

| Kind                           | Emitted by | Marker shape                                                                                |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| `missing-evidence`             | all phases | `⚠️ TODO: [what is missing]`                                                                |
| `link to technical/...`        | functional | `⚠️ TODO: link to technical/<expected-path>`                                                |
| `diagram-text-contradiction`   | diagrams   | `⚠️ TODO: diagram–text contradiction — <desc>. Diagram says: <X>. Text says: <Y>.`          |
| `wireframe-text-contradiction` | wireframes | `⚠️ TODO: wireframe–text contradiction — <desc>. Wireframe shows: <X>. Scenario says: <Y>.` |
| `wireframe-gap`                | wireframes | `⚠️ TODO: wireframe gap — <what is missing, where>.`                                        |
| other                          | any        | list verbatim                                                                               |

## Step 1 — Collect and group

Collect every `⚠️ TODO` marker from files produced in this run. Group
by kind in the order above. Show a summary first:

> "Run finished. Found N TODOs:
>
> - missing-evidence: 5 (in 3 files)
> - link to technical/…: 2 (in 1 file)
> - diagram-text-contradiction: 1 (in 1 file)
>   Let's resolve them now."

## Step 2 — Per-item dialog

For each TODO:

> "File: `docs/v1/functional/scenarios/auth/sc-01-login.md`
> Line 42
> Kind: missing-evidence
> TODO: `⚠️ TODO: rate-limit threshold`
>
> a) skip — remove the TODO block (and the surrounding section if empty)
> b) user input — you provide the missing information
> c) keep TODO — leave as-is
>
> Your choice?"

### Special rules per kind

- **`link to technical/...`**: when the technical section was not
  generated in this run, default recommendation is **c) keep TODO** —
  it will resolve naturally when `/docs-technical` runs.
- **`diagram-text-contradiction`**: option `b)` must also specify
  **which side (diagram or text)** should change. Claude applies the
  edit and re-validates the diagram via `scripts/validate-diagram.sh`.
- **`wireframe-text-contradiction`**: same as above — user specifies
  wireframe or text side, Claude applies the edit and re-validates the
  SVG via `scripts/validate-svg.sh`.
- **`wireframe-gap`**: option `b)` typically means the user provides
  the missing visual information (a new screenshot or a description);
  Claude updates the wireframe and re-validates.

## Step 3 — Apply and re-review

- Apply the chosen action to the file.
- Re-run `review-checklist-small.md` on every file changed during
  resolution.
- Report counts: `{ skipped, user-resolved, kept, failed }`.

## Rules

- **NEVER** silently resolve a TODO. Every TODO needs an explicit a/b/c
  decision.
- **NEVER** fabricate content in option `b)` — only insert what the
  user literally provides.
- If the user opts for `c) keep TODO`, surface it in the finish report
  so later runs know it is pending.
