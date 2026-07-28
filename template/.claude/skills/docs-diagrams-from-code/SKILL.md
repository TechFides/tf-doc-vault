---
name: docs-diagrams-from-code
description: Generates diagrams (Mermaid primary, PlantUML fallback) for already-generated documentation pages. Attaches diagrams at the `<!-- diagram-anchor: <name> -->` markers placed by the technical and functional phases; it does NOT invent diagrams for pages without anchors. Covers the common diagram types (component, C4, domain-model class, ERD, sequence, use-case, state, flowchart / decision, BPMN where applicable). Runs AFTER textual content is confirmed stable. Uses code and existing docs as evidence sources, and performs a consistency check between each diagram and the host page text. Invoked by the docs-from-code orchestrator or by /docs-diagrams. DO NOT trigger for text generation, wireframes, sales, or pre-code design. Always inherits rules from CLAUDE.md.
---

# docs-diagrams-from-code: Diagrams phase

## When to use

Invoked by the `docs-from-code` orchestrator when the run scope is
`diagrams` or `full`, or directly via `/docs-diagrams`.

**Precondition**: the textual content this phase will illustrate must be
confirmed stable by the user. Diagrams are expensive to fix, so generating
them on unstable content wastes effort. If textual content has not been
marked stable, ask the user to confirm before proceeding.

Do **NOT** use this skill for:

- Generating text pages → `docs-technical-from-code` or
  `docs-functional-from-code`.
- SVG wireframes → `docs-wireframes-from-code`.
- Pre-code / sales / review flows.

## Source hierarchy

1. **Codebase (primary, source of truth)**: `source_path`.
2. **Already-generated docs in the current version folder (secondary,
   digested)**: `docs/<version>/`. Diagrams reflect what the docs
   already say; contradictions are flagged in Step 3.

## Inputs (run context from orchestrator)

- `source_path`: repository root.
- `version_folder`: e.g. `docs/v1/`.
- `source_version`: git tag or `package.json`.
- `current_date`: from system context.
- `auto_mode`: boolean; default `false`.
- `anchors_report`: list of `<!-- diagram-anchor: <name> -->` markers
  collected from the technical and functional phases. Each entry:
  `{ file, anchor_name, suggested_type }`. If unavailable, this skill
  scans the docs tree itself in Step 1.

If invoked directly, collect these inputs from the user first.

## Output

Diagrams are **inlined** into their host Markdown pages at the anchor
locations; they do **not** become separate pages:

````markdown
<!-- diagram-anchor: flow-login -->

**Obrázek 1**: Přihlašovací tok uživatele.

Stručné textové shrnutí diagramu pro případ, že renderování selže.

```mermaid
sequenceDiagram
  …
```
````

```

Static images (if generated) go to `docs/images-diagrams/diagrams/` and
are referenced from the host page via a relative link, but **NEVER**
replace the fenced Mermaid/PlantUML block with just an image; keep both
(source + rendered), so docs remain maintainable.

## Workflow

### Step 1: Collect anchors and plan

- If `anchors_report` is provided, use it.
- Otherwise scan `docs/<version>/` for `<!-- diagram-anchor: <name> -->`
  markers. Build the same list.
- For each anchor, determine the diagram type from the name and context:
  - `flow-<name>`, `sequence-<name>` → **sequence diagram**
  - `use-case-<group>` → **use-case diagram**
  - `components` → **component diagram**
  - `c4`, `c4-<level>` → **C4 diagram** (context / container / component)
  - `domain-model` → **class diagram**
  - `data-model`, `erd` → **ERD**
  - `state-<name>` → **state diagram**
  - `flowchart-<name>`, `decision-<name>` → **flowchart (decision /
    process)**
  - `bpmn-<name>` → **BPMN** (only if the project uses BPMN)
  - other → ask the user

See `resources/diagram-type-decision.md` for the full mapping.

Produce a **diagram plan** as a table:

```

| Anchor                         | Host file                                | Type      | Source evidence             |
| ------------------------------ | ---------------------------------------- | --------- | --------------------------- |
| diagram-anchor: flow-login     | functional/scenarios/auth/sc-01-login.md | sequence  | controllers/auth/login.ts   |
| diagram-anchor: components     | technical/architecture/components.md     | component | packages/\*, src/app.ts     |
| diagram-anchor: erd            | technical/architecture/data-model.md     | ERD       | db/migrations/\*, schema.ts |
| diagram-anchor: decision-retry | technical/integrations/overview.md       | flowchart | src/http/retry.ts           |

`````

Present to the user. **NEVER** start writing before confirmation (or
explicit `auto_mode`).

### Step 2: Generate diagram-by-diagram

For every planned diagram:

1. **Primary: Mermaid**. Produce a fenced ```` ```mermaid ```` block.
2. **Fallback: PlantUML** only when Mermaid cannot express the diagram
   (e.g. complex deployment). Use ```` ```plantuml ```` fenced block.
   Record the reason in a single-line comment above the block.
3. **ALWAYS** include the following above the diagram block:
   - `**Obrázek N**: caption in Czech.`
   - A short textual summary (one or two sentences) so the page stays
     readable when rendering fails.
4. Evidence: every node, relationship, and label in the diagram must be
   traceable to the code or docs. For anything not derivable, mark
   `⚠️ TODO: [what is missing]`; **NEVER** invent a node, edge, or
   cardinality.
5. **ALWAYS validate syntax** before moving on: run the fenced content
   through the Mermaid / PlantUML validator script
   (`scripts/validate-diagram.sh`). If invalid, fix and re-validate;
   never leave an unvalidated block behind.

### Step 3: Consistency check (diagram vs. host text)

After a diagram is generated and validated, **compare it against the
host page text** before saving the host file. Every node, edge,
cardinality, label, and order in the diagram must be consistent with
what the surrounding text claims.

Procedure:

1. Re-read the host page section around the anchor.
2. List the claims the text makes about the thing being diagrammed
   (actors, steps, relationships, data flow, cardinalities, states,
   decisions, …).
3. Cross-check each claim against the diagram.
4. If a discrepancy is found:
   - First re-read the code / secondary docs to determine which side is
     wrong. If the source of truth resolves it, fix the wrong side.
   - If the discrepancy cannot be resolved by re-reading the source,
     **mark it with a standard TODO** directly under the diagram:

     ```markdown
     > ⚠️ TODO: diagram–text contradiction: <short description>.
     > Diagram says: <X>. Text says: <Y>.
     ```

   - Do **NOT** silently change the text to match the diagram (or vice
     versa). The contradiction must reach the user through the
     orchestrator's TODO-resolution step.

Reuse the standard `⚠️ TODO:` marker; do **not** introduce new marker
types. The prefix `diagram–text contradiction:` is the classifier.

### Step 4: Insert into host page and save

- Insert the validated diagram block (and any Step 3 contradiction-TODO)
  **at the anchor**, directly below the anchor comment. Leave the
  anchor comment in place.
- Save the host file. Unless `auto_mode` is on, pause and ask:
  > "Diagram `<name>` inserted into `<host file>`. Review and confirm
  > to continue (y / edit / stop)."

### Step 5: Cross-reference check

After all anchors have been processed:

- Every `<!-- diagram-anchor: … -->` in the docs tree must now have a
  following Mermaid/PlantUML block. List any missing pair.
- Every diagram must have at least one upstream reference in the same
  host page or in a linked page. List orphans.

Report both lists to the user.

### Step 6: Handoff to orchestrator

Return:
- list of diagrams generated (anchor, host, type, lines of code),
- total TODO count and per-diagram TODO count, **split by kind**:
  - `missing-evidence` (from Step 2 item 4),
  - `diagram-text-contradiction` (from Step 3),
- list of anchors for which generation was deferred (type ambiguous,
  user to decide),
- any image assets created and their paths.

**NEVER** resolve TODOs here; the orchestrator owns resolution, and
contradiction-TODOs in particular require a user decision about which
side (diagram or text) is wrong.

## Content rules

- **Anchor-driven**: only generate diagrams where an anchor exists. Do
  **NOT** invent new diagrams for pages without anchors. If a page
  should have a diagram but has no anchor, report it and let the user
  edit the host page first.
- **Mermaid first, PlantUML fallback**: per §8 of CLAUDE.md.
- **Caption + summary mandatory**: a diagram without caption and textual
  summary is incomplete.
- **Evidence required**: per CLAUDE.md §1: no invented nodes or edges.
- **Czech content for captions and summaries**: per §7 of CLAUDE.md.
  Diagram node labels follow the source; if the code calls it
  `UserService`, the class node is `UserService`, not `SlužbaUživatelů`.
- **Syntactic validation required** before leaving Step 2.
- **Consistency with host text required** before leaving Step 3.

## Resources

Load each resource only when its trigger applies (progressive disclosure).

- [`resources/diagram-type-decision.md`](resources/diagram-type-decision.md):
  anchor-name → diagram-type mapping and decision tree for ambiguous
  cases (including flowchart vs. sequence vs. state).
  **Invoke when**: running Step 1 and classifying anchors.

- [`resources/mermaid-cheatsheet.md`](resources/mermaid-cheatsheet.md):
  idiomatic Mermaid for each diagram type (sequence, class, state, ERD,
  flowchart, C4 via `C4Context`/`C4Container`, etc.).
  **Invoke when**: generating a Mermaid block and the exact syntax needs
  confirmation.

- [`resources/plantuml-fallback.md`](resources/plantuml-fallback.md):
  when Mermaid is not enough, and canonical PlantUML templates
  (deployment, advanced C4, complex BPMN).
  **Invoke when**: Mermaid cannot express the diagram and PlantUML
  fallback is needed.

- [`resources/evidence-rules.md`](resources/evidence-rules.md): how to
  trace every node and edge back to code or docs.
  **Invoke when**: unsure whether a node/edge is evidence-backed.

- [`resources/consistency-check.md`](resources/consistency-check.md):
  checklist for Step 3: what claims to extract from the host text and
  how to compare them against each diagram type.
  **Invoke when**: running Step 3.

- [`scripts/validate-diagram.sh`](scripts/validate-diagram.sh):
  validator for Mermaid / PlantUML fenced blocks; fails the file on
  syntax error.
  **Invoke when**: Step 2, item 5 (before leaving the step).

- [`resources/examples/`](resources/examples/): canonical examples per
  diagram type, populated incrementally (e.g. `sequence-login.md`,
  `erd-users-orders.md`, `c4-context.md`, `flowchart-retry.md`).
  **Invoke when**: a concrete reference is needed while drafting a
  diagram.

## Out of scope

- Generating Markdown text pages: `docs-technical-from-code`,
  `docs-functional-from-code`.
- SVG wireframes: `docs-wireframes-from-code`.
- Any code changes outside `docs/`.
`````
