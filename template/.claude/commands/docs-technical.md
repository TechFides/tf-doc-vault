---
description: Generate only the technical documentation phase from an existing codebase (tech stack, infrastructure, CI/CD, architecture, security, integrations, tests, monitoring, …). Text only, no diagrams and no wireframes. Pauses after each generated file.
argument-hint: [auto] # optional: pass 'auto' to reduce file-by-file pausing (opt-in only)
---

# /docs-technical

You are running the **technical documentation phase** from an existing
codebase, as a single phase without the other phases. Follow the rules
in `CLAUDE.md` at project root (they override any conflicting defaults).

This command is appropriate when:

- You already have the codebase and want to produce only the technical
  section of the docs.
- You want to (re-)run the technical phase after code changes.
- You want to iterate on the technical phase before starting functional.

Do **NOT** use this command for functional docs, diagrams, wireframes,
pre-code analyses, or reviews; those have their own commands.

## Argument

- empty → default mode: pause after every generated file for user
  review.
- `auto` → `auto_mode = true`. **Only** valid if the user has already
  iterated several successful runs of this command and explicitly opts
  in (§3 of CLAUDE.md). If the current session has no prior successful
  runs of this command, refuse `auto` and fall back to the default.

## Preflight (ALWAYS)

1. Load the `docs-technical-from-code` skill.
2. Collect and confirm the inputs from its "Inputs" section:
   a. `source_path`: repository or folder with the code.
   b. `version_folder`: `docs/vN/` (create `docs/v1/` if none exist).
   c. `source_version`: resolve from git tag → `package.json`; mark
   `⚠️ TODO: source version` if neither exists.
   d. `current_date`: from system context.
   e. `auto_mode`: from the argument, with the safety rule above.
3. Detect the current state of `docs/<version>/technical/`. If files
   would be overwritten, list them and ask per §11 of CLAUDE.md.
4. Produce a **run context** summary:

   ```
   source_path:    <path>
   version_folder: docs/v1/
   scope:          technical (single phase)
   source_version: v1.4.2
   auto_mode:      off / on
   current_date:   <from system>
   ```

   Ask: "Proceed with this run context? (y / edit / cancel)".

**NEVER** start generation before the user confirms.

## Execution

Follow the workflow in `docs-technical-from-code/SKILL.md`:

- **Step 1**: Comprehensive scan and plan. Use
  `resources/scan-checklist.md` and `resources/proposed-structure.md`.
  Present the generation plan as a table and wait for user confirmation
  (or `auto_mode`).
- **Step 2**: Generate file-by-file, pausing after each unless
  `auto_mode` is on.
- **Step 3**: Section and group `index.md` files.
- **Step 4**: Prepare the handoff payload (file list, per-file TODOs,
  skipped groups, non-proposed groups created).

## TODO resolution (always run at the end)

Execute the TODO resolution flow from §2 of CLAUDE.md:

1. Collect every `⚠️ TODO` marker produced in this run, grouped by kind
   (for a single-phase run, typically `missing-evidence` only; any
   other kind is unexpected and worth reporting).
2. For each item ask `a) skip / b) user input / c) keep TODO`.
3. Apply the chosen action.
4. Re-run the small review on any files changed during resolution.

## Collect session notes for future skill learning

After TODO resolution finishes and **before** reporting the finish,
run the session-notes collection as defined in the orchestrator command
`/docs-generate-from-code` (section "Collect session notes for future
skill learning"). Scope the collection to feedback about
`docs-technical-from-code` and this command. Save to:

```
.claude/session-notes/<YYYY-MM-DD-HHMM>.md
```

with frontmatter `consumed_by: docs-learn-from-session` and
`status: unprocessed`. Ask the user to keep / discard / open to review.

**Do NOT update skill files** from this command; that is reserved for
the planned skill `docs-learn-from-session`.

## Finish

Report:

- list of files generated under `docs/<version>/technical/`,
- TODO counts per file (and total), split by kind,
- list of skipped proposed groups and the reason,
- list of non-proposed groups created in this run (if any),
- small-review table (§10 of CLAUDE.md),
- skill self-check result,
- path and entry count of the session-notes file, or `discarded`.

## Hand-off hints (for the user)

- If the user plans to run `/docs-functional` next, mention that the
  functional phase can now use this technical section as its secondary
  source (§ Source hierarchy in `docs-functional-from-code/SKILL.md`).
- If the user plans to run `/docs-diagrams`, remind that diagrams
  should only run once the technical text is confirmed stable.

## Out of scope for this command

- Functional docs → `/docs-functional`.
- Diagrams → `/docs-diagrams`.
- Wireframes → `/docs-wireframes`.
- Pre-code / sales / review flows.
- Any code changes outside `docs/`.
