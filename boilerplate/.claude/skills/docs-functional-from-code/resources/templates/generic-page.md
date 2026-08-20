---
title: <1.X Czech page title, e.g. 1.3 Glosář>
status: draft
updated_at: <YYYY-MM-DD>
order: <integer from proposed-structure.md, unique among siblings>
---

<!--
confluence:
  space: CNG
  title: <Czech page title>
  parent: <Parent page, section or group>
-->

<!-- generated: <YYYY-MM-DD> | source: <vX.Y.Z> -->

## Přehled

<Jedna až dvě věty o tom, co tato stránka popisuje a komu je určena
(z business pohledu). Implementační detaily patří do technické sekce,
odkaž, neopakuj.>

## Kontext v kódu a v technické dokumentaci

<Odkud pochází evidence pro tuto stránku. Uveď primární zdroje (kód) a
sekundární zdroje (již vygenerované stránky v `technical/`, pokud jsou
k dispozici) s konkrétními cestami.>

- Kód: `<path/to/file>` nebo `<path/to/file:LL>`
- Technická dokumentace: `technical/<group>/<page>.md` (pokud existuje)

## Hlavní fakta

<Tabulka nebo odrážkový seznam klíčových faktů. Každý řádek má svůj
zdroj. Tento blok je "TL;DR" stránky.>

| Fakt     | Hodnota     | Zdroj                         |
| -------- | ----------- | ----------------------------- |
| <Fakt 1> | <Hodnota 1> | `<path/to/file:LL>`           |
| <Fakt 2> | <Hodnota 2> | `technical/<page>.md` (sekce) |

## Diagram

<!-- diagram-anchor: <slug> -->

> Diagramy jsou generované samostatným skillem `docs-diagrams-from-code`
> po potvrzení textového obsahu. Tato kotva označuje místo, kam bude
> diagram vložen. Pokud žádný diagram na stránku nepatří, tuto sekci
> odstraň.

## Příklad

<Alespoň jeden konkrétní příklad: reálný scénář, reálný výstup,
reálná chybová hláška, reálná obrazovka. Žádné abstraktní popisy bez
příkladu. VŽDY vychází z kódu nebo technické dokumentace.>

```text
<ukázkový výstup / záznam / payload / stav UI>
```

Zdroj příkladu: `<path/to/file:LL>`.

## Poznámky

<Volitelné: edge cases, známé limity, výjimky, business kontext,
plánované změny s odkazem na issue nebo ADR.>

> ⚠️ TODO: <popis konkrétní mezery, pokud nějaká zůstala, např.
> "chybí popis retention pro tato data v kódu i v technické sekci">

## Odkazy

- Související stránky: `functional/<page>.md`, `functional/<page>.md`
- Technická dokumentace: `technical/<page>.md`
- Externí: <URL, pouze pokud stabilní>
