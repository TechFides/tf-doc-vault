# Orchestrator workflow: detailed walkthrough

Use this walkthrough when starting a new run or when the user asks how
the from-code workflow proceeds. It expands the 5 steps in `SKILL.md`
with concrete prompts and transitions.

## Overview

Preflight → Phase dispatch → (per phase: plan → generate → small review
→ user OK) → TODO resolution → Small review (whole run) → Skill
self-check → Finish.

## Step 1: Preflight

1. Read `CLAUDE.md` at project root.
2. Collect the five inputs (`source_path`, `version_folder`, `scope`,
   `source_version`, `screenshots`).
3. Show the run context; wait for `y / edit / cancel`.

Example prompt to the user:

> "Run context prepared:
> source_path: ./my-app
> version_folder: docs/v1/
> scope: full
> source_version: v1.4.2
> screenshots: none
> auto_mode: off
> current_date: 2026-04-23
> Proceed? (y / edit / cancel)"

## Step 2: Phase dispatch

For the chosen scope, invoke the phase skill with the run context (see
`run-context-template.md`). For `full`, run in order:
`technical → functional → diagrams → wireframes`.

Between phases:

> "Phase `technical` finished: 12 files generated, 3 TODOs. Review
> the files. Proceed to `functional`? (y / n / stop)"

**NEVER** auto-advance without user `y` unless `auto_mode` is on.

## Step 3: TODO resolution

Invoke `todo-resolution.md` once, at the end of the run. Group TODOs
by kind, walk through each with the a/b/c dialog.

## Step 4: Small in-run review

Run `review-checklist-small.md` over every file the run touched.
Present the review table to the user.

## Step 5: Skill self-check

Re-read the `SKILL.md` of every phase skill that ran. Confirm each rule
and step was applied. Report any gap.

## Finish

Report:

- counts per phase (files, TODOs),
- the review table,
- self-check result,
- session-notes path + entry count (or `discarded`).

Do NOT run `/docs-review` from here; it is a separate, planned command.
