# Scenario grouping (logical modules, not folders)

Scenarios in this project live **flat** under `functional/scenarios/`
(per the three-level depth rule in `proposed-structure.md`). Logical
grouping — by module, context, or axis — is expressed in **metadata**
and in how scenarios are **ordered and listed**, not by nested folders.

This document is the decision guide used in Step 1 when proposing
scenarios to the user.

## Decision flow

1. **Detect candidate modules in the code**
   - Workspace packages (`apps/*`, `packages/*`, `services/*`).
   - Top-level feature folders (`src/auth/`, `src/billing/`,
     `src/reporting/`).
   - Bounded-context folders in DDD layouts (`src/contexts/*`).
   - If the technical section is available, cross-check with
     `architecture/components.md` and `tech-stack.md` FE/BE split.

2. **Map controllers / resolvers / use-case handlers to modules**
   - A scenario is usually one entry point (controller action, route
     handler, GraphQL resolver, CLI command, scheduled job entry).
   - Tag each scenario candidate with the module it belongs to.

3. **Pick the grouping axis**
   - **Primary axis**: module / bounded context.
   - **Fallback axis** (when the module split is too coarse — one
     module has 40 scenarios, another has 2):
     - `admin` vs. `user` (actor-based).
     - `read` vs. `write` (read-only queries vs. mutations).
     - `internal` vs. `external` (in-cluster vs. partner / public API).
     - Project-specific — agreed with the user.

4. **Record the choice in the Step 1 plan**
   - Module list with count of scenarios per module.
   - Chosen axis and reasoning.
   - Scenario IDs and preferred ordering.

## How grouping is expressed (since no folders)

### Frontmatter on each scenario page

```yaml
---
title: 1.11.1 Přihlášení uživatele
status: draft
updated_at: 2026-04-23
module: auth
axis: user
---
```

- `module` — mandatory. The logical module the scenario belongs to.
- `axis` — optional. The fallback axis value when used (e.g. `admin`,
  `write`, `internal`).

### `scenarios-list.md` sections

The master list groups scenarios by module (H2 headings) and,
optionally, by axis (H3). The table inside each section links to the
individual scenario pages. The use-case diagram anchor (per module or
overall) sits here — see `proposed-structure.md`.

### `order` in scenario files

Scenario numbering `1.11.N` follows the order the user agrees in the
Step 1 plan. Within a module, scenarios are ordered by their
`sc-NN` stable identifier (sort by zero-padded number).

## Numbering reset rules

- Scenarios share one numbering space under `1.11` — the `N` in
  `1.11.N` **does not reset per module**. The stable SC-NN identifier
  is what ties a scenario to its module.
- Reordering module A's scenarios does not renumber module B's
  scenarios.

## When the code does not reveal modules

If no module split is detectable (single-module app, flat layout),
record `module: core` for every scenario and rely on the fallback axis
for visual grouping in `scenarios-list.md`. Flag this to the user in
the Step 1 plan so they can provide a module taxonomy if desired.

## Rules

- **NEVER** invent a module name — take it from the code (package,
  folder, service name) or from the technical section.
- **NEVER** create a scenario subfolder under `scenarios/`.
- **ALWAYS** list the grouping choice in the Step 1 plan and confirm
  with the user before writing scenario files.
- **ALWAYS** re-use the same module name the code uses (lowercase
  kebab) — do not translate to Czech in the `module` field. Czech
  labels belong in `title`, not in metadata.
