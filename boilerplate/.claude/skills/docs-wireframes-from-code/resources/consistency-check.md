# Consistency check: wireframe vs. host scenario page

Step 3 of `docs-wireframes-from-code`. After a wireframe is generated and
sanitized, compare it against the host scenario page **before** saving the
host file. Every claim the scenario makes about the screen must be visible
on the wireframe, and every element on the wireframe must be supported by
the scenario or by code.

If the two sides disagree and the disagreement cannot be resolved by
re-reading the code, mark the contradiction as a TODO; **never**
silently change the scenario text or the wireframe.

## Extraction step: what to pull from the scenario

Re-read the scenario page around the anchor and list the concrete claims
it makes about the screen. Checklist:

### Fields

- Every row of **Přehled vstupních a výstupních dat → input** must map
  to a visible input on the wireframe.
- Field labels match the scenario's **Name** column (Czech, diacritics).
- Required indicators (`*` / "povinné") match the scenario's **Required**
  column.
- Default values in the scenario's **Výchozí hodnota** column are
  pre-filled on the wireframe.

### Buttons and links

- Every button / link mentioned in **Hlavní flow** is present.
- Button labels match the verbatim wording (`Přihlásit se`, `Uložit`).
- Secondary actions (`Zapomněli jste heslo?`) mentioned in the scenario
  are rendered as links in the expected position.

### States

- If the scenario has multi-state anchors (`wireframe: sc-NN-empty`,
  `-error`, `-loading`), verify that each anchor has its own matching
  SVG and the correct state is drawn.
- Inline validation hints mentioned in **Popis business logiky** appear
  under the relevant field.
- Error banners described in **Popis business logiky** appear at the
  top of the screen.

### Feature toggles

- Controls behind a feature toggle (**Feature toggle** section) are
  drawn only when the toggle is enabled in the scenario's documented
  default.
- If the scenario documents both ON and OFF variants, each needs its
  own anchor and its own SVG.

### Role / actor

- The wireframe's density / skin matches the scenario's role (admin →
  desktop; customer → mobile, unless overridden).
- Controls exclusive to a different role do not appear on the
  wireframe.

### Data examples

- Sample values in inputs / placeholders are consistent with the
  scenario's example values; at minimum, no real PII.

### References to other diagrams or screens

- If the scenario links to a sub-screen via another anchor, the current
  wireframe does not try to cover both; each anchor gets its own SVG.

## Comparison procedure

For each claim extracted above:

1. Find it on the wireframe.
2. If it's present and matches → OK, no action.
3. If it's missing from the wireframe → decide:
   - **Was it omitted by design** (e.g. scenario describes a rarely-used
     secondary control and the wireframe keeps focus on the primary
     flow)? Mention it in the textual summary above the figure
     reference ("Wireframe zobrazuje pouze primární akce; sekundární
     akce viz 'Popis business logiky'."). No TODO.
   - **Was it omitted by oversight**? Add it to the wireframe and
     re-validate.
4. If it's on the wireframe but **not** in the scenario, check the
   code:
   - If code confirms the element, extend the scenario with a one-line
     mention and cite the code (scenario text is the canonical
     description: update it, do not drop the element).
   - If code does not confirm it, remove it from the wireframe.

## Contradiction TODO format

Place directly below the figure reference:

```markdown
> ⚠️ TODO: wireframe–text contradiction: <short description>.
> Wireframe shows: <X>. Scenario says: <Y>.
```

Keep the prefix `wireframe–text contradiction:` stable; the
orchestrator groups contradictions by it.

### Example

```markdown
> ⚠️ TODO: wireframe–text contradiction: pořadí polí ve formuláři.
> Wireframe shows: e-mail → heslo → tlačítko. Scenario says: heslo →
> e-mail → tlačítko (krok 2 a 3 v Hlavním flow).
```

## Wireframe-gap vs. contradiction

Two TODO kinds can emerge from Step 3; use the right one:

- **`wireframe–text contradiction`**: scenario and wireframe disagree
  on an element that both sides describe (different label, different
  position, different state).
- **`wireframe gap`**: scenario describes an element (or a state) but
  the wireframe does not draw it, and no amount of re-reading code fills
  the blank (e.g. scenario references an error screen with no
  screenshot and no UI component in code). Format:

  ```markdown
  > ⚠️ TODO: wireframe gap: <co chybí, kde>.
  ```

## Resolution boundaries

- **This step never rewrites the scenario text.** The wireframe may be
  adjusted if the generator misread the screenshot / code; otherwise
  the contradiction waits for the orchestrator.
- **This step never invents UI.** If the scenario is ambiguous, the
  gap stays open as a `wireframe gap` TODO.
- **This step never deletes a valid scenario claim** to match the
  wireframe. The scenario is the canonical description.

## Stop-conditions (before inserting the figure reference)

The wireframe can only be inserted into the host page when:

1. It passes `scripts/validate-svg.sh` (Step 2 item 6).
2. Every claim extracted from the scenario is either visible on the
   wireframe or documented as intentionally omitted in the summary.
3. Every unresolved discrepancy has a contradiction or gap TODO
   directly under the figure reference.

If any of these fails, re-enter Step 2 or Step 3 before proceeding to
Step 4 (Insert figure reference into host page and save).

## Rules

- **NEVER** silently rewrite the scenario text to match the wireframe or
  vice versa.
- **NEVER** skip the extraction step: a wireframe without a list of
  extracted claims has not been consistency-checked.
- **ALWAYS** cite the code when resolving a contradiction; if the code
  does not settle it, leave the TODO open.
- **ALWAYS** keep the contradiction-TODO prefix
  `wireframe–text contradiction:` exactly as shown, so the
  orchestrator can group them.
- **ALWAYS** use `wireframe gap:` for missing elements / missing
  screens, not for disagreements; the orchestrator resolves the two
  kinds differently.
