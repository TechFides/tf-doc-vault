# Consistency check — diagram vs. host text

Step 3 of `docs-diagrams-from-code`. After a diagram is generated and
validated, compare it against the surrounding host-page text **before**
saving the host file. Every claim in the text must be visible in the
diagram, and every element in the diagram must be supported by the
text (or by code, if the text under-describes it).

If the two sides disagree and the disagreement cannot be resolved by
re-reading the code, mark the contradiction as a TODO — **never**
silently change the text or the diagram.

## Extraction step — what to pull from the host text

Read the host page section around the anchor and list the concrete
claims it makes. The checklist below is a per-type starter; add
claims that are specific to the page.

### Sequence diagrams (`flow-<sc-id>`, `runtime-<name>`)

- Participants named in the host text (actors, FE, BE, external
  systems).
- Order of steps (the numbered list in "Hlavní flow").
- Protocol / transport labels mentioned in prose
  ("HTTPS / JSON", "gRPC", "AMQP").
- Alternative branches mentioned ("pokud validace selže …", "pokud
  IDM vrátí 401 …").
- Error handling described in "Popis business logiky" →
  `alt / else / end` paths in the diagram.
- Feature-toggle guards mentioned in "Feature toggle" →
  `opt` blocks in the diagram (if enabled) or TODO if not yet drawn.

### Use-case diagrams (`use-case-all`, `use-case-<module>`)

- Actors listed in `actors.md` / `roles-matrix.md`.
- Scenarios listed in `scenarios-list.md` table.
- Role-to-scenario mapping (every row in the table yields one edge).

### Component / C4 diagrams

- **Modules as the first level** — the top-level subgraph grouping must
  reflect the modules enumerated in the host page's overview (or in
  `components.md`). One subgraph per module; do NOT flatten multiple
  modules into a single cluster, and do NOT invent a module the text
  does not name.
- Nodes named in `components.md` (and in `tech-stack.md` for FE/BE
  split).
- Edges labeled with the protocols enumerated in `integrations/
overview.md` or `consumed-apis/*`.
- External systems from `integrations/consumed/*`.
- Deployment nodes from `infrastructure.md` (for C4 Deployment /
  PlantUML Deployment).

### Class diagrams (domain model)

- Classes / interfaces / enums listed in `domain-model.md`.
- Abstract / concrete distinctions stated in text.
- Visibility modifiers (public / private / protected) if the text
  mentions them.
- Cardinality described in prose ("uživatel má jednu nebo více
  session") must match the diagram labels.

### ERDs

- Tables listed in `data-model.md` (migrations).
- Columns with their DB types (not language types).
- PK / FK / UK annotations from the migrations.
- Cardinalities from FK presence + uniqueness.

### State diagrams

- Named states from the text.
- Transitions as event / method names.
- Start / end states.
- Guards mentioned in prose (as `note` blocks in Mermaid).

### Flowcharts (business logic, decisions, retry)

- Named branches / conditions from "Popis business logiky".
- Error paths from business-error list.
- Loops / retries from `src/http/retry.ts` or similar.

### BPMN

- Pools / lanes matching actors.
- Tasks matching described steps.
- Gateways matching text decisions.

## Comparison procedure

For each claim extracted above:

1. Find it in the diagram.
2. If it's present and matches → OK, no action.
3. If it's missing from the diagram → decide:
   - **Was it omitted by design** (e.g. simplified diagram)? Note it
     in the textual summary above the diagram
     ("Diagram zobrazuje pouze šťastnou cestu; chybové větve viz
     sekce 'Popis business logiky'."). No TODO.
   - **Was it omitted by oversight**? Add it to the diagram and
     re-validate.
4. If it's in the diagram but **not** in the text, check the code:
   - If code confirms the diagram element, extend the text with a
     one-line mention and cite the code.
   - If code does not confirm it, either remove it from the diagram
     (it's a hallucination) or mark
     `⚠️ TODO: diagram–text contradiction — <popis>`.

## Contradiction TODO format

Place directly below the diagram fenced block:

```markdown
> ⚠️ TODO: diagram–text contradiction — <short description>.
> Diagram says: <X>. Text says: <Y>.
```

Keep the wording stable — the orchestrator's TODO-resolution step
groups contradictions by this exact prefix.

### Example

```markdown
> ⚠️ TODO: diagram–text contradiction — pořadí validace vs. volání IDM.
> Diagram says: BE → IDM → validate. Text says: BE validuje lokálně
> nejprve, teprve pak volá IDM.
```

## Resolution boundaries

- **This step never rewrites the host text.** The diagram may be
  adjusted if the generator misread the code; otherwise the
  contradiction waits for the orchestrator.
- **This step never invents a source.** If the code is ambiguous, the
  contradiction stays open.
- **This step never deletes a valid claim** from the host text to
  match the diagram. The text is the canonical description.

## Stop-conditions (before saving the host file)

A diagram block can only be saved when:

1. It passes syntactic validation (Step 2 item 5).
2. Every claim extracted from the host text is either present in the
   diagram or documented as intentionally omitted in the summary.
3. Every unresolved discrepancy has a contradiction TODO directly
   under the diagram.

If any of these fails, re-enter Step 2 or Step 3 before proceeding
to Step 4 (Insert & save).

## Rules

- **NEVER** silently rewrite the host text to match the diagram or
  vice versa.
- **NEVER** skip the extraction step — a diagram without a list of
  extracted claims has not been consistency-checked.
- **ALWAYS** cite the code when resolving a contradiction; if the
  code is not available (orphan `integrations/*.md` with no source),
  leave the TODO open.
- **ALWAYS** keep the contradiction-TODO prefix
  `diagram–text contradiction —` exactly as shown, so the orchestrator
  can group them.
