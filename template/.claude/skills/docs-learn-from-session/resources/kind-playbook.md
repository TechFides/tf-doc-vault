# Kind playbook: how to translate each entry `kind` into an edit

The orchestrator collects feedback under six `kind` labels
(see `/docs-generate-from-code`). This playbook defines how to turn each
into a concrete, minimal edit to the target file.

**Global rules** (apply to every kind):

- Quote the `excerpt` verbatim in the rationale shown to the user.
- Prefer the smallest possible edit. One new bullet beats a rewritten
  section.
- Never paraphrase in a way that changes the meaning of the user's
  words (§1 of CLAUDE.md).
- If the target block cannot be located unambiguously, ask the user
  before drafting the diff.

## `approval`

The user confirmed that an existing behavior is correct.

**Default action:** no file change needed. Record as
`already-present` in the run report.

**Upgrade rule:** if the approved behavior is only _implied_ in the
target file (e.g. mentioned in prose but not listed as a hard rule),
propose promoting it to an explicit rule under a **Rules** or
**Workflow** heading, but only with user approval (`y`). Never
auto-promote.

## `correction`

The skill did the wrong thing; the user corrected it.

**Default action:** insert a new rule or amend an existing one in the
section governing that behavior. Typical locations:

- `## Workflow` → the specific step that produced the wrong output;
- `## Rules` / `## Safety rules`: for cross-cutting corrections;
- a per-group template under `resources/templates/`: when the
  correction is content-shaped.

Phrasing convention: use the project's Czech emphasis keywords where
they already appear in the target file (`NIKDY`, `VŽDY`, `DŮLEŽITÉ`);
in English skill files, use `NEVER` / `ALWAYS` / `IMPORTANT` as in the
existing style.

## `preference`

The user stated how they want something done. Often starts with
"always", "never", "prefer", "use X convention".

**Default action:** add a bullet to the most relevant `## Rules`,
`## Safety rules`, or content-style section. If no suitable section
exists, propose creating it (ask first).

Preferences about **ordering** (e.g. "do W before V") go into the
`## Workflow` step ordering, not into rules.

## `missed-step`

The skill forgot to do something that should have happened.

**Default action:** insert a new numbered sub-step in `## Workflow` at
the correct position, or add a bullet to the relevant step's body.
Include the excerpt as justification so a future reader knows why the
step exists.

If the missed step belongs to a resource file (e.g. a checklist), add
it there instead; do not duplicate between `SKILL.md` and the
resource.

## `rename`

The user wants a term, path, heading, field, or file renamed.

**Default action:** produce a find-and-replace diff across the single
target file only. Do **NOT** cascade to sibling files automatically;
list them in the rationale and ask whether to extend the rename
(`y / expand to listed files / skip`).

If the rename affects a frontmatter field or a path that other skills
reference, surface it to the user and defer; a rename of shared
identifiers should be a deliberate, multi-file decision.

## `other`

The entry does not fit the categories above.

**Default action:** show the excerpt to the user and ask what type of
edit they want, with three suggested shapes to choose from:

1. add a bullet to `## Rules` / `## Safety rules`,
2. add a step to `## Workflow`,
3. append a note to the most relevant `resources/*.md`.

Never draft a speculative edit for `other` without the user picking a
shape first.

## When the excerpt is ambiguous

If the `excerpt` describes _what_ but not _where_, and the context
does not pin it down:

- Insert `⚠️ TODO: [verbatim excerpt]` at the most plausible location;
- Surface it in the finish report so the user can decide next run.

This is an exception to the "ask first" rule: marking a TODO preserves
the feedback without inventing a rule. The user can still edit the
TODO into a real rule on the next pass.
