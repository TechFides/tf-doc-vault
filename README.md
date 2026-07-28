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

Every documentation project needs a similar boilerplate: a VitePress configuration, a versioned sidebar, shared UI components, a CI/CD pipeline, Docker images,
and Terraform infrastructure. Setting all of that up from scratch for each project takes long time and produces subtly divergent configurations that are hard to
maintain.

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
| **`boilerplate`**     | The VitePress project scaffold shared by every template: config, theme wiring, Docker, CI, Terraform.                             |
| **`templates`**       | Markdown content sets (`ana-docs`, `tech-docs`, …), one folder per template, selected via `tf-doc-vault setup --template=<name>`. |

## Quick start

You don't wire this up by hand. Run the interactive wizard and pick a template:

```bash
pnpm dlx @techfides/tf-doc-vault@latest setup
```

It asks which template to use, then prompts for the fields that template needs. Non-interactively (CI, scripts), pass `--template` and the required flags and it never prompts:

- **Standalone analysis / spec site** (its own repo, deployed to Cloud Run):

  ```bash
  pnpm dlx @techfides/tf-doc-vault@latest setup my_analysis --template=ana-docs --gcp-project=tfsa-my-analysis --server=nginx
  ```

  Full guide → [Analytical documentation](./docs/ana-docs.md)

- **Docs inside an existing service** (published by the service repo's own pipeline):

  ```bash
  pnpm exec tf-doc-vault setup --template=tech-docs --service-id=TST --project=my-service
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
  // optional: analytics, editLink, branding, sectionNav, mermaid, …
  analytics: { provider: "umami", websiteId: "...", domain: "..." },
  editLink: { repo: "techfides/tf-analysis/lapa_ana", branch: "master" },
});
```

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

| Guide                                                        | What it covers                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Technical documentation (`tech-docs`)](./docs/tech-docs.md) | Docs living inside a service repo, scaffolded via `setup --template=tech-docs`; the service repo publishes them itself.                         |
| [Analytical documentation (`*_ana`)](./docs/ana-docs.md)     | Standalone analysis docs scaffolded via `setup --template=ana-docs`, deployed to Cloud Run, including `nginx-auth` and syncing the boilerplate. |
| [Import from Confluence](./docs/confluence-import.md)        | Migrate a Confluence space into Markdown (`import-confluence`).                                                                                 |
| [Editing &amp; publishing docs](./docs/updating-docs.md)     | The day-to-day edit → preview → validate → publish loop.                                                                                        |
| [Testing](./docs/TESTING.md)                                 | How the package itself is tested (unit + smoke).                                                                                                |

## Migration to 0.3

Version 0.3.0 removes the Express/NestJS tech-docs mount and replaces `create-ana` and `init-tech-docs` with a single interactive `setup` wizard. This is a breaking change, but it is **not forced**: scaffolded repos pin an exact version, and a service repo that keeps its docs inside itself typically depends on `@techfides/tf-doc-vault` with a caret range, which under `0.x` semver rules does not include `0.3.0`. Nothing pulls an existing repo onto `0.3.0` automatically; `0.2.x` keeps working until someone raises the pinned version by hand. Plan and communicate the transition outside the package; the build only breaks once someone does that.

**`setupTechDocs()` and `createTechDocsHandler()` are gone.** Remove the `@techfides/tf-doc-vault/setup/express` or `/setup/nest` import and the call from `main.ts`, stop setting `TECH_DOCS_PASSWORD`, and drop the docs-build Dockerfile stage.

**Documentation inside a service repo has no deploy story in this package.** The scaffold writes the Markdown sources and the VitePress setup, and merges the `docs:*` scripts into the host `package.json`; `docs:build` then produces a static site in `tech-docs/docs/.vitepress/dist`. Publishing that output is the host repo's own pipeline. The base path baked into the build is `/tech-docs/` by default and configurable with `--base`, so it can match wherever the host serves the site from. To deploy documentation as a standalone portal with its own image, pipeline and Terraform, use the `ana-docs` template instead.

**CLI:** the `create-ana` bin and the `create`/`init-tech-docs` subcommands are gone. Replace them:

- `create-ana <name> --gcp-project=X --server=Y --source=Z [--no-git]` → `tf-doc-vault setup <name> --template=ana-docs --gcp-project=X --server=Y --source=Z [--no-git]`
- `tf-doc-vault init-tech-docs --service-id=ID --project=P --repo=R` → `tf-doc-vault setup --template=tech-docs --service-id=ID --project=P --repo=R`

Without a TTY, `setup` never prompts: pass every required flag or it exits with an error listing what is missing. CI scripts that called `create-ana` or `init-tech-docs` need to switch to the flag form above; the `pnpm dlx @techfides/tf-doc-vault@latest create ...` command documented previously no longer works once `0.3.0` is published under `@latest`.

**Subpath exports:** `./template` and `./template-tech-docs` are replaced by the wildcard exports `./boilerplate/*` and `./templates/*`. The old bare-directory exports never resolved anything, so nothing that worked before stops working.

**`peerDependencies` no longer list `express` or `@nestjs/common`.**

**Existing scaffolded repos keep working.** The scaffold is one-shot: a generated repo's `.gitlab-ci.yml` calls only subcommands that still exist (`docs:validate`, `docs:print`, `docs:build`), and `tf-doc-vault sync` is a manual script, not a CI job. After the upgrade, `sync` compares against `boilerplate/` with the same tracked file set, except a missing counterpart is now reported as an error instead of silently marked "ok".

**New scaffolds no longer copy `.claude/settings.local.json`.**

**Adding a template needs no code change:** drop a folder under `templates/<name>/` with a `_template.md` manifest and Markdown content; `tf-doc-vault setup` lists it automatically.

## Contributing &amp; local development

Setup, the playground hot-reload workflow, the `file:`-consumer flow, and the release process are in **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
