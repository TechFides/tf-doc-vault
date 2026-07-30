# Small-review checklist for docs-learn-from-session

Run this checklist:

- **Inline**: after each entry is applied in Step 2 (over the single
  edited file).
- **Final**: over every touched file at the end of the run (Step 5),
  and present the result as a compact table.

## Checklist: edited skill or command files

For each `.claude/skills/**/SKILL.md`, `.claude/skills/**/resources/*.md`,
or `.claude/commands/*.md` touched this run:

- [ ] File parses as valid Markdown.
- [ ] Frontmatter (`name`, `description`) is present and unchanged
      unless the entry explicitly targeted it; `description` still
      describes trigger conditions clearly.
- [ ] Internal links (`[text](path)`) still resolve to existing
      files.
- [ ] Resource files referenced in the SKILL.md `## Resources`
      section still exist on disk.
- [ ] No orphan resource file (present on disk, not referenced by any
      `SKILL.md`). Report, do not delete.
- [ ] No duplicate rule text introduced (check against the same
      section before and after the edit).
- [ ] English prose style matches the rest of the file (skill files
      are English; generated-content rules in Czech stay untouched).
- [ ] Emphasis keywords (`NEVER`, `ALWAYS`, `IMPORTANT`) follow the
      file's existing convention.
- [ ] If the edit introduced a `⚠️ TODO` marker, the marker is listed
      in the finish report.

## Checklist: updated session-notes files

For each `.claude/session-notes/*.md` this run updated:

- [ ] Frontmatter still parses as YAML.
- [ ] `status:` is one of `processed | partial | error`.
- [ ] `processed_at:` present in `YYYY-MM-DD HH:MM` format.
- [ ] `deferred_entries:` present iff `status: partial`.
- [ ] `last_error:` present iff `status: error`.
- [ ] The entry list itself was **not** modified; only frontmatter
      changed.

## Review-table format

Present results compactly, one row per touched file:

```
| File                                                      | Parse | Links | Frontmatter | TODO |
| --------------------------------------------------------- | ----- | ----- | ----------- | ---- |
| .claude/skills/docs-technical-from-code/SKILL.md          | ok    | ok    | ok          | 0    |
| .claude/session-notes/2026-04-23-1405.md                  | ok    | n/a   | ok          | 0    |
```

## Skill self-check (Step 5, once per run)

Re-read this skill's `SKILL.md` and confirm:

- Every numbered step in `## Workflow` was executed (or explicitly
  skipped with user confirmation).
- Every bullet in `## Safety rules` was applied, in particular:
  out-of-tree guard, no silent overwrite, verbatim user edits, no
  `CLAUDE.md` edits, ambiguity marked as TODO.
- Every resource listed in `## Resources` was loaded **only** when
  its trigger applied (progressive disclosure, not upfront).
- The finish report contains every item listed under
  `## Finish report`.

Any gap must be surfaced to the user **before** the run is reported
as finished.
