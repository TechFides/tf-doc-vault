# CLAUDE.md — Documentation Generation Rules

Binding rules for **all documentation generation** in this project
(regardless of source — code, screenshots, sales input, pre-code design, …).
Every documentation skill and command inherits these rules automatically —
do not repeat them in individual skill files.

The **scope** of a run (which documentation type is generated and in which
order) is decided by the **command**, not by this file.

---

## 1. Core principle — Reflect Reality

- **NEVER** invent behavior, fields, endpoints, states, flows, or UI that are
  not present in the source provided by the user (code, config files,
  screenshots, existing docs, interview notes, etc.).
- **ALWAYS** derive content from the actual provided source.
- **IMPORTANT**: if something cannot be unambiguously derived, mark it:

  ```markdown
  > ⚠️ TODO: [short description of the gap]
  ```

- Do not fill gaps with "reasonable assumptions". A TODO is always preferred
  over invented content.

## 2. TODO resolution flow

At the **end of each generation run** (one command = one run), Claude must:

1. Collect every `⚠️ TODO` marker produced in that run.
2. Present the list to the user and for each item ask which action to take:
   - **a)** Skip — remove the TODO block and the surrounding section if empty.
   - **b)** User input — user provides the missing information; Claude
     inserts it verbatim and removes the TODO marker.
   - **c)** Keep TODO — leave the `⚠️ TODO` block in the file as-is.
3. Apply the chosen action, then re-run the small review checklist (§10)
   for that phase before finishing.

## 3. Human-in-the-loop and incremental mode

- Default mode: Claude pauses after every generated file for user review.
- After several successful iterations with the same command, the user may
  explicitly opt-in to reduced pausing (e.g. `--auto` flag or confirmation
  in chat). **NEVER** reduce pausing without explicit user opt-in.
- Diagrams and wireframes are always generated **after** the textual content
  they describe is confirmed stable by the user — but the exact phase order
  is defined by the command, not here.

## 4. Output structure

```
docs/
  v1/                          ← documentation version
    <section>/                 ← top-menu item (e.g. functional-documentation)
      index.md                 ← section index — Czech menu label + order
      <group>/                 ← collapsible group in left menu (e.g. use-cases)
        index.md               ← group index — Czech label, not listed as page
        <page>.md              ← content page (e.g. use-case-1.md)
  v2/                          ← next version
```

- A new documentation version lives in its own `vN/` folder; VitePress adds
  it to the version dropdown automatically.
- `<section>/index.md` and `<group>/index.md` are **mandatory** — they
  provide the Czech menu label and explicit ordering (`order:` in
  frontmatter). They are not rendered as regular pages.
- Folder and file names: `kebab-case`.
- Alphabetical order by default; use `order:` in `index.md` frontmatter or
  `01-`, `02-` prefixes when a fixed order is required.
- Shared images: `docs/public/images/`. Local images: next to the `.md` file.
- `print.md` is generated — do not edit, not versioned.

## 5. Mandatory frontmatter

Every `.md` file starts with:

```markdown
---
title: Název stránky (in Czech)
status: draft
updated_at: 2026-04-23
---
```

| Field        | Values                                        |
| ------------ | --------------------------------------------- |
| `title`      | Shown in navigation and as tab heading        |
| `status`     | `published` / `draft` / `review` / `archived` |
| `updated_at` | `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`            |

- `index.md` files additionally include `order: <number>` for menu ordering.
- If the user does not specify `status`, use `draft`.
- `updated_at` is taken from the system context (`currentDate`).
- The `title` field includes the hierarchical numbering prefix from the
  skill's `proposed-structure.md` (e.g. `2.4 Architektura systému`,
  `2.4.1 Komponentový diagram`). Numbering is authoritative in
  `proposed-structure.md`. Section-level indexes carry **no** numeric
  prefix (e.g. `title: Technická dokumentace`).
- Below the frontmatter, add a generation stamp resolved from git tag first,
  `package.json` second (only for generated content pages, not `index.md`):

  ```markdown
  <!-- generated: 2026-04-23 | source: v1.4.2 -->
  ```

## 6. Confluence CLI marks

Every `.md` intended for Confluence sync must include an HTML comment block
right after the frontmatter describing the target location:

```markdown
<!--
confluence:
  space: CNG
  title: Use case — Login
  parent: Functional documentation
-->
```

The CLI publisher reads these marks; **NEVER** omit them if the file belongs
to a Confluence-synced section.

## 7. Language and style (generated content)

- All generated documentation content is written in **Czech with diacritics**.
- Technical terms (class names, method names, endpoint paths, attribute
  names, enum values) stay in the original language (usually English).
- Writing style: technical, concise, no filler.
- **ALWAYS include examples**, not only descriptions — for every non-trivial
  concept add a code snippet, request/response example, or concrete scenario.
- Use emphasis keywords in Czech inside the generated docs:
  `NIKDY` (NEVER), `VŽDY` (ALWAYS), `DŮLEŽITÉ` (IMPORTANT).

## 8. Diagrams

- **Primary**: Mermaid (inline fenced ` ```mermaid ` blocks).
- **Fallback**: PlantUML, only when Mermaid cannot express the diagram
  (e.g. complex deployment diagrams).
- Every diagram must have a caption and a short textual summary above it so
  the document stays readable when the diagram fails to render.
- Diagrams are generated only after the textual content they describe is
  confirmed stable by the user.

## 9. Wireframes (SVG)

- Wireframes use SVG fragments from `wf-fragments/` at the repository root.
- **NEVER** include `<script>` elements, `on*` event attributes, `javascript:`
  URIs, or any executable content inside generated SVG. This must be
  validated before writing the file.
- Copy fragments verbatim; replace only `<!-- param-name -->` placeholders.
- Evaluate numeric expressions in placeholders (e.g. `<!-- y+34 -->`) and
  substitute the computed value.
- Circular avatars: always `dominant-baseline="central"` and `y == cy`.
- Avatar labels: render **below** the circle, outside the colored area.
- If a new repeating block is introduced, add it as a fragment and register
  it in `wf-fragments/README.md`.
- **Screenshots as temporary input**: when the user provides screenshots,
  they serve as the reference for SVG layout and content. The generated SVG
  must reflect the screenshot — **NEVER** add elements not visible on it.
  Screenshots are input-only and are not stored in `wf-fragments/`.

## 10. Small in-run review

Every skill performs a **lightweight review** at the end of its run:

- All generated files parse as valid Markdown and contain the mandatory
  frontmatter (and Confluence marks where required).
- No `⚠️ TODO` marker is left unresolved without a user decision.
- Internal links point to existing files.
- Language check: Czech diacritics present, technical terms untouched.
- Diagrams/wireframes: syntactic validation only (no semantics check).
- All generated `.md` files pass `npx prettier --check` before finish.
  Formatting config: `.prettierrc.json` at repo root.
- **Skill self-check**: Claude re-reads the `SKILL.md` of the skill it just
  ran and confirms that every rule and step listed there was applied.
  Any gap found is reported to the user before the run completes.

A **comprehensive review** is handled by a separate command/skill
(`/docs-review`, planned) and is **NOT** part of the generation skills.

## 11. File handling

- **NEVER** overwrite an existing file silently. If the target file exists,
  ask the user whether to overwrite, merge, or skip.
- **NEVER** modify files outside `/docs/` unless the user explicitly
  requests it.
- **NEVER** modify `.vitepress/` configuration without explicit request.

## 12. Commands cheat-sheet

| Command                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `/docs-generate-from-code` | Orchestrator for the "docs from code" workflow |
| `/docs-technical`          | Incremental technical documentation            |
| `/docs-functional`         | Incremental functional documentation           |
| `/docs-diagrams`           | Diagrams — run after textual content is stable |
| `/docs-wireframes`         | SVG wireframes — last step                     |

Build and validation (run before commit):

```bash
pnpm run fix
pnpm run docs:build
```
