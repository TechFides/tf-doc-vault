---
description: Generate documentation from an existing codebase. Orchestrates technical → functional → diagrams → wireframes phases, with explicit human-in-the-loop pauses between each.
argument-hint: [scope] # optional: technical | functional | diagrams | wireframes | full (default)
---

# /docs-generate-from-code

You are starting a **documentation generation run from an existing
codebase**. Follow the rules in `CLAUDE.md` at project root (they
override any conflicting defaults).

## Scope selection

The user may have passed a scope as `$ARGUMENTS`:

- empty / `full` → run all phases in order:
  `technical` → `functional` → `diagrams` → `wireframes`.
- `technical` | `functional` | `diagrams` | `wireframes` → single phase.

If `$ARGUMENTS` contains anything else, stop and ask the user to clarify.

## Required preflight (ALWAYS do this before any generation)

1. Load the `docs-from-code` skill (orchestrator).
2. Collect and confirm the five inputs from the orchestrator's
   "Inputs you must confirm" section:
   a. `source_path` — repository or folder with the code.
   b. `version_folder` — `docs/vN/` (create `docs/v1/` if none exist).
   c. `scope` — from `$ARGUMENTS` or ask the user.
   d. `source_version` — resolve from git tag → `package.json`; mark
   `⚠️ TODO: source version` if neither exists.
   e. `screenshots` — only when scope includes `wireframes`: ALWAYS ask
   even if the user did not mention them.
3. Detect `docs/` state. If files would be overwritten, list them and
   ask per §11 of CLAUDE.md.
4. Produce a **run context** summary and show it to the user before
   starting:

   ```
   source_path:    <path>
   version_folder: docs/v1/
   scope:          full
   source_version: v1.4.2
   screenshots:    none / <list>
   auto_mode:      off
   current_date:   <from system>
   ```

   Ask: "Proceed with this run context? (y / edit / cancel)".

**NEVER** start a phase before the user confirms the run context.

## Orchestration

Based on the chosen scope, delegate to the phase skills via the
orchestrator's Step 2:

| Scope        | Phase skill invoked         |
| ------------ | --------------------------- |
| `technical`  | `docs-technical-from-code`  |
| `functional` | `docs-functional-from-code` |
| `diagrams`   | `docs-diagrams-from-code`   |
| `wireframes` | `docs-wireframes-from-code` |
| `full`       | All four, in order          |

For `full`, after each phase completes:

1. Run the small in-run review (§10 of CLAUDE.md) on the files that
   phase produced.
2. Show the review table to the user.
3. Ask: "Phase `<X>` finished. Review the generated files. Proceed to
   phase `<Y>`? (y / n / stop)."
4. **NEVER** auto-advance without explicit user confirmation unless
   `auto_mode` is on.

## TODO resolution (always run at the end of the run)

After the last phase of this run finishes, execute the TODO resolution
flow from §2 of CLAUDE.md:

1. Collect every `⚠️ TODO` marker produced in this run, grouped by
   kind:
   - `missing-evidence`
   - `diagram-text-contradiction`
   - `wireframe-text-contradiction`
   - `wireframe-gap`
   - `link to technical/...`
   - other (list verbatim)
2. For each item ask the user `a) skip / b) user input / c) keep TODO`.
3. Apply the chosen action.
4. Re-run the small review on any files you changed during resolution.

## Collect session notes for future skill learning

After TODO resolution finishes and **before** reporting the finish,
gather the feedback the user gave during this run so a later, dedicated
skill can use it to improve the skills themselves.

1. **What to collect** — every user utterance during this run that is
   feedback about the **skills**, not about the generated content:
   - approvals / rejections of proposed plans,
   - corrections to skill outputs (style, structure, language, scope,
     ordering, resource usage),
   - preferences stated inline (e.g. "ALWAYS ask X", "rename Y", "use
     Z convention", "do W before V"),
   - points where the user had to explain the same thing twice,
   - moments where a skill missed something the user had to add.

   Do **NOT** collect:
   - choices the user made during TODO resolution (that is content, not
     skill feedback),
   - content-level edits the user made to generated files (those are
     captured in the docs themselves),
   - chit-chat unrelated to the skill behavior.

2. **How to record** — capture the user's words verbatim (no
   paraphrasing that changes meaning). Tag each excerpt:

   ```yaml
   - skill: docs-technical-from-code # which skill it concerns
     file: .claude/skills/docs-technical-from-code/SKILL.md # or N/A
     kind: preference # approval / correction / preference / missed-step / rename / other
     excerpt: |
       "ALWAYS ask the user, at every run..."
     context: |
       Short neutral note on what triggered the feedback.
   ```

3. **Where to save** — write the collection to a run-scoped notes file:

   ```
   .claude/session-notes/<YYYY-MM-DD-HHMM>.md
   ```

   Use a frontmatter block at the top:

   ```markdown
   ---
   run_date: 2026-04-23 14:05
   scope: full
   source_version: v1.4.2
   consumed_by: docs-learn-from-session # planned, not yet implemented
   status: unprocessed
   ---
   ```

4. **Handoff announcement** — tell the user:

   > "Session notes saved to `<path>` (N entries). They will be fed
   > into the planned skill `docs-learn-from-session` when it is
   > built. Keep the file? (y / discard / open to review)."
   - `y` → leave the file, mark nothing else.
   - `discard` → delete the file.
   - `open to review` → show the file contents and re-ask.

5. **Do NOT update skill files** from this command. Skill updates are
   the exclusive responsibility of `docs-learn-from-session`, which is
   **not yet implemented**. This command only collects the material.

## Finish

Report to the user:

- counts per phase (files generated, TODOs by kind, TODOs resolved),
- the small-review table for the whole run,
- the skill self-check result (§10 of CLAUDE.md): every skill that ran
  was re-read and confirmed to have applied its rules.
- path and entry count of the session-notes file, or `discarded` if the
  user chose not to keep it.

Do **NOT** run `/docs-review` from here — comprehensive review is a
separate command (planned, not yet implemented).

## Out of scope for this command

- Pre-code / design documentation.
- Sales or marketing documentation.
- Reviewing existing documentation.
- Any code changes outside `docs/`.
