---
title: Task lists
status: published
updated_at: 2026-06-10
---

# Task lists

GFM task lists rendered by the package's own markdown-it rule
(`src/config/taskLists.ts`, registered in `makeConfig`). The Confluence
importer emits these for ADF `taskList` nodes, including nesting and
struck-through items.

## Demo

- [x] GitHub
  - [x] Default branch develop
  - [x] Dependabot
    - [x] Repository configured in the check script
- [x] Jira–GitHub link
- [ ] Healthcheck
  - [x] EP via `@nestjs/terminus`
  - [ ] ~~DB and external services check~~
  - [ ] ~~Add the project to the metrics exporter~~
