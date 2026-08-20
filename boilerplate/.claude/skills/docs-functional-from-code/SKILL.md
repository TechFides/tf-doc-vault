---
name: docs-functional-from-code
description: Generates functional documentation from an existing codebase AND from any already-generated technical documentation in the current version folder. Covers the full functional menu (overview, product structure, glossary, actors, personas, screens, scenarios list, business rules, notifications, reports, and scenario details with wireframe anchors). Code is the ultimate source of truth; the technical section, when available, is used as a faster, already-digested lookup for APIs, roles, components, data model, feature toggles, and metrics. Works file-by-file (text only, no diagrams and no wireframes), pausing after each generated page for user review. Invoked by the docs-from-code orchestrator or by /docs-functional. DO NOT trigger for technical docs, diagrams, wireframes, sales, or pre-code design. Always inherits rules from CLAUDE.md.
---

# docs-functional-from-code: Functional documentation phase

## When to use

Invoked by the `docs-from-code` orchestrator when the run scope is
`functional` or `full`. Can also be triggered directly by `/docs-functional`.

Produces Markdown pages only: **no** Mermaid/PlantUML diagrams and **no**
SVG wireframes in this phase. Diagrams (use-case, sequence) and wireframes
are attached later by `docs-diagrams-from-code` and
`docs-wireframes-from-code` through anchors this skill inserts.

Do **NOT** use this skill for:

- Technical documentation → `docs-technical-from-code`.
- Diagrams → `docs-diagrams-from-code`.
- Wireframes → `docs-wireframes-from-code`.
- Pre-code / sales / review flows.

## Source hierarchy

This skill uses **two** sources of evidence:

1. **Codebase (primary, source of truth)**: `source_path`.
2. **Already-generated technical documentation (secondary, digested)**:
   `docs/<version>/technical/`, if present. Prefer it as a fast lookup
   for API shapes, role definitions, feature toggles, component names,
   data model field names, metrics, and error codes, but **ALWAYS**
   cross-check against the code when in doubt.

If the technical section has not been generated yet, only the codebase is
used; cross-links to the technical section become `⚠️ TODO` markers (see
Step 4).

## Inputs (run context from orchestrator)

- `source_path`: repository root to scan.
- `version_folder`: e.g. `docs/v1/`.
- `source_version`: resolved from git tag or `package.json`.
- `current_date`: from system context.
- `auto_mode`: boolean; default `false` (pause after each file).
- `technical_docs_path`: relative path to
  `docs/<version>/technical/`. If it exists and contains pages, this
  skill reads them as the secondary source. If it does not exist yet,
  set the flag `technical_available = false` and rely on code only.

If this skill is invoked directly (no orchestrator), it must collect
these inputs from the user before starting.

## Output layout

The **proposed** functional menu structure is defined in
[`resources/proposed-structure.md`](resources/proposed-structure.md):
derived from the project-wide `documentation-structure.md`.

**This is a proposal, not a fixed set.** Two rules:

- If the scanned sources suggest a page or group **not** in the proposal,
  propose it to the user and wait for confirmation.
- If a proposed page has **no evidence** in either source, list it as
  `skip: no evidence` and confirm with the user; never create an empty
  page.

All generated files live under `docs/<version>/functional/`.

## Scenario grouping

Scenarios live **flat** under `functional/scenarios/<sc-id>.md`, with no
module subfolders (three-level depth cap, see
`resources/proposed-structure.md`). Logical grouping is expressed in
**metadata** (`module:` frontmatter) and in `scenarios-list.md`.

The grouping strategy:

1. **Primary**: by module / bounded context detected in the codebase
   (or already named in the technical architecture section, if
   available).
2. **Fallback** (when module split is too coarse): by a secondary axis
   agreed with the user, e.g. `admin` vs. `user`, `read` vs. `write`,
   `internal` vs. `external`.

See `resources/scenario-grouping.md` for the decision flow. The chosen
grouping must be recorded in the plan (Step 1) and confirmed before any
scenario file is written.

## Workflow

### Step 1: Scan and plan

Scan both sources in the manner required to **fully cover the functional
menu** proposed in `resources/proposed-structure.md`. Use
`resources/scan-checklist.md` as the detailed detection guide; the list
of what to look for per aspect lives there, not in this file.

Produce a **generation plan** as a table:

```
| Section / Page                            | File                 | Source evidence                        |
| ----------------------------------------- | -------------------- | -------------------------------------- |
| functional/overview.md                    | overview.md          | README.md, technical/tech-stack.md     |
| functional/glossary.md                    | glossary.md          | domain/*, technical/architecture/…     |
| functional/actors.md                      | actors.md            | auth/roles.ts, technical/roles-matrix  |
| functional/scenarios/<sc-id>.md           | sc-01-login.md       | controllers/auth/login.ts, tech/api/…  |
| functional/<proposed-page>                | n/a                  | skip: no evidence                      |
```

Include the chosen scenario grouping strategy and proposed scenario IDs.
Present to the user and wait for confirmation.

### Step 2: Generate file-by-file

Default order within this phase (can be adjusted by the user in the plan):

1. `overview.md`, `product-structure.md`: set the context first.
2. `glossary.md`, `actors.md`, `personas.md` (if relevant): anchor
   vocabulary.
3. `screens.md`, `scenarios-list.md`: navigation and high-level map.
4. `business-rules.md`, `notifications.md`, `reports.md` (each only if
   evidence exists).
5. `scenarios/<sc-id>.md`: detailed scenario pages, one at a time
   (flat under `scenarios/`, module/axis recorded in frontmatter).

For every file:

1. Gather evidence from **both** sources per the Source hierarchy:
   codebase (primary) and already-generated technical docs (secondary,
   if present). Prefer the technical docs for already-digested
   information; cross-check the code when uncertain.
2. Pick the template matching the target page (see Resources). Fall back
   to `resources/templates/generic-page.md`.
3. Follow the template.
4. Fill in `order` in the frontmatter: the page's position among its
   siblings, from `resources/proposed-structure.md` where the page is
   listed there, otherwise from the generation plan. `order` is a
   required field checked by `docs:validate`, and files and subfolders
   in the same folder share one number space, so the value must be
   unique among them. Scenario pages are numbered within `scenarios/`.
5. Mark `⚠️ TODO: [what is missing]` for anything not derivable from
   either source; **NEVER** invent behavior, fields, validations, or
   rules.
6. **ALWAYS include at least one concrete example** per non-trivial
   concept (a real scenario, a real input payload, a real error case).
7. For each scenario file: insert wireframe and diagram anchors at the
   right places; do not render the wireframe / diagram here:

   ```markdown
   <!-- wireframe-anchor: <sc-id> -->
   <!-- diagram-anchor: flow-<sc-id> -->
   <!-- diagram-anchor: use-case-<group> -->
   ```

8. Save the file. Unless `auto_mode` is on, pause and ask:
   > "File `<path>` is written. Review and confirm to continue (y / edit
   > / stop)."

### Step 3: Section and group indexes

- **Section `index.md`** (`docs/<version>/functional/index.md`):
  if it does not exist, create it with the Czech label (no numeric
  prefix, e.g. `Funkční dokumentace`) and `order: 1` from
  `resources/proposed-structure.md`. Content: frontmatter +
  Confluence mark + short overview paragraph only. **NO menu**:
  VitePress auto-generates navigation from files and frontmatter
  `order`. **NO H1**; the rendered heading comes from the `title`
  frontmatter field.
- **Group `index.md`**: for every used group (only `scenarios/` in
  the proposed structure, unless the user added a non-proposed group),
  ensure its `index.md` exists with the numbered Czech label (e.g.
  `1.11 Scénáře`) and `order` from the proposal. Content: frontmatter
  - Confluence mark only. Groups are pure folder markers, with no
    overview, no menu, no H1, no body text.
- Scenarios are **flat** under `scenarios/` (no module subfolders) per
  the three-level depth rule; module grouping lives in scenario
  frontmatter (`module:` field) and in `scenarios-list.md`, not in the
  folder tree.
- New (non-proposed) groups get numbering and `order` agreed with the
  user.

### Step 4: Cross-links to the technical section

Scenarios reference the technical section heavily (API detail pages,
roles matrix, feature toggles, metrics, error codes). For every such
link:

- If the target technical page exists → use a relative link.
- If the target does not exist yet → insert
  `⚠️ TODO: link to technical/<expected-path>` and keep the surrounding
  text.

The orchestrator's TODO-resolution step lets the user decide whether to
resolve these now or after the technical phase (re-)runs.

### Step 5: Handoff to orchestrator

Return to the orchestrator:

- list of generated file paths,
- total TODO count and per-file TODO count,
- list of skipped pages with reasons,
- list of wireframe / diagram anchors inserted (so the later phase
  skills know where to attach output),
- flag indicating whether the technical section was available during
  this run.

**NEVER** resolve TODOs here.

## Content rules (general, applies to every page)

- **Evidence-first, dual source**: every user-visible behavior must be
  traceable to code (primary) and/or technical docs (secondary). No
  behavior claim without a source reference.
- **Examples required**: concrete payloads, concrete scenarios, concrete
  UI state, with no abstract descriptions.
- **Business perspective, not implementation**: describe WHAT the system
  does for the user, WHY, with WHO. Implementation details belong in
  the technical section; link, do not duplicate.
- **Scenario pages**: follow the full scenario template (info block →
  wireframe anchor → main flow → I/O data table → triggers → business
  logic → feature toggle → metrics), and emit `⚠️ TODO` for any section
  without evidence.
- **Czech content, original technical terms**: per §7 of CLAUDE.md.
- **Confluence marks required**: per §6 of CLAUDE.md.

## Resources

Load each resource only when its trigger applies (progressive disclosure).

- [`resources/proposed-structure.md`](resources/proposed-structure.md):
  the proposed functional menu structure (sections, groups, pages,
  Czech labels, order). Derived from `documentation-structure.md`.
  **Invoke when**: starting Step 1 or building indexes in Step 3.

- [`resources/scan-checklist.md`](resources/scan-checklist.md):
  detection targets per aspect, for both sources (code and technical
  docs).
  **Invoke when**: running Step 1.

- [`resources/scenario-grouping.md`](resources/scenario-grouping.md):
  decision guide for primary (module) and fallback grouping.
  **Invoke when**: choosing the scenario grouping in Step 1.

- [`resources/evidence-rules.md`](resources/evidence-rules.md): how to
  cite evidence from each source and when to mark TODO vs. content.
  **Invoke when**: unsure whether a detail is inferable.

- [`resources/templates/generic-page.md`](resources/templates/generic-page.md):
  fallback template.
  **Invoke when**: generating a page without a dedicated template.

- [`resources/templates/scenario.md`](resources/templates/scenario.md):
  full scenario template (info, wireframe anchor, main flow, I/O data,
  triggers, business logic, feature toggle, metrics).
  **Invoke when**: generating any file under `scenarios/`.

- [`resources/templates/scenarios-list.md`](resources/templates/scenarios-list.md):
  master scenario list template (grouped by module, use-case diagram
  anchor(s), optional BPMN list).
  **Invoke when**: generating `functional/scenarios-list.md`.

- [`resources/templates/*.md`](resources/templates/): per-page templates
  populated incrementally (e.g. `overview.md`, `product-structure.md`,
  `glossary.md`, `actors.md`, `personas.md`, `screens.md`,
  `scenarios-list.md`, `business-rules.md`, `notifications.md`,
  `reports.md`).
  **Invoke when**: generating the matching page and a dedicated template
  exists.

- [`resources/templates/index-section.md`](resources/templates/index-section.md):
  template for `functional/index.md`.
  **Invoke when**: creating or updating the section index.

- [`resources/templates/index-group.md`](resources/templates/index-group.md):
  template for group `index.md`.
  **Invoke when**: creating or updating a group index.

## Out of scope

- Diagrams: `docs-diagrams-from-code`.
- Wireframes: `docs-wireframes-from-code`.
- Technical documentation: `docs-technical-from-code`.
- Any code changes outside `docs/`.
