# Proposed functional menu structure

Derived from the project-wide `documentation-structure.md`. This is the
**proposal** the `docs-functional-from-code` skill uses in Step 1. It is
NOT a fixed set; see `SKILL.md` rules for skipping proposed pages
without evidence and for adding non-proposed pages found in the code.

All folders live under `docs/<version>/functional/`.

## Depth rule

The menu is at most **three levels deep**:

1. **Section**: `functional/`.
2. **Skupina**: a folder directly under the section (e.g. `scenarios/`).
3. **Stránka**: a `.md` file directly under a skupina, or a top-level
   page directly under the section.

Do **NOT** nest groups inside groups. Scenarios are grouped logically
by module via frontmatter metadata, **not** by nested folders; see
`scenario-grouping.md`.

## Numbering

Titles use the hierarchical numbering from the tables below. The
section itself carries **no numeric prefix**; its `title` is simply
`Funkční dokumentace`. Skupiny and stránky carry prefixes like
`1.11 Scénáře` and `1.11.1 Přihlášení uživatele`.

Numbering uses a single space separator (**no hyphen**) between the
number and the Czech label (e.g. `1.11.1 Přihlášení uživatele`, not
`1.11.1 - Přihlášení uživatele`).

## Section index

- `functional/index.md`: `title: Funkční dokumentace`, `order: 1`.
  No numeric prefix.

## Top-level pages and groups

| Order | Number | Path                    | File                   | Czech label (title)         |
| ----- | ------ | ----------------------- | ---------------------- | --------------------------- |
| 1     | 1.1    | `functional/`           | `overview.md`          | 1.1 Přehled                 |
| 2     | 1.2    | `functional/`           | `product-structure.md` | 1.2 Přehled produktu        |
| 3     | 1.3    | `functional/`           | `glossary.md`          | 1.3 Glosář                  |
| 4     | 1.4    | `functional/`           | `actors.md`            | 1.4 Seznam aktérů           |
| 5     | 1.5    | `functional/`           | `personas.md`          | 1.5 Persóny uživatelů       |
| 6     | 1.6    | `functional/`           | `screens.md`           | 1.6 Seznam obrazovek        |
| 7     | 1.7    | `functional/`           | `scenarios-list.md`    | 1.7 Seznam scénářů          |
| 8     | 1.8    | `functional/`           | `business-rules.md`    | 1.8 Business pravidla       |
| 9     | 1.9    | `functional/`           | `notifications.md`     | 1.9 Notifikace a komunikace |
| 10    | 1.10   | `functional/`           | `reports.md`           | 1.10 Reporty a analytiky    |
| 11    | 1.11   | `functional/scenarios/` | group (see below)      | 1.11 Scénáře                |

Optional pages: `personas.md` (1.5) and `reports.md` (1.10) are skipped
when no evidence exists (confirmed with the user per Step 1).

## Group: `scenarios/` (1.11)

Scenarios live **flat** under `scenarios/<sc-id>.md`, with no module
subfolders, so the three-level depth rule is respected. Each scenario
is numbered `1.11.N` in the order agreed in the Step 1 plan.

| Number | File                        | Czech label (title) (example) |
| ------ | --------------------------- | ----------------------------- |
| 1.11.1 | `scenarios/sc-01-<slug>.md` | 1.11.1 Přihlášení uživatele   |
| 1.11.2 | `scenarios/sc-02-<slug>.md` | 1.11.2 Registrace uživatele   |
| 1.11.3 | `scenarios/sc-03-<slug>.md` | 1.11.3 Obnovení hesla         |
| …      | …                           | …                             |

### Filename and identifiers

- **Filename**: `sc-NN-<kebab-slug>.md`: stable SC-ID, kebab-case ASCII
  (no diacritics), e.g. `sc-01-prihlaseni-uzivatele.md`. The SC-ID is
  zero-padded to two digits for sort stability.
- **Title**: number + single space + Czech label with diacritics,
  **no hyphen** between the number and the label, e.g.
  `1.11.1 Přihlášení uživatele`.
- **Scenario info block**: includes the stable identifier as a separate
  line (`SC-ID: SC-01`) so both the numeric (`1.11.1`) and the stable
  (`SC-01`) identifier are preserved.
- **Module**: recorded in frontmatter as `module: <name>` (e.g.
  `auth`, `billing`). This is a logical label used for ordering and
  cross-reference, **not** a folder.

## Use-case diagram placement

The per-module / per-group use-case diagram belongs on
`scenarios-list.md` (1.7), not inside the `scenarios/` group. The
`scenarios-list.md` page holds the master scenario table and anchors
the use-case diagram(s) via `<!-- diagram-anchor: use-case-all -->`
and optionally `<!-- diagram-anchor: use-case-<module> -->` per module
section.

## Skip rules

- If a proposed page has no evidence in **either** source (code +
  already-generated `technical/`), list it in the plan as
  `skip: no evidence` and confirm with the user.
- If the scanned sources suggest a page or group **not** in this
  proposal (e.g. an `integrations-external-partners.md` overview page),
  propose it to the user with a suggested Czech label and numbering.

## Label, numbering, and order rules

- Czech label with diacritics (§7 of `CLAUDE.md`).
- The `title` field in frontmatter includes the numbering prefix
  exactly as shown in the tables above (§5 of `CLAUDE.md`).
- Number and Czech label are separated by a **single space**, with no
  hyphen (e.g. `1.11.1 Přihlášení uživatele`).
- Section-level `index.md` carries **no** numeric prefix in its
  `title`.
- `order` values above are a suggested default; the user may override.
- New (non-proposed) top-level pages get an `order` at the end of the
  list and a numbering prefix agreed with the user.
- **Depth cap**: no group inside a group. Scenarios stay flat in
  `scenarios/` and use the `module:` frontmatter for logical grouping.
