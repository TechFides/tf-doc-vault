---
description: "Generate SVG wireframes for already-generated documentation pages, by attaching them to `<!-- wireframe-anchor: ... -->` markers. Runs LAST (after text and diagrams). Uses the codebase, generated docs, existing `wf-fragments/`, and ALWAYS asks the user for optional screenshots as a temporary hint. Validates every generated SVG (no JavaScript, no event handlers, XML well-formed) and performs a consistency check between each wireframe and the host page text. Retrospectively promotes user-approved inline wireframe blocks to reusable fragments."
argument-hint: [auto]   # optional: pass 'auto' to reduce per-wireframe pausing (opt-in only)
---

# /docs-wireframes

You are running the **wireframes phase** as a single phase. Follow the
rules in `CLAUDE.md` at project root (they override any conflicting
defaults).

This command is appropriate when:

- Textual docs (technical and functional) and diagrams are generated
  and their content is confirmed stable by the user.
- You want to attach SVG wireframes to pages that already have
  `<!-- wireframe-anchor: <id> -->` markers.
- You want to (re-)generate wireframes after text or diagram changes.

Do **NOT** use this command for text generation, diagrams, pre-code,
sales, or reviews; those have their own commands.

## Precondition check (ALWAYS)

Before anything else:

1. Ask the user: "Is the textual content (technical and functional)
   stable enough to attach wireframes? (y / no, run text phases first)".
2. Ask the user: "Are diagrams already generated and stable?
   (y / yes, skip diagram check / no, run /docs-diagrams first)".
3. If the user answers `no` to either, stop and point them to the
   relevant command (`/docs-technical`, `/docs-functional`,
   `/docs-diagrams`). Wireframes are the most expensive phase to fix,
   do not proceed on unstable text or diagrams.

## Screenshots question (ALWAYS)

Regardless of `auto_mode`, and regardless of whether the user has
mentioned screenshots, **ALWAYS** ask:

> "Do you have any UI screenshots you want to provide as a temporary
> hint for this run? They will NOT be stored in the repo and will be
> discarded at the end of the run. (list paths / none)".

Record the answer as `screenshots` in the run context.

## Argument

- empty → default mode: pause after every inserted wireframe for user
  review.
- `auto` → `auto_mode = true`. **Only** valid if the user has already
  iterated several successful runs of this command and explicitly opts
  in (§3 of CLAUDE.md). If the current session has no prior successful
  runs of this command, refuse `auto` and fall back to the default.
  Note: the screenshots question is asked EVEN WHEN `auto_mode` is on.

## Preflight (ALWAYS)

1. Load the `docs-wireframes-from-code` skill.
2. Collect and confirm the inputs from its "Inputs" section:
   a. `source_path`: repository or folder with the code.
   b. `version_folder`: `docs/vN/` (must already contain text pages
   with wireframe anchors; if none, refuse and point the user to
   `/docs-technical` / `/docs-functional`).
   c. `source_version`: resolve from git tag → `package.json`.
   d. `current_date`: from system context.
   e. `auto_mode`: from the argument, with the safety rule above.
   f. `anchors_report`: if not handed over by an orchestrator, scan
   `docs/<version>/` yourself for every
   `<!-- wireframe-anchor: <id> -->`. If none are found, stop and
   tell the user: "No wireframe anchors found. Either insert
   anchors in the relevant pages first, or run `/docs-functional`
   which will insert them automatically."
   g. `screenshots`: from the mandatory question above.
3. Produce a **run context** summary:

   ```
   source_path:    <path>
   version_folder: docs/v1/
   scope:          wireframes (single phase)
   source_version: v1.4.2
   anchors_found:  <N>
   screenshots:    none / <list>
   auto_mode:      off / on
   current_date:   <from system>
   ```

   Ask: "Proceed with this run context? (y / edit / cancel)".

**NEVER** start generation before the user confirms.

## Execution

Follow the workflow in `docs-wireframes-from-code/SKILL.md`:

- **Step 1**: Collect anchors, screenshots (if any), and plan. Scan
  `wf-fragments/` via `resources/fragment-catalog.md`. Present the
  wireframe plan (anchor, host file, target device/skin, candidate
  fragments, source evidence) and wait for user confirmation.
- **Step 2**: Generate wireframe-by-wireframe. Use fragments when
  available; extend or create new SVG only from code + approved
  screenshots. **ALWAYS validate** every SVG via
  `scripts/validate-svg.sh`; reject if it contains `<script>`, any
  `on*` event handlers, `javascript:` URIs, executable
  `<foreignObject>` content, or is not XML well-formed. TODOs live in
  the host Markdown, NEVER inside the SVG.
- **Step 3**: Consistency check (wireframe vs. host text). Mark
  contradictions with `⚠️ TODO: wireframe–text contradiction: ...` in
  the host page. Mark unrepresented UI elements with
  `⚠️ TODO: wireframe gap: ...`. Do **NOT** silently change text or
  wireframe to match.
- **Step 4**: Insert into host page and save. Pause after each unless
  `auto_mode` is on.
- **Step 5**: Cross-reference, fragment hygiene, and **retrospective
  fragment update**. For each user-approved inline block, ask
  `a) add as new fragment / b) update existing fragment /
c) skip`. On `a` or `b`, write/update `wf-fragments/<path>` and
  update `wf-fragments/README.md`. On `b`, backfill the reused
  fragment into earlier host pages that contain the equivalent inline
  block (within this run) and re-validate.
- **Step 6**: Discard temporary screenshots. Prepare the handoff
  payload.

## TODO resolution (always run at the end)

Execute the TODO resolution flow from §2 of CLAUDE.md:

1. Collect every `⚠️ TODO` marker produced in this run, grouped by
   kind:
   - `missing-evidence`,
   - `wireframe-text-contradiction` (Step 3 of the skill),
   - `wireframe-gap` (Step 3 of the skill).
2. For each item ask `a) skip / b) user input / c) keep TODO`.
   For `wireframe-text-contradiction`, the user's decision MUST also
   specify **which side (wireframe or text)** should change; Claude
   then applies that edit and re-validates the affected wireframe.
3. Apply the chosen actions.
4. Re-run the small review on any files changed during resolution.

## Collect session notes for future skill learning

After TODO resolution finishes and **before** reporting the finish,
run the session-notes collection as defined in the orchestrator command
`/docs-generate-from-code` (section "Collect session notes for future
skill learning"). Scope the collection to feedback about
`docs-wireframes-from-code` and this command. Save to:

```
.claude/session-notes/<YYYY-MM-DD-HHMM>.md
```

with frontmatter `consumed_by: docs-learn-from-session` and
`status: unprocessed`. Ask the user to keep / discard / open to review.

**Do NOT update skill files** from this command; that is reserved for
the planned skill `docs-learn-from-session`.

## Finish

Report:

- list of wireframes generated (anchor, host file, fragments used,
  lines of SVG),
- TODO counts per wireframe and total, split by kind:
  - `missing-evidence`,
  - `wireframe-text-contradiction`,
  - `wireframe-gap`,
- list of anchors deferred or skipped (reason),
- list of orphan wireframes and unmatched anchors,
- fragments added or updated in `wf-fragments/` (path, reason,
  backfilled host pages),
- confirmation that all temporary screenshots were discarded,
- SVG validation result per file (pass / fail + reason),
- small-review table (§10 of CLAUDE.md),
- skill self-check result,
- path and entry count of the session-notes file, or `discarded`.

## Hand-off hints (for the user)

- If contradiction- or gap-TODOs remain `keep`, flag that they will
  resurface in any later run and should be resolved before publishing.
- If new fragments were added, remind the user that they can now be
  reused in future runs via the fragment catalog.

## Out of scope for this command

- Generating Markdown text pages → `/docs-technical`, `/docs-functional`.
- Mermaid / PlantUML diagrams → `/docs-diagrams`.
- Pre-code / sales / review flows.
- Any code changes outside `docs/` and `wf-fragments/`.
