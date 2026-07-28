---
description: Generate diagrams (Mermaid primary, PlantUML fallback) for already-generated documentation pages, by attaching them to `<!-- diagram-anchor: ... -->` markers. Runs AFTER textual content is confirmed stable. Does NOT invent diagrams for pages without anchors. Performs a consistency check between each diagram and the host page text.
argument-hint: [auto]   # optional: pass 'auto' to reduce per-diagram pausing (opt-in only)
---

# /docs-diagrams

You are running the **diagrams phase** as a single phase. Follow the
rules in `CLAUDE.md` at project root (they override any conflicting
defaults).

This command is appropriate when:

- Textual docs (technical and/or functional) are generated and their
  content is confirmed stable by the user.
- You want to attach diagrams to pages that already have
  `<!-- diagram-anchor: <name> -->` markers.
- You want to (re-)generate diagrams after text changes to fix
  contradictions flagged in a previous run.

Do **NOT** use this command for text generation, wireframes, pre-code,
sales, or reviews; those have their own commands.

## Precondition check (ALWAYS)

Before anything else:

1. Ask the user: "Is the textual content (technical and functional)
   stable enough to attach diagrams? (y / no, run text phases first)".
2. If the user says no, stop and point them to `/docs-technical` and
   `/docs-functional`. Diagrams are expensive to fix, so do not proceed
   on unstable text.

## Argument

- empty → default mode: pause after every inserted diagram for user
  review.
- `auto` → `auto_mode = true`. **Only** valid if the user has already
  iterated several successful runs of this command and explicitly opts
  in (§3 of CLAUDE.md). If the current session has no prior successful
  runs of this command, refuse `auto` and fall back to the default.

## Preflight (ALWAYS)

1. Load the `docs-diagrams-from-code` skill.
2. Collect and confirm the inputs from its "Inputs" section:
   a. `source_path`: repository or folder with the code.
   b. `version_folder`: `docs/vN/` (must already contain text pages;
   if empty, refuse and point the user to `/docs-technical` /
   `/docs-functional`).
   c. `source_version`: resolve from git tag → `package.json`.
   d. `current_date`: from system context.
   e. `auto_mode`: from the argument, with the safety rule above.
   f. `anchors_report`: if not handed over by an orchestrator, scan
   `docs/<version>/` yourself for every
   `<!-- diagram-anchor: <name> -->`. If none are found, stop and
   tell the user: "No diagram anchors found. Either insert anchors
   in the relevant pages first, or run `/docs-technical` /
   `/docs-functional` which will insert them automatically."
3. Produce a **run context** summary:

   ```
   source_path:    <path>
   version_folder: docs/v1/
   scope:          diagrams (single phase)
   source_version: v1.4.2
   anchors_found:  <N>
   auto_mode:      off / on
   current_date:   <from system>
   ```

   Ask: "Proceed with this run context? (y / edit / cancel)".

**NEVER** start generation before the user confirms.

## Execution

Follow the workflow in `docs-diagrams-from-code/SKILL.md`:

- **Step 1**: Collect anchors and plan. Classify each anchor by type
  using `resources/diagram-type-decision.md`. Present the diagram plan
  (anchor, host file, type, source evidence) and wait for user
  confirmation.
- **Step 2**: Generate diagram-by-diagram. Mermaid first, PlantUML
  fallback only when Mermaid cannot express it. **ALWAYS validate
  syntax** via `scripts/validate-diagram.sh` before leaving the step.
- **Step 3**: Consistency check (diagram vs. host text). Mark
  contradictions with `⚠️ TODO: diagram–text contradiction: ...` in
  the host page. Do **NOT** silently change text or diagram to match.
- **Step 4**: Insert into host page and save. Pause after each unless
  `auto_mode` is on.
- **Step 5**: Cross-reference check. List unmatched anchors and
  orphan diagrams.
- **Step 6**: Prepare the handoff payload.

## TODO resolution (always run at the end)

Execute the TODO resolution flow from §2 of CLAUDE.md:

1. Collect every `⚠️ TODO` marker produced in this run, grouped by
   kind:
   - `missing-evidence` (Step 2 item 4 of the skill),
   - `diagram-text-contradiction` (Step 3 of the skill).
2. For each item ask `a) skip / b) user input / c) keep TODO`.
   For `diagram-text-contradiction`, the user's decision MUST also
   specify **which side (diagram or text)** should change; Claude then
   applies that edit and re-validates the affected diagram.
3. Apply the chosen actions.
4. Re-run the small review on any files changed during resolution.

## Collect session notes for future skill learning

After TODO resolution finishes and **before** reporting the finish,
run the session-notes collection as defined in the orchestrator command
`/docs-generate-from-code` (section "Collect session notes for future
skill learning"). Scope the collection to feedback about
`docs-diagrams-from-code` and this command. Save to:

```
.claude/session-notes/<YYYY-MM-DD-HHMM>.md
```

with frontmatter `consumed_by: docs-learn-from-session` and
`status: unprocessed`. Ask the user to keep / discard / open to review.

**Do NOT update skill files** from this command; that is reserved for
the planned skill `docs-learn-from-session`.

## Finish

Report:

- list of diagrams generated (anchor, host file, type, lines of code),
- TODO counts per diagram and total, split by kind:
  - `missing-evidence`,
  - `diagram-text-contradiction`,
- list of anchors deferred (type ambiguous),
- list of orphan diagrams and unmatched anchors from Step 5,
- any image assets created and their paths,
- small-review table (§10 of CLAUDE.md),
- skill self-check result,
- path and entry count of the session-notes file, or `discarded`.

## Hand-off hints (for the user)

- If the user plans to run `/docs-wireframes` next, remind that
  wireframes run LAST and that running them on stable diagrams is fine;
  the wireframes phase will ALWAYS ask for screenshots.
- If contradiction-TODOs remain `keep`, flag that they will resurface
  in any later run and should be resolved before publishing.

## Out of scope for this command

- Generating Markdown text pages → `/docs-technical`, `/docs-functional`.
- SVG wireframes → `/docs-wireframes`.
- Pre-code / sales / review flows.
- Any code changes outside `docs/`.
