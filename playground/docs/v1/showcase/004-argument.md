---
title: An argument in sections
status: published
updated_at: 2026-08-13
---

A page that makes a case, section by section: a claim as the heading, a sentence saying what it
means, the checks that back it up, and a line pointing somewhere else. No component involved.
Every part is Markdown plus `tf-checks`, which is the point of this page.

The headings are the reason. These sections belong in the page outline, and VitePress builds
that from the Markdown itself, so a heading rendered inside a Vue component would be missing
from it. Look at "On this page" beside this text: every entry is one of the `##` headings below.

Mind the level. VitePress collects level 2 by default, so a section written as `###` renders
correctly and still never reaches the outline. Either keep the sections at `##`, as this page
does, or set `outline: deep` in the frontmatter.

## 🥇 Technologická špička

Tým, který drží krok s technologiemi, a má to na papíře.

<div class="tf-checks">

- 70 % realizačního týmu drží externí certifikace.
- Moderní stack: microservices, cloud, Kubernetes, IaC.
- Kontinuální vzdělávání a sdílení know-how v týmu.

</div>

Volíme nejvhodnější technologii. Více na [techfides.cz](https://techfides.cz).

## 📊 Řízená kvalita, kvalita jako proces, ne slib

Kvalita nevzniká slibem, ale nastaveným procesem, který ji průběžně hlídá.

<div class="tf-checks">

- Čistý kód a automatizace: lint, review, testy, CI/CD.
- Měření vývoje: Index vývoje a Developer Experience.
- [Projektový checklist](./002-patterns) pro pravidelnou kontrolu procesů, 77 položek ve čtyřech oblastech.

</div>

Jak kvalitu hlídáme, popisuje stránka [Zaručení kvality](./001-elements).

## 🔒 Nezávislost na lidech, bez vendor locku

Aby byl projekt dlouhodobě úspěšný, nesmí stát na jednom člověku.

<div class="tf-checks">

- Standardizovaná dokumentace jako markdown v Gitu.
- Čistý kód dle interních standardů (školení a test).
- Code review jako standardní součást workflow.

</div>

Projekt je kdykoli předatelný. Více v [Předání výstupů](./003-specification).

## 🤖 AI jako nástroj, ne cíl

AI zapojujeme systematicky do každé fáze vývoje, vždy s lidskou kontrolou výstupu.

<div class="tf-checks">

- AI pomáhá s kódem, testy, refaktoringem i legacy.
- Vždy podle desatera bezpečnosti pro ochranu dat.
- AI umíme zavést i přímo do vašich produktů.

</div>

Celý přístup popisuje stránka [AI First přístup](../components/019-step-card).

## What this is made of

| Part         | How                                                  |
| ------------ | ---------------------------------------------------- |
| Heading      | `## 🥇 Claim`, at level 2 so it reaches the outline. |
| Lead         | A plain paragraph.                                   |
| Checks       | `<div class="tf-checks">` around a plain list.       |
| Closing line | A plain paragraph with a link.                       |

The blank lines inside the `tf-checks` wrapper are load-bearing: without them the list is
handed to the page as raw HTML and never becomes a list.

## When to reach for a component instead

Use [StepCard](../components/019-step-card) when the sections are an enumerated set rather than
an argument: it panels each one, numbers it, and carries the terms it introduces as chips. Use
this shape when the sections are the document's own structure and belong in its outline.
