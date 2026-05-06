---
description: Generate only the functional documentation phase from an existing codebase (overview, glossary, actors, screens, scenarios list, business rules, notifications, reports, and per-scenario detail pages with wireframe anchors). Uses the codebase as primary source and any already-generated technical section as secondary digested source. Text only — no diagrams, no wireframes. Pauses after each generated file.
argument-hint: [auto] # optional: pass 'auto' to reduce file-by-file pausing (opt-in only)
---

# /docs-functional

You are running the **functional documentation phase** from an existing
codebase — as a single phase, without the other phases. Follow the rules
in `CLAUDE.md` at project root (they override any conflicting defaults).

This command is appropriate when:

- You already have the codebase (and ideally the technical section as
  well) and want to produce only the functional part of the docs.
- You want to (re-)run the functional phase after scenario changes in
  the code.
- You want to iterate on functional scenarios before generating diagrams
  and wireframes.

Do **NOT** use this command for technical docs, diagrams, wireframes,
pre-code analyses, or reviews — those have their own commands.

## Argument

- empty → default mode: pause after every generated file for user
  review.
- `auto` → `auto_mode = true`. **Only** valid if the user has already
  iterated several successful runs of this command and explicitly opts
  in (§3 of CLAUDE.md). If the current session has no prior successful
  runs of this command, refuse `auto` and fall back to the default.

## Preflight (ALWAYS)

1. Load the `docs-functional-from-code` skill.
2. Collect and confirm the inputs from its "Inputs" section:
   a. `source_path` — repository or folder with the code.
   b. `version_folder` — `docs/vN/` (create `docs/v1/` if none exist).
   c. `source_version` — resolve from git tag → `package.json`; mark
   `⚠️ TODO: source version` if neither exists.
   d. `current_date` — from system context.
   e. `auto_mode` — from the argument, with the safety rule above.
   f. `technical_docs_path` — resolve to `docs/<version>/technical/`.
   Check whether it exists and contains pages:
   - **exists with content** → set `technical_available = true`;
     this skill will use it as the secondary, digested source.
   - **missing or empty** → set `technical_available = false`;
     cross-links to the technical section will become
     `⚠️ TODO: link to technical/...` markers. Warn the user that
     running `/docs-technical` first usually produces better
     functional output and ask if they want to proceed anyway.
3. Detect the current state of `docs/<version>/functional/`. If files
   would be overwritten, list them and ask per §11 of CLAUDE.md.
4. Produce a **run context** summary:

   ```
   source_path:         <path>
   version_folder:      docs/v1/
   scope:               functional (single phase)
   source_version:      v1.4.2
   technical_available: true / false
   auto_mode:           off / on
   current_date:        <from system>
   ```

   Ask: "Proceed with this run context? (y / edit / cancel)".

**NEVER** start generation before the user confirms.

## Execution

Follow the workflow in `docs-functional-from-code/SKILL.md`:

- **Step 1** — Scan and plan. Use `resources/proposed-structure.md`,
  `resources/scan-checklist.md`, and `resources/scenario-grouping.md`.
  Present the generation plan as a table with the **chosen scenario
  grouping** highlighted and wait for user confirmation.
- **Step 2** — Generate file-by-file in the default order (overview →
  glossary/actors/personas → screens/scenarios-list → business
  rules/notifications/reports → scenarios), pausing after each file
  unless `auto_mode` is on. Scenario files MUST insert the right
  wireframe and diagram anchors.
- **Step 3** — Section and group `index.md` files.
- **Step 4** — Cross-links to the technical section: resolve if the
  target exists, otherwise insert `⚠️ TODO: link to technical/...`
  markers per the skill's rules.
- **Step 5** — Prepare the handoff payload (file list, per-file TODOs,
  skipped pages, wireframe / diagram anchors inserted,
  `technical_available` flag used for the run).

## TODO resolution (always run at the end)

Execute the TODO resolution flow from §2 of CLAUDE.md:

1. Collect every `⚠️ TODO` marker produced in this run, grouped by kind:
   - `missing-evidence`,
   - `link to technical/...`,
   - other (list verbatim).
2. For each item ask `a) skip / b) user input / c) keep TODO`.
   Default recommendation for `link to technical/...` when
   `technical_available == false` is **c) keep TODO** — these will
   resolve naturally when `/docs-technical` runs.
3. Apply the chosen action.
4. Re-run the small review on any files changed during resolution.

## Collect session notes for future skill learning

After TODO resolution finishes and **before** reporting the finish,
run the session-notes collection as defined in the orchestrator command
`/docs-generate-from-code` (section "Collect session notes for future
skill learning"). Scope the collection to feedback about
`docs-functional-from-code` and this command. Save to:

```
.claude/session-notes/<YYYY-MM-DD-HHMM>.md
```

with frontmatter `consumed_by: docs-learn-from-session` and
`status: unprocessed`. Ask the user to keep / discard / open to review.

**Do NOT update skill files** from this command — that is reserved for
the planned skill `docs-learn-from-session`.

## Finish

Report:

- list of files generated under `docs/<version>/functional/`,
- TODO counts per file (and total), split by kind (`missing-evidence`,
  `link to technical/...`, other),
- list of skipped proposed pages and the reason,
- scenario grouping used (primary / fallback, and the axis chosen),
- list of wireframe and diagram anchors inserted (so the later phases
  know where to attach output),
- `technical_available` flag used for the run (true / false),
- small-review table (§10 of CLAUDE.md),
- skill self-check result,
- path and entry count of the session-notes file, or `discarded`.

## Hand-off hints (for the user)

- If `technical_available` was false and there are many
  `link to technical/...` TODOs, suggest running `/docs-technical` next
  and then re-running `/docs-functional` or resolving the link TODOs
  manually.
- If the user plans to run `/docs-diagrams` next, mention that diagram
  anchors are already in place — the diagrams phase will pick them up.
- If the user plans to run `/docs-wireframes` next, mention that
  wireframe anchors are already in place and that the wireframes phase
  will ALWAYS ask for screenshots, so gather them beforehand.

## Out of scope for this command

- Technical docs → `/docs-technical`.
- Diagrams → `/docs-diagrams`.
- Wireframes → `/docs-wireframes`.
- Pre-code / sales / review flows.
- Any code changes outside `docs/`.
