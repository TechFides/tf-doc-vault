# Layout from screenshot

Procedure for Step 2 when the anchor's `Layout source = screenshot`.
Screenshots are the highest-fidelity input for a wireframe — but they
are **input-only**: not stored in `wf-fragments/`, discarded after the
run, and never added to the repository (§9 CLAUDE.md).

## Screenshot kinds — example vs. real app

Before drawing, classify the screenshot. The kind decides how faithfully
the SVG must copy the original.

| Kind                            | Source                                                                      | Fidelity goal                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Real app screenshot**         | Running production / staging UI of the app being documented                 | **1:1 copy in SVG** — every visible element, label, position, and state (only PII is substituted)   |
| **Example / mockup screenshot** | Design file, Figma export, competitor app, reference image from another app | **Layout inspiration only** — borrow structure and positions, fill content from the scenario / code |

How to tell the two apart — ask the user at Step 1. If unclear, treat
it as `example / mockup` (safer default: less risk of shipping
real-app details the code doesn't back up).

### Real app screenshot — 1:1 fidelity

- Copy the visible layout **verbatim**: every input, button, label,
  badge, avatar, helper text appears in the SVG in the same position.
- Copy the visible text content **verbatim**, including Czech
  diacritics, exact button wording, placeholder samples — except for
  PII (see §"What NOT to transcribe" below).
- Copy the visible state verbatim — if the screenshot shows a filled
  form with validation hint, the SVG shows the same.
- The SVG is an accurate record of how the app looks **today**. It is
  NOT an idealized re-design.
- Deviations from the screenshot are only allowed when (a) the code
  confirms the deviation, or (b) the scenario explicitly documents a
  different target state. Any deviation gets a TODO:

  ```markdown
  > ⚠️ TODO: wireframe–text contradiction — SVG deviates from
  > real-app screenshot. Reason: <why>.
  ```

### Example / mockup screenshot — layout inspiration only

- Use the screenshot to pick the shell, the grid, and the block
  placement.
- **Do NOT copy the mockup's sample text verbatim** — it may be
  lorem, unrelated copy, or a competitor's wording. Use labels from
  the scenario page / code instead.
- **Do NOT copy mockup-only decorations** (illustrations, promo
  banners, brand elements) that the real app does not carry.
- If the mockup shows a state the scenario does not describe, draw
  the scenario's state, not the mockup's.

## Before you start

1. Confirm with the user: **is this a real-app screenshot or an
   example / mockup?** Record the answer in the Step 1 plan row.
2. Confirm the mapping `anchor-id → screenshot-path`. If a mapping is
   ambiguous, ask — never guess.
3. Open the screenshot and identify:
   - **Device class** — mobile / tablet / desktop. Pick the shell
     fragment accordingly.
   - **Theme** — light / dark. Pick the corresponding shell fragment
     variant.
   - **Canvas size** — derive from the screenshot; round to the nearest
     standard (e.g. 375×812 for iPhone, 1280×800 for desktop).
4. Read the corresponding scenario page to understand which fields /
   states the wireframe must show. The screenshot may show a different
   state (e.g. filled form) than the scenario describes (empty state).
   - **Real-app screenshot** → draw the screenshot's state; flag the
     scenario/screenshot disagreement as a contradiction TODO.
   - **Example / mockup** → draw the scenario's state; use the
     screenshot only for layout.

## Translation procedure

### 1. Establish the grid

- Measure (visually is fine) the outer margin, column count, and column
  gap on the screenshot.
- Project them onto the SVG canvas — keep the same ratios, not the same
  pixel values. A 24 px margin on a 375 px mobile canvas becomes a 24 px
  margin in the SVG, but if the SVG uses a smaller canvas, scale
  proportionally.
- Establish a single vertical rhythm (e.g. 8 px) — every element's `y`
  should be a multiple of it.

### 2. Identify reusable blocks

- Scan the screenshot for UI primitives that match fragments in
  `wf-fragments-index.md`:
  - headers, tab bars, side nav,
  - buttons, inputs, checkboxes,
  - list rows, cards, modals,
  - avatars, badges, banners.
- For each match, use the fragment — do not re-draw inline.
- For elements that do not match any fragment, draft inline and flag
  them for the Step 5 retrospective fragment proposal.

### 3. Extract text content

- **Field labels**:
  - **Real app screenshot** → copy verbatim, including Czech diacritics.
    Do not translate, do not shorten.
  - **Example / mockup** → use the scenario's field labels (the mockup's
    labels may be lorem or a different project's wording).
- **Technical identifiers** (URL, endpoint, class name, status code)
  stay in their original language, both kinds.
- **Placeholder / sample values**:
  - **Real app screenshot** → keep visible sample data, with PII
    substitution (real `jan.kovar@example.com` → neutral sample like
    `uzivatel@example.com`).
  - **Example / mockup** → substitute neutral samples aligned with the
    scenario; do not carry mockup's lorem or competitor's copy.
- **State indicators** (badges, chips) — transcribe the visible label
  verbatim for real-app; use the scenario's wording for mockups.

### 4. Positioning

- Position every block on the grid, not at raw screenshot pixel
  coordinates (screenshots are subject to scaling, status bar variations,
  and cropping).
- Avatars follow `avatar-rules.md` (`y == cy`, labels below).
- Vertical order on the SVG **matches** the screenshot — never reorder
  for aesthetics.

### 5. What NOT to transcribe

These rules apply **to both kinds** (real app and example / mockup),
unless a row explicitly says otherwise.

- **Real personal data** (photos of real people, real phone numbers,
  real e-mails) — ALWAYS replace with a placeholder initials avatar and
  neutral sample text. The wireframe must not ship recognizable PII,
  even when the screenshot is a faithful real-app capture.
- **Time-dependent content** (live notifications, timestamps like "před
  2 min"): keep the textual shape but use a neutral sample
  (`před N min`, `12:34`) so the wireframe doesn't look stale.
  Applies to both kinds.
- **Decorative elements** — for a **real-app screenshot**, keep them if
  they are really there (they are part of the app). For an **example /
  mockup**, drop them: if the mockup shows a banner promoting feature X
  but scenario Y is about login, do NOT include the banner.
- **Error states** — for a **real-app screenshot**, draw the state the
  screenshot shows (it is the real state of the app right now); flag a
  `wireframe–text contradiction` if the scenario describes the happy
  path instead. For an **example / mockup**, draw the scenario's state
  and ignore the mockup's state.

## Partial / low-resolution screenshots

- **Cropped screenshot** (only the top half visible): draw only what is
  visible; mark the rest with `⚠️ TODO: wireframe gap —` in the host
  page (Step 2 item 4). Do NOT invent the bottom.
- **Blurry screenshot**: transcribe what is legible; for illegible text,
  use a Czech placeholder label consistent with the scenario data table
  if available, otherwise mark a wireframe gap.
- **Dark mode screenshot for a light-mode scenario** (or vice versa):
  keep the scenario-required skin; use the screenshot only for layout.
- **Multiple screenshots for one anchor**: the user must tell you which
  is authoritative. If unclear, ask.

## Handling tabs, popovers, modals

- If the screenshot shows a modal overlay, the wireframe reflects the
  modal state only when the scenario describes it. Otherwise draw the
  underlying screen without the modal.
- For tabbed screens, the active tab matches the scenario — not the
  screenshot's active tab.
- For popovers / menus, draw the anchor screen closed; popovers get
  their own anchor in the scenario if important.

## Cross-checking with the scenario page

After drafting, run the Step 3 consistency check
(`consistency-check.md`). The screenshot does not exempt the wireframe
from text-consistency — if the scenario enumerates fields A, B, C and
the screenshot shows A, B, D, the contradiction must be resolved (by
re-reading the code) or flagged.

## Example walk-through

### A) Real-app screenshot (1:1 copy)

> Scenario `sc-01-login` describes fields: email, heslo, "Přihlásit se",
> "Zapomněli jste heslo?". **Real-app screenshot** shows exactly these
> four elements, plus a "Zapamatovat mě" checkbox.
>
> **Decision**: the real app has a "Zapamatovat mě" checkbox → keep it
> in the SVG (SVG = faithful copy). The scenario is incomplete; raise
> `⚠️ TODO: wireframe–text contradiction — reálná aplikace má
checkbox 'Zapamatovat mě', scénář ho neuvádí.` The fix belongs on
> the scenario side, not on the SVG.

### B) Example / mockup screenshot (layout only)

> Same scenario `sc-01-login`. **Mockup screenshot** (Figma reference
> from a design library) shows: email, heslo, checkbox "Remember me",
> button, link, plus a "Sign in with Google" SSO button.
>
> **Decision**: the SSO button is not in the scenario and no SSO route
> exists in the code → omit from the SVG (mockups are inspiration, not
> contract). "Remember me" in English → translate to "Zapamatovat mě"
> **only** if the scenario or code calls for such a checkbox; otherwise
> drop it.

## Rules

- **ALWAYS** classify the screenshot as real-app or example/mockup in
  Step 1 — the two are governed by different fidelity rules.
- **ALWAYS** strip PII and substitute neutral sample values (both
  kinds).
- **Real-app screenshot** → SVG is a 1:1 copy; any deviation requires a
  TODO.
- **Example / mockup** → SVG borrows layout; content follows the
  scenario / code.
- **NEVER** add elements that are on neither the screenshot nor the
  scenario (both kinds).
- **NEVER** reorder or restyle for aesthetics — match the real app's
  visible hierarchy, or the scenario-driven order for mockups.
- **NEVER** store the screenshot in the repository — input-only.
