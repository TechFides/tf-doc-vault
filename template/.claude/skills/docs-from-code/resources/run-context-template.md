# Run context template

The orchestrator builds this payload in Step 1 (Preflight) and passes
it to every phase skill it invokes in Step 2 (Phase dispatch).

## Fields

| Field          | Type   | Source                  | Notes                                                           |
| -------------- | ------ | ----------------------- | --------------------------------------------------------------- |
| source_path    | string | user                    | absolute or project-relative                                    |
| version_folder | string | user                    | e.g. `docs/v1/`                                                 |
| scope          | string | `$ARGUMENTS` or user    | `technical` / `functional` / `diagrams` / `wireframes` / `full` |
| source_version | string | git tag → package.json  | `⚠️ TODO: source version` if neither                            |
| current_date   | string | system `currentDate`    | `YYYY-MM-DD`                                                    |
| auto_mode      | bool   | argument + user opt-in  | default `false`                                                 |
| screenshots    | list   | user (wireframes scope) | `[{ anchor_id, path }, …]` or `[]`                              |
| anchors_report | object | previous phase or scan  | diagrams / wireframes only                                      |

## Canonical shape (YAML)

```yaml
source_path: ./my-app
version_folder: docs/v1/
scope: full
source_version: v1.4.2
current_date: 2026-04-23
auto_mode: false
screenshots: []
anchors_report:
  diagrams: [] # filled by technical + functional phases
  wireframes: [] # filled by functional phase
```

## Lifecycle

- Built in **Preflight** (Step 1).
- Handed to every phase skill in **Phase dispatch** (Step 2).
- `anchors_report` is accumulated across phases: technical + functional
  append new anchors; diagrams + wireframes consume them.
- Not persisted across runs — each `/docs-generate-from-code` invocation
  rebuilds it from scratch.

## Rules

- **NEVER** start a phase with a missing required field. If a field is
  not available, mark `⚠️ TODO: <field name>` in the context and show
  it to the user before proceeding.
- `screenshots` is only relevant when `scope` includes `wireframes` —
  but the screenshots question is still asked live, not read from a
  file.
- `auto_mode` must match BOTH the command argument AND the opt-in rule
  from §3 of `CLAUDE.md`.
