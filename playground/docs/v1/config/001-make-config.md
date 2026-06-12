---
title: makeConfig()
status: published
updated_at: 2026-05-22
---

The factory function exported from `@techfides/tf-doc-vault/config`.
It accepts a single options object and returns a fully-configured
VitePress `UserConfig` wrapped in `withMermaid()`.

## Minimal usage

```ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "my_project",
});
```

## Common options

| Option      | Type                  | Notes                                 |
| ----------- | --------------------- | ------------------------------------- |
| `configDir` | `string` (required)   | `import.meta.dirname` of `config.ts`  |
| `project`   | `string`              | Shortname for diagnostics             |
| `strings`   | `Partial<Strings>`    | Override title, description, lang …   |
| `analytics` | `UmamiAnalytics`      | Umami tracker config                  |
| `editLink`  | `EditLink`            | GitLab / GitHub edit URL pattern      |
| `mermaid`   | `boolean`             | Default `true`; `false` skips wrapper |
| `override`  | `Partial<UserConfig>` | Escape hatch for advanced cases       |
