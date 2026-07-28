# Layout from scenario page

Procedure for Step 2 when `Layout source = scenario-page` (no screenshot
provided). The scenario page is the canonical contract for a screen;
its I/O data table, main flow, and field labels describe **what must be
on the screen**; the code tells you **how the screen is shaped**.

Use this procedure in conjunction with `layout-from-screenshot.md`
when mixing sources (screenshot for some anchors, scenario-page for
others in the same run).

## Inputs you will read

For every anchor with `Layout source = scenario-page`:

1. The host scenario page; sections to read in order:
   - **Info blok** (module, axis, role / aktér): tells you who the
     screen is for (defines default skin / density).
   - **Hlavní flow**: numbered steps. Each step that mentions the UI
     (`uživatel vyplní …`, `klikne na …`, `systém zobrazí …`) maps to a
     visible control on the wireframe.
   - **Přehled vstupních a výstupních dat**: the input table is the
     authoritative list of fields. Columns: field name, type, required,
     validace, výchozí hodnota.
   - **Popis business logiky**: error hints and branch conditions;
     only those that manifest visually (banner, inline hint) belong on
     the wireframe.
   - **Feature toggle**: conditionally visible elements.
2. The code for the screen component: route definition, form schema,
   i18n file. Use it to disambiguate when the scenario text is terse.
3. Shared fragments index (`wf-fragments-index.md`).

## Translation procedure

### 1. Decide the canvas and skin

- **Device**: read scenario's role / channel. `admin` scenarios are
  typically desktop; customer-facing are mobile unless the code says
  otherwise. When undecided, default to mobile/light and ask the user
  in Step 1.
- **Skin**: light by default. Switch to dark only if the code or the
  project-wide convention enforces dark for the screen.
- **Canvas size**: use the standard for the device class
  (`375×812` mobile, `1280×800` desktop). Do not pick exotic sizes to
  match a specific field count.

### 2. Derive the structure from the main flow

Walk the numbered steps of **Hlavní flow**:

- Step "systém zobrazí obrazovku X" → header fragment + screen title.
- Step "uživatel vyplní <pole>" → input fragment per field in the input
  table.
- Step "uživatel klikne <tlačítko>" → button fragment with the label
  used in the step.
- Step "systém zobrazí chybu" → banner / inline-error hint on the
  relevant field.

If a step mentions a control not in the input table, reconcile before
drawing: either the table is incomplete (ask / flag) or the control is
decorative (don't draw).

### 3. Derive fields from the input table

For every row of **Přehled vstupních a výstupních dat → input**:

| Column in table | Wireframe decision                               |
| --------------- | ------------------------------------------------ |
| Name            | Field label in Czech with diacritics             |
| Type            | Pick `input-text` / `-password` / `-datetime` …  |
| Required        | Add asterisk or subtle "(povinné)", per project |
| Validace        | Sample error hint under the field (optional)     |
| Výchozí hodnota | Pre-filled value in the input                    |

- Preserve the **order** of rows as the visual top-to-bottom order
  unless the code groups them differently (e.g. into sections).
- Group related fields into sections when the table has clear grouping
  (e.g. "Osobní údaje", "Adresa"). Use a subtle section header fragment
  instead of fat dividers.

### 4. Derive controls from the step list

- Primary button label = scenario step wording, verbatim (`Přihlásit
se`, `Uložit`, `Potvrdit objednávku`).
- Secondary links (`Zapomněli jste heslo?`) come from the scenario text
  or i18n resources; never invent labels.
- Cancel / close buttons exist only if the step list mentions them; do
  not add a default "Zrušit" button.

### 5. Derive the empty / loading / error states

A single scenario page typically maps to **one wireframe per anchor**.
Multi-state anchors are rare; check for anchor-name suffixes:

- `wireframe: sc-NN-empty` / `wireframe: sc-NN-error` / `wireframe:
sc-NN-loading`; separate anchors with their own SVGs.

If the scenario describes an error as inline hint below a field, render
the hint on the base wireframe. If it describes a full-screen error or
empty state, it must have its own anchor; if it doesn't, flag a
wireframe-gap TODO in the host page:

```markdown
> ⚠️ TODO: wireframe gap: chybová obrazovka popsána v 'Popis business
> logiky' (větev validace IČO), chybí anchor ani SVG.
```

### 6. Cross-check with technical docs

When the scenario page under-describes the UI, use secondary sources
(already stable at this point of the run):

- **`technical/architecture/components.md`**: which component owns the
  screen, which sub-components it composes.
- **`technical/integrations/*`**: if the screen triggers a backend
  call, reflect the state machine (loading spinner between submit and
  response).
- **`technical/roles-matrix.md`**: whether admin-only controls should
  be present for the scenario's role.

Do **NOT** use these as layout sources when they contradict the
scenario; raise the contradiction as a TODO in the host page
(`consistency-check.md`, §contradiction TODO format).

## Content decisions without a screenshot

Without a screenshot you lack visual cues, so lean on project-wide
defaults:

- **Density**: mobile = 8 px rhythm, desktop = 12 px rhythm, unless the
  project declares otherwise.
- **Type scale**: one heading, one subheading, one body, one caption.
  Extra sizes only when the code enforces them.
- **Color palette**: use the fragment palette defined in
  `wf-fragments/README.md`. Do not introduce new colors.
- **Iconography**: stick to the icons registered in fragments. If an
  icon is needed but not registered, omit it and flag a wireframe gap
  and do not inline arbitrary SVG icons.

## Example walk-through

> Scenario `sc-03-pridat-ucastnika` (admin adds an attendee).
>
> Input table: `Jméno*`, `Příjmení*`, `E-mail*`, `Telefon`, `Role*`.
> Main flow: `admin otevře formulář → vyplní pole → klikne "Uložit" →
systém uloží a zobrazí seznam účastníků`.
> Popis business logiky: `pokud e-mail již existuje, zobrazí se hláška
pod polem`.
>
> **Wireframe decisions**: desktop / light shell (admin context). Form
> with 5 inputs in the table order, `*` on required fields. Primary
> button "Uložit". Sample error hint under e-mail: "Tento e-mail je již
> obsazen." Title fragment header with "Přidat účastníka".

## Rules

- **ALWAYS** derive fields from the scenario's input table; label order
  mirrors the table order.
- **ALWAYS** copy button labels verbatim from the main flow.
- **NEVER** invent UI elements not implied by the scenario or the code.
- **NEVER** merge multiple states (empty / error / loading) onto one
  wireframe unless the anchor name says so.
- **NEVER** let technical-doc secondary sources override a scenario
  claim; raise a contradiction TODO instead.
