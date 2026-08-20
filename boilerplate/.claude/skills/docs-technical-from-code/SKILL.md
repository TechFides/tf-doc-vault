---
name: docs-technical-from-code
description: Generates technical documentation from an existing codebase, covering the full technical menu (tech stack, infrastructure, CI/CD, architecture, security, integrations, roles, jobs, testing, SLA, monitoring, scaling, feature toggles, caching, localization, disaster recovery, accessibility, audit, guides, and any project-specific technical concerns). Works file-by-file (text only, no diagrams and no wireframes), pausing after each generated page for user review. Invoked by the docs-from-code orchestrator or by /docs-technical. DO NOT trigger for functional docs, diagrams, wireframes, sales, or pre-code design. Always inherits rules from CLAUDE.md.
---

# docs-technical-from-code: Technical documentation phase

## When to use

Invoked by the `docs-from-code` orchestrator when the run scope is
`technical` or `full`. Can also be triggered directly by `/docs-technical`.

Produces Markdown pages only: **no** Mermaid/PlantUML diagrams and **no**
SVG wireframes in this phase. Diagrams are added later by
`docs-diagrams-from-code` once the textual content is confirmed stable.

Do **NOT** use this skill for:

- Functional documentation → `docs-functional-from-code`.
- Diagrams → `docs-diagrams-from-code`.
- Wireframes → `docs-wireframes-from-code`.
- Pre-code / sales / review flows.

## Inputs (run context from orchestrator)

- `source_path`: repository root to scan.
- `version_folder`: e.g. `docs/v1/`.
- `source_version`: resolved from git tag or `package.json`.
- `current_date`: from system context.
- `auto_mode`: boolean; default `false` (pause after each file).

If this skill is invoked directly (no orchestrator), it must collect these
inputs from the user before starting.

## Output layout

The **proposed** technical menu structure for this skill is defined in
[`resources/proposed-structure.md`](resources/proposed-structure.md):
derived from the project-wide `documentation-structure.md`.

**This is a proposal, not a fixed set.** Two rules:

- If the scanned codebase suggests a group **not** in the proposal
  (e.g. a project-specific concern), propose it to the user and wait for
  confirmation before creating the folder.
- If a proposed group has **no evidence** in the codebase, list it in the
  plan as `skip: no evidence` and confirm with the user; never create an
  empty page.

All generated files live under `docs/<version>/technical/`.

## Workflow

### Step 1: Comprehensive scan and plan

Scan the codebase **comprehensively across every technical aspect**
represented in `resources/proposed-structure.md`. Do not narrow the scan to
architecture and API only; the goal is to populate the full technical
menu, not a sub-slice of it.

Use `resources/scan-checklist.md` as the detection guide; it enumerates
the files, configs, and markers to look for per aspect. Also search for
project-specific concerns that the proposal does not cover.

Produce a **generation plan** as a table, grouped by menu section:

```
| Section / Group                       | File                | Source evidence              |
| ------------------------------------- | ------------------- | ---------------------------- |
| technical/architecture/               | components.md       | src/app.ts, packages/*       |
| technical/security/                   | authn-authz.md      | src/auth/*, .env.example     |
| technical/integrations/consumed/      | billing-api.md      | src/clients/billing.ts       |
| technical/tests/                      | unit.md             | jest.config.js, src/**/*.test|
| technical/<new-group>/                | <page>.md           | <evidence>                   |
| technical/<proposed-group>/           | n/a                 | skip: no evidence            |
```

Present the plan to the user. **NEVER** start writing before the user
confirms (or explicit `auto_mode`).

### Step 2: Generate file-by-file

For every planned file:

1. Gather evidence from the code (exact file paths, function names, types,
   config keys, schema field names).
2. Pick the template matching the target group (see Resources). If no
   dedicated template exists, fall back to
   `resources/templates/generic-page.md`.
3. Produce the page following the template.
4. Fill in `order` in the frontmatter: the page's position among its
   siblings, from `resources/proposed-structure.md` where the page is
   listed there, otherwise from the generation plan. `order` is a
   required field checked by `docs:validate`, and files and subfolders
   in the same folder share one number space, so the value must be
   unique among them.
5. For anything that cannot be derived from evidence, write
   `⚠️ TODO: [what is missing]`; **NEVER** invent.
6. **ALWAYS include at least one example** per non-trivial concept (code
   snippet, request/response, config excerpt, or concrete scenario).
7. Save the file. Unless `auto_mode` is on, pause and ask:
   > "File `<path>` is written. Review and confirm to continue (y / edit /
   > stop)."

### Step 3: Section and group indexes

- **Section `index.md`** (e.g. `docs/<version>/technical/index.md`):
  if it does not exist, create it with the Czech label (no numeric
  prefix, e.g. `Technická dokumentace`) and `order` from
  `resources/proposed-structure.md`. Content: frontmatter +
  Confluence mark + short overview paragraph only. **NO menu**:
  VitePress auto-generates navigation from files and frontmatter
  `order`. **NO H1**; the rendered heading comes from the `title`
  frontmatter field.
- **Group `index.md`**: for every used group, ensure its `index.md`
  exists with the numbered Czech label (e.g. `2.4 Architektura
systému`) and `order` from the proposal. Content: frontmatter +
  Confluence mark only. Groups are pure folder markers, with no
  overview, no menu, no H1, no body text. (Exception: `tests/index.md`
  is a real content page per `proposed-structure.md`.)
- New (non-proposed) groups get numbering and `order` agreed with the
  user.

### Step 4: Handoff to orchestrator

Return to the orchestrator:

- list of generated file paths,
- total TODO count and per-file TODO count,
- list of skipped groups with reasons,
- list of non-proposed groups created (if any).

**NEVER** resolve TODOs here; that belongs to the orchestrator's Step 3.

## Content rules (general, applies to every page)

- **Evidence-first**: every claim must have a source reference (file path,
  optionally `path:line`). If you cannot cite, you cannot claim; mark
  `⚠️ TODO` instead.
- **Examples required**: every non-trivial concept includes at least one
  example drawn from the codebase. No abstract descriptions without a
  concrete case.
- **No diagrams in this phase**: if a diagram is expected later, insert
  only the anchor `<!-- diagram-anchor: <name> -->`; do not produce
  Mermaid / PlantUML here.
- **Czech content, original technical terms**: per §7 of CLAUDE.md.
- **Confluence marks required**: per §6 of CLAUDE.md.

Per-group nuances (what to emphasize for architecture vs. security vs.
tests vs. guides, etc.) are captured inside the corresponding templates,
not hard-coded in this file.

## Resources

Load each resource only when its trigger applies (progressive disclosure).

- [`resources/proposed-structure.md`](resources/proposed-structure.md):
  the proposed technical menu structure (sections, groups, pages, Czech
  labels, order). Derived from `documentation-structure.md`.
  **Invoke when**: starting Step 1, deciding whether a detected aspect
  belongs in the proposal, or building the section/group indexes in
  Step 3.

- [`resources/scan-checklist.md`](resources/scan-checklist.md):
  detection targets per aspect (what files, configs, and markers to look
  for).
  **Invoke when**: running Step 1 and scanning a given aspect.

- [`resources/evidence-rules.md`](resources/evidence-rules.md): how to
  cite source evidence and when to mark TODO vs. content.
  **Invoke when**: unsure whether a detail is inferable from the code.

- [`resources/api-documentation-guide.md`](resources/api-documentation-guide.md)
  reference patterns for documenting REST APIs (per-endpoint shape,
  OpenAPI integration, request/response examples, error envelope, auth,
  rate limits, versioning, code examples, webhooks) plus the
  consumed-vs-exposed differentiation and the project-specific one-file-
  per-API rule.
  **Invoke when**: generating any page under `technical/consumed-apis/`,
  `technical/exposed-public-apis/`, or `technical/exposed-internal-apis/`
  i.e. every time an API is documented.

- [`resources/templates/generic-page.md`](resources/templates/generic-page.md)
  fallback template used when no dedicated template exists.
  **Invoke when**: generating a page in a group without a dedicated
  template.

- [`resources/templates/*.md`](resources/templates/): per-group
  templates. Populated incrementally the first time a group is generated
  (e.g. `tech-stack.md`, `cicd.md`, `architecture-components.md`,
  `security-authn-authz.md`, `integrations-consumed-api.md`,
  `tests-unit.md`, `guides-local-setup.md`, …).
  **Invoke when**: generating a page and a dedicated template for its
  group already exists.

- [`resources/templates/index-section.md`](resources/templates/index-section.md)
  template for `technical/index.md`.
  **Invoke when**: creating or updating the section index.

- [`resources/templates/index-group.md`](resources/templates/index-group.md)
  template for group `index.md`.
  **Invoke when**: creating or updating a group index.

## Out of scope

- Diagrams (Mermaid, PlantUML): `docs-diagrams-from-code`.
- Wireframes: `docs-wireframes-from-code`.
- Functional documentation: `docs-functional-from-code`.
- Any code changes outside `docs/`.
