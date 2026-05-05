# Functional scan checklist

Detection targets per aspect for Step 1 of `docs-functional-from-code`.
Each row says _what_ to look for in the codebase and — if present — in
the already-generated technical section, and _which proposed page_ the
evidence populates. Nothing here claims the artifact exists — if
nothing matches, the page is **marked for skipping** in the plan and
the user confirms.

This list is **inclusive, not exclusive** — it defines the minimum
scan surface. Always scan beyond it: if the code suggests a page not
listed (e.g. a project-specific report type, an onboarding flow, a
partner-facing integration), **propose** it to the user and add it to
the generation plan with cited evidence.

## Source hierarchy reminder

- **Code** is primary — source of truth for behavior.
- **`docs/<version>/technical/`** is secondary (only if already
  generated) — a faster, digested lookup. **ALWAYS** cross-check
  against code when a detail is behavior-critical.

When the technical section is not available in this run, rely on code
only; cross-links to technical pages become
`⚠️ TODO: link to technical/<expected-path>` (see `evidence-rules.md`).

## Scan targets

| Aspect                         | Populates page                 | Where to look (code, primary)                                                      | Where to look (technical, secondary)                                                                    |
| ------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Product purpose / audience     | `overview.md`                  | `README.md`, marketing copy in `about/`, `package.json` description                | `tech-stack.md` (FE/BE overview)                                                                        |
| Product modules / split        | `product-structure.md`         | workspace roots, `apps/*`, `packages/*`, top-level module folders                  | `tech-stack.md`, `architecture/components.md`                                                           |
| Domain vocabulary              | `glossary.md`                  | `src/domain/**`, entity / aggregate names, enum values, business constants         | `architecture/domain-model.md`                                                                          |
| Actors / roles (business)      | `actors.md`                    | role constants (`roles.ts`, `permissions.ts`), guards, `@Roles(...)` decorators    | `roles-matrix.md`                                                                                       |
| Personas                       | `personas.md`                  | user profile fields, segmentation logic, cohort config                             | —                                                                                                       |
| Screens / routes               | `screens.md`                   | route definitions, page components (`pages/**`, `app/**`, `routes.ts`)             | `architecture/components.md`                                                                            |
| Scenario list                  | `scenarios-list.md`            | controllers, resolvers, top-level use-case handlers, feature folders               | `integrations/overview.md`, `consumed-apis/*`                                                           |
| Business rules (cross-cutting) | `business-rules.md`            | rule engines, validators, `*.policy.ts`, guard clauses, business exceptions        | `integrations/error-codes.md`                                                                           |
| Notifications                  | `notifications.md`             | mail / SMS / push senders, template folders, notification service calls            | `integrations/events.md`, `integrations/overview.md`                                                    |
| Reports / analytics            | `reports.md`                   | report generators, scheduled exports, dashboard backends, analytics event emitters | `monitoring-logging.md`                                                                                 |
| Individual scenario            | `scenarios/sc-NN-<slug>.md`    | controller → service → repository chain, DTOs, validations, error branches         | `consumed-apis/*`, `exposed-*-apis/*`, `roles-matrix.md`, `feature-toggles.md`, `monitoring-logging.md` |
| Wireframes (screenshot-only)   | scenario page wireframe anchor | UI components involved in the scenario                                             | —                                                                                                       |

## How to use this checklist

1. For each row, check both sources (code primary, technical
   secondary) and record what you find.
2. Include the page in the Step 1 plan with evidence cited as
   `path` or `path:line` (prefer line where possible).
3. If neither source has evidence, mark the page as `skip — no
evidence` in the plan and confirm skipping with the user.
4. For aspects not in the rows above, propose a new page with a
   Czech label, suggested numbering, and the evidence you found.

## Rules

- **NEVER** assume evidence exists — verify by opening the file.
- **NEVER** copy a claim from the technical section without cross-
  checking the code when the claim is behavior-critical (validation
  rules, permissions, state transitions, error codes).
- **ALWAYS** prefer `path:line` over `path` for specific claims.
- **ALWAYS** mark `⚠️ TODO: [missing detail]` rather than inventing.
- **ALWAYS** record which source each claim came from — code or
  `technical/<page>` — to make later review traceable.
- This checklist is the **floor, not the ceiling** — new pages beyond
  it are expected and should be proposed with evidence.
