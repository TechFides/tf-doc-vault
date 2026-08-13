<div align="center">

  <a href="https://techfides.cz">
    <img src="./assets/techfides.svg" alt="TechFides" width="120"/>
  </a>

  <h1>Free from TechFides ❤️</h1>

  <p><strong><em>Let's develop the future.</em></strong></p>

  <p>
    <a href="https://techfides.cz">techfides.cz</a> ·
    <a href="https://team.techfides.cz/">team.techfides.cz</a> ·
    <a href="https://techfides.eu">techfides.eu</a>
  </p>

</div>

<br/>

<div align="center">

  <h2><code>@techfides/tf-doc-vault</code></h2>

  <p>
    <strong>Shared VitePress tooling for technical and analytical documentation.</strong><br/>
    Spin up a fully-featured documentation site in under 5 minutes.
  </p>

  <p>
    <a href="https://www.npmjs.com/package/@techfides/tf-doc-vault"><img src="https://img.shields.io/npm/v/@techfides/tf-doc-vault.svg?style=flat-square&color=cb3837&label=npm" alt="npm"/></a>
    <a href="https://www.npmjs.com/package/@techfides/tf-doc-vault"><img src="https://img.shields.io/npm/dm/@techfides/tf-doc-vault.svg?style=flat-square&label=downloads" alt="downloads"/></a>
    <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@techfides/tf-doc-vault.svg?style=flat-square&color=green&label=license" alt="license"/></a>
    <a href="https://www.npmjs.com/package/@techfides/tf-doc-vault"><img src="https://img.shields.io/node/v/@techfides/tf-doc-vault.svg?style=flat-square&label=node" alt="node"/></a>
    <a href="https://github.com/TechFides/tf-doc-vault/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TechFides/tf-doc-vault/ci.yml?style=flat-square&label=CI" alt="CI"/></a>
  </p>

</div>

> [!WARNING]
> **Preview release (`0.x`).** This package is under active development. The public API (CLI commands, exported functions, template structure, and config shape) may change between minor versions until the `1.0.0` release. Pin an exact version in production (`"@techfides/tf-doc-vault": "0.1.5"`, not `"^0.1.5"`) and review the [CHANGELOG](./CHANGELOG.md) before upgrading.

---

## Why this package exists

Every documentation project needs a similar boilerplate: a VitePress configuration, a versioned sidebar, shared UI components, a CI workflow, and a deploy
target. Setting all of that up from scratch for each project takes long time and produces subtly divergent configurations that are hard to maintain.

`@techfides/tf-doc-vault` solves this once and shares the solution across all projects. The core idea is **factory functions over copied files**: consumer repos
call `makeConfig()` and `createTheme()`; the package owns the implementation, so updates propagate automatically.

## What the package includes

| Module                | Purpose                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **`config`**          | `makeConfig()`: complete VitePress config with locales, versioned nav, sidebar, i18n, Mermaid, optional analytics and edit links. |
| **`theme`**           | `createTheme()`: shared Vue 3 components: DocMeta, ImageLightbox, PrintLayout, VersionSwitcher, optional WidthToggle.             |
| **`sidebar`**         | Auto-generates nav and sidebar from the `docs/<version>/<section>/<group>/` directory structure, with no manual config.           |
| **`scripts`**         | CLI commands: validate, normalize, build print page, export to PDF, fix line endings, sync boilerplate.                           |
| **`configs`**         | Shared `eslint.config.js`, `prettier.json`, `tsconfig.base.json` for consumer repos to extend.                                    |
| **`infra/terraform`** | Reusable GCP module: Cloud Run + Artifact Registry + IAM.                                                                         |
| **`docker`**          | Multi-stage Dockerfile with `nginx` / `nginx-auth` runtime variants.                                                              |
| **`boilerplate`**     | The VitePress project scaffold shared by every template: config, theme wiring, GitHub Actions CI, Vercel config, auth middleware. |
| **`templates`**       | Markdown content sets (`ana-docs`, `tech-docs`, …), one folder per template, selected via `tf-doc-vault setup --template=<name>`. |

## Quick start

You don't wire this up by hand. Run the interactive wizard and pick a template:

```bash
pnpm dlx @techfides/tf-doc-vault@latest setup
```

It asks which template to use, then prompts for the fields that template needs. Non-interactively (CI, scripts), pass `--template` and the required flags and it never prompts:

- **Standalone analysis / spec site** (its own repo, deployed to Vercel via git integration):

  ```bash
  pnpm dlx @techfides/tf-doc-vault@latest setup my_analysis --template=ana-docs
  ```

  Full guide → [Analytical documentation](./docs/ana-docs.md)

- **Docs inside an existing service** (published by the service repo's own pipeline):

  ```bash
  pnpm dlx @techfides/tf-doc-vault@latest setup --template=tech-docs --service-id=TST --project=my-service
  ```

  Full guide → [Technical documentation](./docs/tech-docs.md)

- **Migrating from Confluence?** → [Import from Confluence](./docs/confluence-import.md)

Adding a template of your own means adding a folder under `templates/<name>/` with a `_template.md` manifest (target location, fields to prompt for, which boilerplate files to exclude): no code change, the wizard lists it automatically.

## Configuration

Scaffolding generates the VitePress wiring for you. To customize a site afterwards, edit the two factory calls it writes:

`docs/.vitepress/config.ts`

```ts
import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "lapa",
  // optional: analytics, editLink, branding, sectionNav, mermaid, toBeTags, …
  analytics: { provider: "umami", websiteId: "...", domain: "..." },
  editLink: { repo: "TechFides/tf-sales-private-offers", branch: "main" },
});
```

### TO-BE tags

Functional specifications often describe changes that are planned but not yet
deployed. Set `toBeTags` and the analyst marks those passages in Markdown instead
of hand-writing coloured `<span>` elements:

```ts
toBeTags: {
  jiraBaseUrl: "https://acme.atlassian.net/browse",
  ticketPattern: "FF[VP]-\\d+", // the default; any tracker key works
}
```

`ADD` renders the passage in `--brand-tobe-add`, `DEL` in `--brand-tobe-del` and
struck through. Both link the ticket number.

```markdown
Inline, including mid-sentence: {ADD FFV-9693}newly added wording{/ADD}.

::: add FFV-9693
Block form, for anything spanning more than one paragraph. Headings, lists and
tables inside keep working, so a whole new page can sit in one tag.
:::
```

A marker is recognised only when the ticket matches `ticketPattern`, so ordinary
braces (JSON, template placeholders) are never touched. A ticket that looks
misspelled logs a build warning and renders as plain text. An inline tag must open
and close within one paragraph; unpaired markers render literally rather than
colouring the rest of the page. Omit the option and no rules are registered.

`docs/.vitepress/theme/index.ts`

```ts
import { createTheme } from "@techfides/tf-doc-vault/theme";
import "./custom.css"; // overrides on top of base CSS

export default createTheme({ widthToggle: true });
```

> **Installing via a git URL?** Add `"pnpm": { "onlyBuiltDependencies": ["@techfides/tf-doc-vault"] }` to the consumer `package.json`, or pnpm 10 skips the `prepare` hook and `dist/` is never built. (The scaffolders already set this for you.)

To rebrand (colors, logo, fonts, footer) for a non-TechFides project, see [BRANDING.md](./BRANDING.md).

---

## Documentation

Task-focused guides live in **[`docs/`](./docs/README.md)**:

| Guide                                                        | What it covers                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Technical documentation (`tech-docs`)](./docs/tech-docs.md) | Docs living inside a service repo, scaffolded via `setup --template=tech-docs`; the service repo publishes them itself.                             |
| [Analytical documentation (`*_ana`)](./docs/ana-docs.md)     | Standalone analysis docs scaffolded via `setup --template=ana-docs`, deployed to Vercel, including the auth middleware and syncing the boilerplate. |
| [Import from Confluence](./docs/confluence-import.md)        | Migrate a Confluence space into Markdown (`import-confluence`).                                                                                     |
| [Editing &amp; publishing docs](./docs/updating-docs.md)     | The day-to-day edit → preview → validate → publish loop.                                                                                            |
| [Testing](./docs/TESTING.md)                                 | How the package itself is tested (unit + smoke).                                                                                                    |
| [Migrations](./docs/MIGRATIONS.md)                           | Breaking-change guides for major package versions.                                                                                                  |

## Migrations

Breaking-change guides for major package versions are in **[docs/MIGRATIONS.md](./docs/MIGRATIONS.md)**.

## Contributing &amp; local development

Setup, the playground hot-reload workflow, the `file:`-consumer flow, and the release process are in **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
