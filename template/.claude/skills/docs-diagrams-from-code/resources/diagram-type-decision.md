# Diagram type decision guide

Used in Step 1 of `docs-diagrams-from-code` to classify each
`<!-- diagram-anchor: <name> -->` into a diagram type. Every anchor
needs a type before Step 2 starts; if the name is ambiguous, follow
the decision tree below.

## Anchor-name → diagram type (primary mapping)

| Anchor-name pattern                   | Diagram type     | Typical host page                                  |
| ------------------------------------- | ---------------- | -------------------------------------------------- |
| `components`                          | Component        | `technical/architecture/components.md`             |
| `c4`                                  | C4 (all levels)  | `technical/architecture/c4.md`                     |
| `c4-context`                          | C4 Context       | `technical/architecture/c4.md`                     |
| `c4-container`                        | C4 Container     | `technical/architecture/c4.md`                     |
| `c4-component`                        | C4 Component     | `technical/architecture/c4.md`                     |
| `domain-model`                        | Class            | `technical/architecture/domain-model.md`           |
| `data-model`, `erd`                   | ERD              | `technical/architecture/data-model.md`             |
| `runtime-<name>`, `sequence-<name>`   | Sequence         | `technical/architecture/runtime.md`, scenarios     |
| `flow-<sc-id>`                        | Sequence         | `functional/scenarios/sc-<NN>-<slug>.md`           |
| `use-case-all`                        | Use-case (全部)  | `functional/scenarios-list.md`                     |
| `use-case-<module>`                   | Use-case (modul) | `functional/scenarios-list.md`                     |
| `state-<name>`                        | State            | any page describing a finite state                 |
| `flowchart-<name>`, `decision-<name>` | Flowchart        | technical business logic, retry, error branches    |
| `business-logic-<sc-id>`              | Flowchart        | `functional/scenarios/sc-<NN>-<slug>.md`           |
| `bpmn-<process>`                      | BPMN             | `functional/scenarios-list.md` (only if BPMN used) |
| `deployment-<name>`                   | Deployment       | `technical/infrastructure.md`                      |
| anything else                         | **ask the user** | —                                                  |

The mapping is a **starting point**, not a gate — a project may use
non-standard anchor names; always cross-check against the host page
context before accepting the default type.

## Decision tree for ambiguous anchors

If the name alone is unclear, ask these questions in order — the first
"yes" wins:

1. **Does the host page describe static structure (what exists, how
   things are composed)?**
   → Component / C4 / Class / ERD / Deployment, depending on the layer
   (code packages, runtime containers, domain objects, database tables,
   physical nodes).

2. **Does the host page describe a single user interaction over time
   (step 1, step 2, step 3 …)?**
   → Sequence diagram.

3. **Does the host page describe a many-to-many "who can do what" map
   between actors and use cases?**
   → Use-case diagram.

4. **Does the host page describe a lifecycle — the same entity moves
   through a finite set of named states?**
   → State diagram.

5. **Does the host page describe branching business logic / retries /
   error handling (conditions, loops, error branches without time
   axis)?**
   → Flowchart (decision / process).

6. **Does the project use BPMN for process modeling, and does the host
   page correspond to a documented BPMN process or subprocess?**
   → BPMN (PlantUML fallback likely — see `plantuml-fallback.md`).

7. **None of the above?** → Ask the user. Record the anchor in the
   Step 1 plan row with `type: ambiguous — user to decide`.

## Multi-diagram anchors

Some pages expect more than one diagram — the anchor names disambiguate:

- `technical/architecture/runtime.md` can host multiple
  `sequence-<name>` anchors (different runtime flows).
- `scenarios-list.md` hosts both `use-case-all` and per-module
  `use-case-<module>` anchors.
- A scenario page hosts `flow-<sc-id>` (sequence) **and**
  `business-logic-<sc-id>` (flowchart) — they are complementary, not
  alternatives.

**NEVER** merge two anchors into one diagram block. Every anchor gets
its own Mermaid/PlantUML fenced block.

## Defaults and overrides

- If the detected type is **Sequence** but the host page actually
  describes branching without time order, downgrade to **Flowchart**
  and record the decision in the Step 1 plan (so the user sees the
  override).
- If the detected type is **C4** but there is no evidence of more than
  one level (only container names, no context actors), draw **C4
  Container** only and leave the Context anchor with
  `⚠️ TODO: C4 Context — chybí vnější aktéři v kódu / docs`.

## Rules

- **NEVER** pick a diagram type without at least one source of evidence
  for the claims the diagram will carry.
- **ALWAYS** record the chosen type and the evidence in the Step 1 plan
  row for each anchor, so the user reviews the classification before
  generation.
- **ALWAYS** prefer the simpler type when in doubt (flowchart over
  sequence, component over C4, class over domain-specific notations) —
  simpler diagrams are cheaper to keep consistent.
