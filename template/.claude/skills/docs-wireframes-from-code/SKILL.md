---
name: docs-wireframes-from-code
description: Generates SVG wireframes for already-generated documentation pages. Attaches wireframes at the `<!-- wireframe-anchor: <id> -->` markers placed by the functional phase (typically inside scenario files); it does NOT invent wireframes for pages without anchors. Inputs include the codebase, already-generated docs, shared SVG fragments from `wf-fragments/`, and optional user-provided screenshots used as layout reference. ALWAYS runs as the last phase, AFTER text and diagrams are confirmed stable. Invoked by the docs-from-code orchestrator or by /docs-wireframes. DO NOT trigger for text generation, diagrams, sales, or pre-code design. Always inherits rules from CLAUDE.md.
---

# docs-wireframes-from-code: Wireframes phase

## When to use

Invoked by the `docs-from-code` orchestrator when the run scope is
`wireframes` or `full`, or directly via `/docs-wireframes`.

**Preconditions**:

1. Textual content (technical and functional) is confirmed stable.
2. Diagrams phase has completed, or the user explicitly accepts running
   wireframes first.
3. The user has been asked whether screenshots are available to use as
   layout reference (see Source hierarchy).

Wireframes are the **most expensive to fix**, so do not run this phase on
unstable content.

Do **NOT** use this skill for:

- Text pages → `docs-technical-from-code`,
  `docs-functional-from-code`.
- Diagrams → `docs-diagrams-from-code`.
- Pre-code / sales / review flows.

## Source hierarchy

This skill uses up to **four** sources:

1. **Codebase (primary, source of truth)**: `source_path`. Route
   definitions, page components, form schemas, UI strings.
2. **Already-generated docs (secondary, digested)**:
   `docs/<version>/`. Scenario pages describe what screens do; scenario
   I/O data tables describe fields.
3. **Shared SVG fragments**: `wf-fragments/` at repo root. Canonical
   snippets for shells, avatars, buttons, inputs, conversation rows,
   etc. (§9 of CLAUDE.md).
4. **User-provided screenshots (optional, temporary)**: when supplied,
   they are the **layout reference**: the SVG must reflect the
   screenshot's layout and content, and **NEVER** add elements not
   visible on it. Screenshots are input-only and are **NOT** stored in
   `wf-fragments/`; they are discarded after the run.

Ask for screenshots at the start of the run. If none are provided,
layout is derived from the code and the corresponding scenario page.

## Inputs (run context from orchestrator)

- `source_path`: repository root.
- `version_folder`: e.g. `docs/v1/`.
- `source_version`: git tag or `package.json`.
- `current_date`: from system context.
- `auto_mode`: boolean; default `false`.
- `anchors_report`: list of `<!-- wireframe-anchor: <id> -->` markers
  collected from the functional phase. Each entry:
  `{ file, anchor_id }`. If unavailable, this skill scans the docs tree
  itself in Step 1.
- `screenshots`: optional list of paths to user-provided screenshots,
  tagged by anchor ID (e.g. `{ "sc-01-login": "./shots/login.png" }`).

If invoked directly, collect these inputs from the user first.

## Output

Wireframes are stored as **standalone SVG files** (not inlined into
Markdown) and referenced from the host page at the anchor:

```
docs/<version>/images-diagrams/wireframes/<anchor-id>.svg
```

In the host page, the anchor is replaced by a figure reference and a
short textual summary, with the anchor comment kept for traceability:

```markdown
<!-- wireframe-anchor: sc-01-login -->

**Obrázek 1**: Wireframe obrazovky přihlášení.

Stručné textové shrnutí obrazovky pro případ, že se SVG nenačte.

![Wireframe – přihlášení](../../images-diagrams/wireframes/sc-01-login.svg)
```

## Workflow

### Step 1: Collect anchors, screenshots, and plan

- If `anchors_report` is provided, use it; otherwise scan
  `docs/<version>/` for `<!-- wireframe-anchor: <id> -->` markers.
- **ALWAYS** ask the user, at every run (even when the same scenarios
  were wireframed before):

  > "Do you have screenshots for any of these wireframes? If yes, map
  > them to anchor IDs."

  Do not assume the absence of screenshots based on previous runs.

- Read `wf-fragments/README.md` to know which shared fragments are
  available.
- For each anchor, determine:
  - **Device / skin**: mobile/desktop, dark/light (from code or
    screenshot; default mobile-light, ask if unclear).
  - **Layout source**: `screenshot` / `scenario-page` / `code-only`.
  - **Fragments needed**: shell, header, buttons, inputs, avatars, …

Produce a **wireframe plan** as a table:

```
| Anchor                 | Host scenario file                           | Device / skin | Layout source  | Fragments                           |
| ---------------------- | -------------------------------------------- | ------------- | -------------- | ----------------------------------- |
| wireframe: sc-01-login | functional/scenarios/auth/sc-01-login.md     | mobile/light  | screenshot     | shell-light, input-field, btn-prim. |
| wireframe: sc-02-chat  | functional/scenarios/chat/sc-02-chat.md      | mobile/light  | scenario-page  | shell-light, avatar-sm, conv-row    |
```

Present to the user. **NEVER** start writing before confirmation (or
explicit `auto_mode`).

### Step 2: Generate wireframe-by-wireframe

For every planned wireframe:

1. **Start from a fragment**: pick the shell fragment for the device /
   skin, then compose needed child fragments. Copy fragments verbatim
   and substitute `<!-- param-name -->` placeholders; evaluate numeric
   expressions (`<!-- y+34 -->` → computed integer).
2. **Layout source rules**:
   - `screenshot` → SVG layout matches the screenshot's visible
     elements, positions, and labels; do not add elements not visible.
   - `scenario-page` → layout reflects the I/O data table and main flow
     of the scenario page; field labels match the Czech labels in the
     scenario data table.
   - `code-only` → layout reflects the UI component tree and form
     schema. Label text follows the code / i18n resources.
3. **Content rules**:
   - Avatars in circles: always `dominant-baseline="central"` and
     `y == cy`. Labels **below** the circle, outside the colored area.
   - Field labels in Czech with diacritics. Technical identifiers in
     code-like context (URL, endpoint, class name) stay in the original
     language.
   - No decorative elements the source does not show.
4. **Mark gaps**: for any UI element referenced by the scenario page or
   code but whose visual representation cannot be inferred, mark a TODO
   **in the host page** (NOT inside the SVG):

   ```markdown
   > ⚠️ TODO: wireframe gap: <what is missing, where>.
   ```

   Wireframes themselves are static assets and must never contain TODO
   text overlays.

5. **Save the SVG** to
   `docs/<version>/images-diagrams/wireframes/<anchor-id>.svg`.
6. **ALWAYS validate the SVG** before moving on:
   - Run `scripts/validate-svg.sh <path>`. The script MUST fail if any
     of these are present:
     - `<script>` element,
     - any attribute matching `/^on[a-z]+$/i` (e.g. `onclick`,
       `onload`),
     - any attribute value containing `javascript:`,
     - `<foreignObject>` containing executable HTML/JS,
     - external references to non-whitelisted origins.
   - Additionally validate that the SVG parses as XML.
   - If validation fails, fix and re-validate; never leave an
     unvalidated SVG behind.

### Step 3: Consistency check (wireframe vs. host text)

After a wireframe is generated and validated, **compare it against the
host scenario page text** before saving the host page.

Procedure (analogous to diagrams Step 3):

1. Re-read the scenario page around the anchor: main flow, I/O data
   table, field labels, required/optional flags, error hints.
2. List the claims the text makes about the screen (which fields, which
   buttons, which states).
3. Cross-check each claim against the wireframe.
4. If a discrepancy is found:
   - First re-read the code to determine which side is wrong. If
     resolvable, fix the wrong side.
   - Otherwise mark a standard TODO in the host page under the figure
     reference:

     ```markdown
     > ⚠️ TODO: wireframe–text contradiction: <short description>.
     > Wireframe shows: <X>. Scenario says: <Y>.
     ```

5. Do **NOT** silently change text or wireframe to match; the
   contradiction must reach the user through the orchestrator's
   TODO-resolution step.

Reuse the standard `⚠️ TODO:` marker; do **not** introduce new marker
types. The prefix `wireframe–text contradiction:` is the classifier.

### Step 4: Insert figure reference into host page and save

- Replace nothing; insert the figure reference (Obrázek N, caption,
  textual summary, `![…](…)`) **below** the anchor comment. Keep the
  anchor comment in place for traceability.
- Insert any Step 3 contradiction-TODO below the figure reference.
- Save the host page. Unless `auto_mode` is on, pause and ask:
  > "Wireframe `<anchor>` inserted into `<host file>`. Review and
  > confirm to continue (y / edit / stop)."

### Step 5: Cross-reference, fragment hygiene, and retrospective fragment update

After all anchors have been processed and the user has approved the
wireframes in Step 4:

1. **Cross-reference check.** Every `<!-- wireframe-anchor: … -->` in the
   docs tree must now have a following figure reference and a matching
   SVG asset. List any missing pair.

2. **Duplication-based fragment extraction (automatic trigger).** Detect
   repeated SVG blocks produced across wireframes that were not sourced
   from an existing fragment. If a block appears ≥3 times, propose
   extracting it into a new fragment under `wf-fragments/` and
   registering it in `wf-fragments/README.md` (§9 of CLAUDE.md).

3. **Retrospective fragment update from approved wireframes.** Review
   every wireframe the user approved in Step 4 of this run. For each
   component that:
   - was composed inline (not sourced from an existing fragment), AND
   - is a recognizable reusable UI block (e.g. a card, a header, a form
     row, a modal), regardless of whether it repeated in this run,

   propose adding it to `wf-fragments/` as a new fragment. The user's
   approval in Step 4 is the quality signal that justifies promotion to
   a shared fragment. Also propose **updates to existing fragments**
   when an approved wireframe contains a refined variant of an
   existing fragment (e.g. better spacing, accessibility label added).

   For every proposed addition or update:
   - Show a diff-style preview (existing fragment vs. proposed new /
     updated fragment).
   - Ask the user `add / update / skip`.
   - On `add` or `update`: write the fragment, update the
     `wf-fragments/README.md` index, and **backfill** the just-generated
     wireframes to reference the new fragment instead of the inline
     block (if feasible without breaking approved visuals).

4. **Screenshot cleanup.** Screenshots used as input are discarded now;
   they are not saved in `wf-fragments/`.

Report the result to the user: the cross-reference list, proposed
fragment additions and updates, and any backfill diffs.

### Step 6: Handoff to orchestrator

Return:

- list of wireframes generated (anchor, host, SVG path, fragments used),
- total TODO count and per-wireframe TODO count, **split by kind**:
  - `wireframe-gap` (Step 2 item 4),
  - `wireframe-text-contradiction` (Step 3),
- list of anchors for which generation was deferred,
- list of proposed new fragments AND proposed updates to existing
  fragments (if any), with the user's decision per item (`add` /
  `update` / `skip`).

**NEVER** resolve TODOs here.

## Content rules

- **Anchor-driven**: only generate wireframes where an anchor exists.
  Do **NOT** invent wireframes for scenario pages without anchors.
- **Fragment-first**: always start from shared fragments. Introduce new
  fragments when a block repeats; do not duplicate inline.
- **No JavaScript / executable content** in SVG: per §9 of CLAUDE.md
  and Step 2 item 6. This rule is hard-enforced by the validator.
- **Reflect reality**: screenshots, scenario page, and code are the only
  sources of layout and content. No decorative invention.
- **Czech field labels, original technical terms**: per §7 of CLAUDE.md.
- **TODOs live in the host Markdown, never inside the SVG**.
- **Consistency with host text required** before leaving Step 3.

## Resources

Load each resource only when its trigger applies (progressive disclosure).

- [`resources/wf-fragments-index.md`](resources/wf-fragments-index.md):
  mirrored index of `wf-fragments/` with a decision matrix (situation →
  fragment), updated alongside `wf-fragments/README.md`.
  **Invoke when**: running Step 1 (planning) or picking fragments in
  Step 2.

- [`resources/svg-sanitization.md`](resources/svg-sanitization.md): the
  full list of forbidden constructs and how to rewrite them safely.
  **Invoke when**: the validator in Step 2 item 6 rejects an SVG, or
  when composing something beyond the known fragments.

- [`resources/avatar-rules.md`](resources/avatar-rules.md): detailed
  rules for avatar rendering (`dominant-baseline`, `y == cy`, label
  placement).
  **Invoke when**: any wireframe contains avatars.

- [`resources/layout-from-screenshot.md`](resources/layout-from-screenshot.md)
  procedure for deriving SVG layout from a screenshot without adding
  invented elements; how to handle partial / low-resolution
  screenshots.
  **Invoke when**: `layout source = screenshot` for the current
  wireframe.

- [`resources/layout-from-scenario.md`](resources/layout-from-scenario.md)
  procedure for deriving layout from a scenario page's I/O data
  table and main flow.
  **Invoke when**: `layout source = scenario-page`.

- [`resources/consistency-check.md`](resources/consistency-check.md):
  checklist for Step 3: what to extract from the scenario text and how
  to compare it against the wireframe.
  **Invoke when**: running Step 3.

- [`scripts/validate-svg.sh`](scripts/validate-svg.sh): hard validator
  for forbidden executable content and XML well-formedness.
  **Invoke when**: Step 2 item 6 (before leaving the step).

- [`resources/examples/`](resources/examples/): canonical wireframes,
  populated incrementally (e.g. `mobile-login-light.svg`,
  `desktop-dashboard-dark.svg`).
  **Invoke when**: a concrete reference is needed while drafting a
  wireframe.

## Out of scope

- Generating Markdown text pages: `docs-technical-from-code`,
  `docs-functional-from-code`.
- Diagrams: `docs-diagrams-from-code`.
- Any code changes outside `docs/`.
- Modifying or publishing screenshots; they are read-only, input-only,
  and discarded after the run.
