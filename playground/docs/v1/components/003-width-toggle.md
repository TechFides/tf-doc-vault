---
title: WidthToggle
status: published
updated_at: 2026-05-22
order: 3
---

Opt-in navbar button that cycles content width: **default → wide → max**.
Enabled via `createTheme({ widthToggle: true })`.

## States

| Class          | Content max-width   | Use case              |
| -------------- | ------------------- | --------------------- |
| _(default)_    | 826 px (with aside) | Reading-optimized     |
| `.layout-wide` | 1152 px             | Tables, code-heavy    |
| `.layout-max`  | 100 %               | Full-bleed dashboards |

Try clicking the toggle in the navbar (top right) to see it cycle.
