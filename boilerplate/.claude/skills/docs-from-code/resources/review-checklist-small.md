# Small in-run review checklist

Used in two places by the orchestrator:

- **Step 4**: small review (§10 of `CLAUDE.md`) over files touched in
  the run.
- **Step 5**: the skill self-check.

A **comprehensive review** (`/docs-review`, planned) is out of scope.

## Per-file checklist

| Check          | Pass when                                                       |
| -------------- | --------------------------------------------------------------- |
| Frontmatter    | `title`, `status`, `updated_at`, `order` present on every page  |
| Order          | `order` is an integer, unique among the folder's siblings       |
| Confluence     | `<!-- confluence: … -->` block present on synced pages          |
| Gen stamp      | `<!-- generated: … -->` on content pages (not `index.md`)       |
| Markdown       | File parses as CommonMark (no unclosed fences, tables valid)    |
| Internal links | Every relative link target exists in the repo                   |
| Language       | Czech diacritics present in prose; technical terms untouched    |
| Emphasis       | Uses NIKDY / VŽDY / DŮLEŽITÉ in prose (not English equivalents) |
| Examples       | Every non-trivial section has at least one concrete example     |
| TODOs          | No `⚠️ TODO` left without a user decision from TODO resolution  |
| Diagrams       | Fenced `mermaid` / `plantuml` blocks pass the syntax validator  |
| Wireframes     | Referenced SVG exists and passes `scripts/validate-svg.sh`      |
| Anchors        | `diagram-anchor` / `wireframe-anchor` comments preserved        |

## Review output

Compact table per file:

```
| File                          | FM | Conf | Stamp | MD | Links | Lang | TODO | Notes                |
| ----------------------------- | -- | ---- | ----- | -- | ----- | ---- | ---- | -------------------- |
| docs/v1/technical/api/….md    | ok | ok   | ok    | ok | ok    | ok   | 0    |                      |
| docs/v1/functional/sc-01.md   | ok | ok   | ok    | ok | miss. | ok   | 1    | broken link to tech  |
```

Columns: **FM** = frontmatter, **Conf** = Confluence mark, **Stamp** =
generation stamp, **MD** = Markdown validity, **Links** = internal
links, **Lang** = language check, **TODO** = unresolved TODO count.

## Skill self-check (Step 5)

For every skill that ran during the session:

1. Re-read its `SKILL.md`.
2. For each "Step X", "Content rule", and "Resource trigger" listed,
   confirm the skill applied it during the run.
3. Report gaps:

```
| Skill                       | Step / Rule                       | Applied | Note                |
| --------------------------- | --------------------------------- | ------- | ------------------- |
| docs-technical-from-code    | Step 3: group/section indexes     | yes     |                     |
| docs-functional-from-code   | Step 4: cross-links to technical  | no      | 2 links not emitted |
```

If any row says `no`, surface it in the finish report and ask the user
whether to fix now or defer.

## Rules

- **NEVER** mark a row `ok` without actually checking, and never guess.
- **ALWAYS** report unresolved TODOs, even if small in count.
- The review is lightweight; **NEVER** attempt semantic checks (e.g.
  "is this diagram useful?"). That belongs to `/docs-review`.
