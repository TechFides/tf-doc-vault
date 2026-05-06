---
title: <Czech title with numbering, e.g. 2.4.1 Komponentový diagram>
status: draft
updated_at: <YYYY-MM-DD>
---

<!--
confluence:
  space: CNG
  title: <Czech title with numbering>
  parent: <Czech title of parent>
-->

<!-- generated: <YYYY-MM-DD> | source: <vX.Y.Z> -->

# <Czech title with numbering>

## Přehled

<1–2 věty — o čem tato stránka je, proč je v technické dokumentaci.>

## Kontext v kódu

<Kde v repo se téma nachází (cesty, moduly). Každé tvrzení s citací
`path:line`.>

- `<path/to/file>` — <co se tam nachází>.
- `<path/to/file:N>` — <konkrétní definice>.

## Hlavní fakta

<Seznam konkrétních faktů odvozených z kódu. Každé s citací. Preferuj
tabulku, pokud je to seznam (např. konfigurace, hodnoty).>

| Atribut / volba | Hodnota   | Zdroj       |
| --------------- | --------- | ----------- |
| <název>         | <hodnota> | `path:line` |
| <název>         | <hodnota> | `path:line` |

## Diagram

<Volitelné — zařaď, pokud stránka popisuje strukturu, sekvenční tok,
stav nebo datový model. Anchor naplní diagramová fáze:>

<!-- diagram-anchor: <name> -->

<Krátký textový popis toho, co diagram znázorňuje — slouží i jako
fallback, kdyby se diagram nevykreslil.>

## Příklad

<Konkrétní příklad z kódu — snippet, request/response, config excerpt,
nebo reálný scénář. VŽDY aspoň jeden. §7 CLAUDE.md.>

```text
<code excerpt>
```

## Poznámky

<Volitelné. Výjimky, limity, známé problémy. Každé tvrzení s citací,
jinak TODO.>

> ⚠️ TODO: <co chybí, pokud něco chybí>

## Odkazy

- Související stránka: [<název>](<relative/path>.md)
- Externí zdroj (pokud relevantní a stabilní URL).
