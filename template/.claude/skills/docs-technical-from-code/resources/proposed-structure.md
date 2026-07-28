# Proposed technical menu structure

Derived from the project-wide `documentation-structure.md`. This is the
**proposal** the `docs-technical-from-code` skill uses in Step 1. It is
NOT a fixed set; see `SKILL.md` rules for skipping proposed groups
without evidence and for adding non-proposed groups found in the code.

All folders live under `docs/<version>/technical/`.

## Depth rule

The menu is at most **three levels deep**:

1. **Section**: `technical/`.
2. **Skupina**: a folder directly under the section (e.g.
   `architecture/`, `security/`, `consumed-apis/`).
3. **Stránka**: a `.md` file directly under a skupina, or a
   top-level page directly under the section.

Do **NOT** nest groups inside groups. Repeating collections (ADRs, APIs)
sit at section level as their own skupiny.

## Numbering

Titles use the hierarchical numbering from the tables below. The
section itself carries **no numeric prefix**; its `title` is simply
`Technická dokumentace`. Skupiny and stránky carry prefixes like
`2.4 Architektura systému` and `2.4.1 Komponentový diagram`.

Numbering uses a single space separator (**no hyphen**) between the
number and the Czech label (e.g. `2.4.1 Komponentový diagram`, not
`2.4.1 - Komponentový diagram`).

## Section index

- `technical/index.md`: `title: Technická dokumentace`, `order: 2`.
  No numeric prefix.

## Top-level pages and groups

| Order | Number | Path                               | File(s) / pages         | Czech label (title)                        |
| ----- | ------ | ---------------------------------- | ----------------------- | ------------------------------------------ |
| 1     | 2.1    | `technical/`                       | `tech-stack.md`         | 2.1 Přehled technologického stacku         |
| 2     | 2.2    | `technical/`                       | `infrastructure.md`     | 2.2 Infrastruktura a hosting               |
| 3     | 2.3    | `technical/`                       | `cicd.md`               | 2.3 CI/CD pipeline                         |
| 4     | 2.4    | `technical/architecture/`          | group (see below)       | 2.4 Architektura systému                   |
| 5     | 2.5    | `technical/adr/`                   | group (see below)       | 2.5 Architecture Decision Records          |
| 6     | 2.6    | `technical/security/`              | group (see below)       | 2.6 Bezpečnost                             |
| 7     | 2.7    | `technical/integrations/`          | group (see below)       | 2.7 Integrace a komunikace                 |
| 8     | 2.8    | `technical/consumed-apis/`         | group (see below)       | 2.8 Konzumovaná API                        |
| 9     | 2.9    | `technical/exposed-public-apis/`   | group (see below)       | 2.9 Exponovaná veřejná API                 |
| 10    | 2.10   | `technical/exposed-internal-apis/` | group (see below)       | 2.10 Exponovaná interní API                |
| 11    | 2.11   | `technical/`                       | `roles-matrix.md`       | 2.11 Matice rolí a oprávnění               |
| 12    | 2.12   | `technical/`                       | `automated-jobs.md`     | 2.12 Automatizované úlohy                  |
| 13    | 2.13   | `technical/tests/`                 | group (see below)       | 2.13 Testy                                 |
| 14    | 2.14   | `technical/`                       | `sla.md`                | 2.14 SLA                                   |
| 15    | 2.15   | `technical/`                       | `monitoring-logging.md` | 2.15 Monitoring a logování                 |
| 16    | 2.16   | `technical/`                       | `scaling.md`            | 2.16 Škálování                             |
| 17    | 2.17   | `technical/`                       | `feature-toggles.md`    | 2.17 Využití feature toggles               |
| 18    | 2.18   | `technical/`                       | `caching.md`            | 2.18 Caching                               |
| 19    | 2.19   | `technical/`                       | `localization.md`       | 2.19 Lokalizace                            |
| 20    | 2.20   | `technical/`                       | `disaster-recovery.md`  | 2.20 Disaster recovery a incident response |
| 21    | 2.21   | `technical/`                       | `accessibility.md`      | 2.21 Accessibility                         |
| 22    | 2.22   | `technical/`                       | `audit.md`              | 2.22 Audit                                 |
| 23    | 2.23   | `technical/guides/`                | group (see below)       | 2.23 Návody                                |

## Group: `architecture/` (2.4)

| Number | File                               | Czech label (title)        |
| ------ | ---------------------------------- | -------------------------- |
| 2.4.1  | `architecture/components.md`       | 2.4.1 Komponentový diagram |
| 2.4.2  | `architecture/c4.md`               | 2.4.2 C4 diagram           |
| 2.4.3  | `architecture/domain-model.md`     | 2.4.3 Doménový model       |
| 2.4.4  | `architecture/data-model.md`       | 2.4.4 Datový model         |
| 2.4.5  | `architecture/runtime.md`          | 2.4.5 Runtime              |
| 2.4.6  | `architecture/state-management.md` | 2.4.6 State management     |

## Group: `adr/` (2.5): Architecture Decision Records

ADR pages live flat under `adr/NNNN-<slug>.md` (e.g.
`adr/0001-use-postgres.md`). Their `title` uses the chain `2.5.N <name>`,
e.g. `2.5.1 Use PostgreSQL`.

| Number | File                 | Czech label (title) (example) |
| ------ | -------------------- | ----------------------------- |
| 2.5.1  | `adr/0001-<slug>.md` | 2.5.1 <ADR title>             |
| 2.5.2  | `adr/0002-<slug>.md` | 2.5.2 <ADR title>             |
| …      | …                    | …                             |

## Group: `security/` (2.6)

| Number | File                          | Czech label (title)            |
| ------ | ----------------------------- | ------------------------------ |
| 2.6.1  | `security/authn-authz.md`     | 2.6.1 Autentizace a autorizace |
| 2.6.2  | `security/data-protection.md` | 2.6.2 Ochrana dat              |
| 2.6.3  | `security/compliance.md`      | 2.6.3 Compliance a regulace    |

## Group: `integrations/` (2.7)

| Number | File                                | Czech label (title)             |
| ------ | ----------------------------------- | ------------------------------- |
| 2.7.1  | `integrations/overview.md`          | 2.7.1 Přehled komunikace        |
| 2.7.2  | `integrations/api-authorization.md` | 2.7.2 Autorizace API            |
| 2.7.3  | `integrations/events.md`            | 2.7.3 Event catalog             |
| 2.7.4  | `integrations/error-codes.md`       | 2.7.4 Přehled chybových hlášení |

## Group: `consumed-apis/` (2.8)

Flat: one page per consumed API.

| Number | File                     | Czech label (title) (example)   |
| ------ | ------------------------ | ------------------------------- |
| 2.8.1  | `consumed-apis/<api>.md` | 2.8.1 Konzumované API `<api>`   |
| 2.8.2  | `consumed-apis/<api>.md` | 2.8.2 Konzumované API `<api>`   |
| …      | …                        | …                               |

## Group: `exposed-public-apis/` (2.9)

Flat: one page per exposed public API.

| Number | File                           | Czech label (title) (example) |
| ------ | ------------------------------ | ----------------------------- |
| 2.9.1  | `exposed-public-apis/<api>.md` | 2.9.1 Veřejné API `<api>`     |
| …      | …                              | …                             |

## Group: `exposed-internal-apis/` (2.10)

Flat: one page per exposed internal API.

| Number | File                             | Czech label (title) (example) |
| ------ | -------------------------------- | ----------------------------- |
| 2.10.1 | `exposed-internal-apis/<api>.md` | 2.10.1 Interní API `<api>`    |
| …      | …                                | …                             |

## Group: `tests/` (2.13)

| Number | File                   | Czech label (title)      |
| ------ | ---------------------- | ------------------------ |
| 2.13   | `tests/index.md`       | 2.13 Testy (přehled)     |
| 2.13.1 | `tests/unit.md`        | 2.13.1 Unit tests        |
| 2.13.2 | `tests/integration.md` | 2.13.2 Integration tests |
| 2.13.3 | `tests/load.md`        | 2.13.3 Load tests        |
| 2.13.4 | `tests/mocks.md`       | 2.13.4 Mocks             |
| 2.13.5 | `tests/smoke.md`       | 2.13.5 Smoke tests       |

Note: `tests/index.md` is a **real content page** (overview of testing
levels per §2.9 of `documentation-structure.md`), not a pure folder
marker. It is the only group index in this proposal that carries body
content.

## Group: `guides/` (2.23)

| Number | File                        | Czech label (title)                     |
| ------ | --------------------------- | --------------------------------------- |
| 2.23.1 | `guides/local-setup.md`     | 2.23.1 Rozchození lokálního prostředí   |
| 2.23.2 | `guides/test-setup.md`      | 2.23.2 Rozchození testovacího prostředí |
| 2.23.3 | `guides/troubleshooting.md` | 2.23.3 Troubleshooting guide            |
| 2.23.4 | `guides/onboarding.md`      | 2.23.4 Onboarding nového vývojáře       |

## Skip rules

- If a proposed group has no code evidence, list it in the plan as
  `skip: no evidence` and confirm with the user.
- If the codebase suggests a group not in this proposal (e.g. a
  project-specific `data-pipeline/`), propose it to the user in Step 1
  and agree on a Czech label, numbering (next free `2.X` or inserted
  with user consent), and `order`.

## Label, numbering, and order rules

- Czech label with diacritics (§7 of `CLAUDE.md`).
- The `title` field in frontmatter includes the numbering prefix
  exactly as shown in the tables above (§5 of `CLAUDE.md`).
- Number and Czech label are separated by a **single space**, with no
  hyphen (e.g. `2.4.1 Komponentový diagram`).
- Section-level `index.md` carries **no** numeric prefix in its
  `title`.
- `order` values above are a suggested default; the user may override.
- New (non-proposed) groups get an `order` at the end of the list and
  a numbering prefix agreed with the user.
- **Depth cap**: no group inside a group. Repeating collections get
  their own section-level skupina.
