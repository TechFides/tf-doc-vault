---
title: <1.11.N Czech scenario name, e.g. 1.11.1 Přihlášení uživatele>
status: draft
updated_at: <YYYY-MM-DD>
module: <module, e.g. auth, billing, core>
axis: <optional fallback axis, e.g. admin, user, read, write>
---

<!--
confluence:
  space: CNG
  title: <Czech scenario name>
  parent: 1.11 Scénáře
-->

<!-- generated: <YYYY-MM-DD> | source: <vX.Y.Z> -->

## Info blok

| Pole              | Hodnota                                                          |
| ----------------- | ---------------------------------------------------------------- |
| SC-ID             | `SC-NN` <stable identifier, e.g. `SC-01`>                        |
| Cíl scénáře       | <Jedna věta popisující cíl scénáře z business pohledu.>          |
| Aktéři / role     | <Seznam rolí, např. `user`, `admin`, s odkazem na roles matrix> |
| Vstupní podmínky  | <Stav systému / uživatele, který musí platit před scénářem.>     |
| Výstupní podmínky | <Stav po úspěšném průchodu scénářem.>                            |
| NFRs (pokud jsou) | <Latency, availability, throughput, pokud definované.>          |
| Modul             | `<module>` (viz frontmatter)                                     |

**Zdroj:**

- Vstupní bod: `<path/to/controller-or-handler:LL>`
- Oprávnění: `<path/to/guard-or-role-check:LL>` → detail v
  [technical/roles-matrix.md](../technical/roles-matrix.md)

## Wireframe

<!-- wireframe-anchor: sc-NN -->

> Wireframy jsou generované samostatným skillem
> `docs-wireframes-from-code` po potvrzení textového obsahu a obrazovky
> v screenshotu (pokud byl k dispozici). Tato kotva označuje, kam bude
> wireframe vložen.

## Hlavní flow

1. <Krok 1: co udělá uživatel, jak systém reaguje.>
2. <Krok 2 …>
3. <Krok N.>

**Zdroj:**

- Orchestrace: `<path/to/service:LL>`
- Volané komponenty: `<path/to/collaborator:LL>`

<!-- diagram-anchor: flow-sc-NN -->

> Detailní sequence diagram doplní `docs-diagrams-from-code` na tuto
> kotvu.

## Přehled vstupních a výstupních dat

### Vstup

| Pole v UI / atribut | Typ      | Mandatornost             | Validace         | Zdroj vstupu                                  | Mapping na DB      |
| ------------------- | -------- | ------------------------ | ---------------- | --------------------------------------------- | ------------------ |
| `<field>`           | `<type>` | `required` \| `optional` | `<regex / rule>` | uživatel \| systém: `<scenario-or-API-link>` | `<table>.<column>` |

### Výstup

| Pole / atribut | Typ      | Zdroj v kódu       | Využití v dalších scénářích | API (název + atribut)        | Mapping na DB      |
| -------------- | -------- | ------------------ | --------------------------- | ---------------------------- | ------------------ |
| `<field>`      | `<type>` | `<path/to/dto:LL>` | `<next-scenario-link>`      | `<api-name>`: `<attribute>` | `<table>.<column>` |

**Zdroj:**

- Schéma požadavku: `<path/to/request-schema:LL>`
- Schéma odpovědi: `<path/to/response-schema:LL>`
- Datový model: [technical/architecture/data-model.md](../technical/architecture/data-model.md)

## Spuštění výstupních procesů

<Pokud je relevantní. Např.: "Po úspěšném přihlášení se spouští scénář
`SC-02 Obnova session`." Uveď zdroj (emit eventu, direct call,
scheduled job).>

- `<trigger>`: `<path/to/emitter:LL>` → `<follow-up scenario / job>`

<Pokud scénář žádný další proces nespouští, sekci můžeš odstranit.>

## Popis business logiky

<High-level slovní popis business logiky uvnitř scénáře. Včetně:
validací, větvení, business výjimek a chování při systémových
chybách.>

- **Validace**:
  - `<pravidlo>`: `<path/to/validator:LL>`
- **Business chyby (rainy scenarios)**:
  - `<business-error-code>`: `<path/to/error-definition:LL>` → detail
    v [technical/integrations/error-codes.md](../technical/integrations/error-codes.md)
- **Chování při systémové chybě**: <popis, zdroj>

<!-- diagram-anchor: business-logic-sc-NN -->

> Detailní flow diagram (rozhodovací strom) doplní
> `docs-diagrams-from-code`.

## Feature toggle

<Pokud na scénář působí nějaký feature toggle. Jinak sekci odstraň.>

- `<toggle-name>`: zdroj: `<path/to/toggle-usage:LL>`,
  detail v [technical/feature-toggles.md](../technical/feature-toggles.md).
- Chování při `ON`: <popis>
- Chování při `OFF`: <popis>

## Metriky

<Pokud scénář emituje metriky. Jinak sekci odstraň.>

- `<metric-name>`: zdroj: `<path/to/metric-emission:LL>`,
  popis a dashboard v [technical/monitoring-logging.md](../technical/monitoring-logging.md).

## Odkazy

- Předchozí scénář: [scenarios/sc-NN-<slug>.md](./sc-NN-<slug>.md)
- Následující scénář: [scenarios/sc-NN-<slug>.md](./sc-NN-<slug>.md)
- Seznam všech scénářů: [scenarios-list.md](../scenarios-list.md)
- Technické detaily API: [technical/consumed-apis/<api>.md](../technical/consumed-apis/<api>.md)
