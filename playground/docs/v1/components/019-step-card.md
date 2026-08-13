---
title: StepCard
status: published
updated_at: 2026-08-13
---

One numbered point of a method, standing on its own: a label, a claim, the checks that back
it up, and the terms it introduces. Built to be used as a set, which is what makes the
numbers worth having.

<StepCard number="01" icon="🧰" title="Vstup a spec-driven development" lead="Kvalita výstupu se rovná kvalitě vstupu. Kvalitní zadání je nejlevnější a nejúčinnější zásah do celého AI vývoje.">

- **Zhodnocení kompletnosti zadání**: ještě před vývojem.
- **Strukturované zadání**: cíl, constraints, očekávaný výsledek a čeho se vyvarovat.
- **Kontext mimo repozitář**: pokud je pro úkol potřeba.
- **Spec vždy**: záznam rozhodnutí (decision log), analýza současného kódu, technický návrh a rozpad na úlohy.
- **Pokyn „doptej se"**: nejúčinnější opatření; zapsané v instrukcích pro agenta, platí automaticky pro každý úkol.

<template #tags>
<span class="tf-chip">spec</span>
<span class="tf-chip">decision log</span>
<span class="tf-chip">instrukce pro agenta</span>
<span class="tf-chip">slash command</span>
</template>

</StepCard>

<StepCard number="02" icon="🗂️" title="Kontext pro agenta a výběr modelu" lead="Agent je tak dobrý, jak dobrý má kontext. Když je know-how zapsané v repozitáři, neopouští firmu s lidmi.">

- **Instrukce pro agenta v koreni repozitáře**: stack, build/test, konvence, rizika.
- **Vnořené instrukce**: u velkých repozitářů dostane agent kontext přesně té části, kde pracuje.
- **Model podle náročnosti úlohy**: silný na přemýšlení, rychlý na rutinu.

<template #tags>
<span class="tf-chip">instrukce pro agenta</span>
<span class="tf-chip">skills</span>
<span class="tf-chip tf-chip--accent">Opus</span>
</template>

</StepCard>

Every part except the list is optional. Drop the tags and shorten the list and the same card
carries a single criterion:

<StepCard number="01" icon="📊" title="Kvantitativní" lead="Jak běžnou součástí každodenní práce AI je.">

- **Frekvence a rozsah**: jak často a v jakém záběru se AI reálně používá.
- **Použité nástroje**: od našeptávače po cloudového autonomního agenta.
- **Oblasti použití**: včetně agentic use-casů.

</StepCard>

## Props

| Prop     | Default | Effect                                            |
| -------- | ------- | ------------------------------------------------- |
| `number` | —       | The label in the corner. Omit to drop the column. |
| `icon`   | —       | Emoji or glyph before the title. Omit to drop it. |
| `title`  | —       | The card's heading. Omit to drop the row.         |
| `lead`   | —       | One muted sentence under it. Omit to drop it.     |

## Slots

| Slot    | Holds                                                              |
| ------- | ------------------------------------------------------------------ |
| default | The points, as a plain Markdown list. Leave blank lines around it. |
| `tags`  | The chips at the foot. Use `tf-chip` and `tf-chip--accent`.        |

## Usage

```md
<StepCard number="01" icon="🧰" title="Vstup a spec-driven development" lead="Kvalita výstupu se rovná kvalitě vstupu.">

- **Strukturované zadání**: cíl, constraints, očekávaný výsledek.
- **Spec vždy**: záznam rozhodnutí, technický návrh, rozpad na úlohy.

<template #tags>
<span class="tf-chip">spec</span>
</template>

</StepCard>
```

Keep the opening tag on one line, however long it gets. Prettier reflows a tag split across
lines and leaves a blank line before the `>`, which ends the HTML block early and fails the
page build.

## Design

Write the points as a plain list, `- item`, not as a task list. The component turns each item
into a check row itself, because these are settled points rather than boxes to tick, and a
page full of real checkboxes invites a reader to click them. The check is masked from the same
`--tf-check-mask` the theme's own checked box uses, so the two match.

Open each point with a bold term. The term takes the page's text colour and the explanation
after it stays muted, which is what makes a long list scannable; without the bold the rows
turn into a wall.

The number is in the accessibility tree rather than hidden, because it is information: a
screen reader reads "01" and then the title, which is the order the eye takes. It is set in
the accent at 35%, loud enough to index the card and quiet enough to stay behind the title.

Below 560px the number moves above the title and drops a size, since the two side by side
leave the text about half the width it needs.
