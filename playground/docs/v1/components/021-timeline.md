---
title: Timeline
status: published
updated_at: 2026-08-13
order: 22
---

A dated sequence: how something got here, newest first. Two components, because each entry
carries its own date, title and sentence, and one prop holding all of that would be a wall of
JSON in the middle of a page.

<Timeline>
<TimelineItem date="Dnes" title="40+ profesionálů, 70+ projektů">
Google Cloud Partner pro cloud a moderní infrastrukturu, obrat 103 mil. Kč za rok 2025.
</TimelineItem>
<TimelineItem date="2024" title="Člen Digital Boost Group">
Připojení ke skupině otevírá klientům další příležitosti a kapacity.
</TimelineItem>
<TimelineItem date="2020–2023" title="Deloitte Technology Fast 50 CZ">
Laureát žebříčku nejrychleji rostoucích technologických firem v ČR čtyři roky v řadě.
</TimelineItem>
<TimelineItem date="2014" title="Založení TechFides Solutions s.r.o.">
Vzniká software house se sídlem v Brně, specializovaný na vývoj webových a mobilních aplikací.
</TimelineItem>
<TimelineItem date="2012" title="Začátek společné cesty">
Jádro týmu jde stejným směrem už od ledna 2012.
</TimelineItem>
</Timeline>

Every part of an entry is optional. A date on its own is a marker, a title on its own is a
step, and the sentence can carry a link or `code` like any other text.

## Props

`TimelineItem` takes:

| Prop    | Default | Effect                                                      |
| ------- | ------- | ----------------------------------------------------------- |
| `date`  | —       | A year, a range, or a word such as `Dnes`. Omit to drop it. |
| `title` | —       | What happened. Omit to drop the row.                        |

`Timeline` takes nothing. It is the `ol` the items live in.

## Slots

| Slot                   | Holds                        |
| ---------------------- | ---------------------------- |
| `Timeline` default     | The `TimelineItem`s.         |
| `TimelineItem` default | The sentence under the head. |

## Usage

```md
<Timeline>
<TimelineItem date="Dnes" title="40+ profesionálů, 70+ projektů">
Google Cloud Partner pro cloud a moderní infrastrukturu.
</TimelineItem>
<TimelineItem date="2014" title="Založení TechFides Solutions s.r.o.">
Vzniká software house se sídlem v Brně.
</TimelineItem>
</Timeline>
```

To put Markdown in a sentence, leave blank lines around it, the same rule every other slot in
this theme follows. Without them the content is handed to Vue as plain text and a link stays
literal.

## Design

The date and the title share one line rather than sitting in two columns. The labels differ in
width, from `2014` to `2020–2023` to `Dnes`, and a column wide enough for the longest leaves a
ragged gutter beside the short ones. Inline, they read as one phrase: when, then what.

The rail is one gradient behind the whole list, bright where the present is and fading to
nothing by the bottom. That is the component's idea rather than decoration: the shape says
"newest first, and the past recedes" without a word doing it. A gradient has to run the length
of the thing it describes, which is why the rail belongs to the list and not to the entries.

For the same reason the newest entry is the only filled point, with the accent gradient and the
glow the theme uses elsewhere for a live thing. The older entries are hollow rings whose centre
is the page showing through, so they read as stations on the line rather than beads sitting on
top of it.

The date is set as a label, uppercase and tracked out, not as a second heading beside the
title. One line, two weights: when, then what.

`Timeline` renders an `ol`, because the entries are a sequence whose order carries meaning. The
list markers are suppressed, so the dots are the only numbering the reader sees, but the
structure is still a list to anything that reads the page rather than looking at it.
