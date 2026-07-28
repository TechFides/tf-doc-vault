---
title: 1.7 Seznam scénářů
status: draft
updated_at: <YYYY-MM-DD>
---

<!--
confluence:
  space: CNG
  title: Seznam scénářů
  parent: Funkční dokumentace
-->

<!-- generated: <YYYY-MM-DD> | source: <vX.Y.Z> -->

## Přehled

Master seznam všech scénářů napříč produktem. Scénáře jsou seskupeny
podle **modulu** (primární osa), případně dále podle **axis** (fallback
osa, např. `admin` vs. `user`), pokud to zvolený grouping vyžaduje;
viz `scenario-grouping.md`.

Jednotlivé scénáře žijí jako samostatné stránky pod
`functional/scenarios/sc-NN-<slug>.md`. Číslování `1.11.N` odpovídá
pořadí v rámci celé skupiny `1.11 Scénáře`, **ne** resetovanému
číslování v rámci modulu.

## Use-case diagram: celkový pohled

<!-- diagram-anchor: use-case-all -->

> Celkový use-case diagram (aktéři vs. scénáře napříč všemi moduly)
> doplní `docs-diagrams-from-code`.

## Mapa návaznosti scénářů

<Krátký textový popis, jak scénáře nasedají jeden na druhý, např.
"`SC-02 Registrace` → `SC-01 Přihlášení` → `SC-05 Úprava profilu`".
Detailní navazování je pak v I/O blocích v jednotlivých scenárových
stránkách (sekce "Spuštění výstupních procesů").>

## Scénáře podle modulů

### Modul `<module-1>`: <Český popis modulu>

<!-- diagram-anchor: use-case-<module-1> -->

> Use-case diagram pro modul `<module-1>` doplní
> `docs-diagrams-from-code` (volitelné, pouze pokud modul má dost
> scénářů, aby samostatný diagram dával smysl).

| Číslo  | SC-ID | Název scénáře        | Role / aktér | Odkaz                                                                                |
| ------ | ----- | -------------------- | ------------ | ------------------------------------------------------------------------------------ |
| 1.11.1 | SC-01 | Přihlášení uživatele | `user`       | [scenarios/sc-01-prihlaseni-uzivatele.md](./scenarios/sc-01-prihlaseni-uzivatele.md) |
| 1.11.2 | SC-02 | Registrace uživatele | `user`       | [scenarios/sc-02-registrace-uzivatele.md](./scenarios/sc-02-registrace-uzivatele.md) |
| …      | …     | …                    | …            | …                                                                                    |

### Modul `<module-2>`: <Český popis modulu>

<!-- diagram-anchor: use-case-<module-2> -->

| Číslo  | SC-ID | Název scénáře | Role / aktér | Odkaz                                                    |
| ------ | ----- | ------------- | ------------ | -------------------------------------------------------- |
| 1.11.N | SC-NN | <Název>       | `<role>`     | [scenarios/sc-NN-<slug>.md](./scenarios/sc-NN-<slug>.md) |
| …      | …     | …             | …            | …                                                        |

<Pokud zvolený grouping používá fallback axis, scénáře rozděl do
pod-nadpisů H4 uvnitř modulu, např. "#### Axis: `admin`" a
"#### Axis: `user`".>

## BPMN (pokud je v projektu využit)

<Pokud systém používá BPMN pro modelování procesů, odkaz na seznam
BPMN diagramů a jejich scénářů. Jinak sekci odstraň.>

- `<process-name>`: pokrývá scénáře `SC-NN`, `SC-NN`, `SC-NN`.
  - Zdroj BPMN: `<path/to/bpmn-file>`
  - Diagram doplní `docs-diagrams-from-code`:
    <!-- diagram-anchor: bpmn-<process-slug> -->

## Poznámky

> ⚠️ TODO: <případné mezery v mapování scénářů na moduly, které uživatel
> musí potvrdit, např. "scénář `SC-17` nemá jasný modul, kandidát
> `billing` vs. `reporting`">
