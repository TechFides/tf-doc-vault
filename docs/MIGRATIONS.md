# Migrations

Breaking-change guides for major package versions. Each is self-contained; skip straight to the version you are upgrading past.

## Migration to 0.3

Version 0.3.0 removes the Express/NestJS tech-docs mount and replaces `create-ana` and `init-tech-docs` with a single interactive `setup` wizard. This is a breaking change, but it is **not forced**: scaffolded repos pin an exact version, and a service repo that keeps its docs inside itself typically depends on `@techfides/tf-doc-vault` with a caret range, which under `0.x` semver rules does not include `0.3.0`. Nothing pulls an existing repo onto `0.3.0` automatically; `0.2.x` keeps working until someone raises the pinned version by hand. Plan and communicate the transition outside the package; the build only breaks once someone does that.

**`setupTechDocs()` and `createTechDocsHandler()` are gone.** Remove the `@techfides/tf-doc-vault/setup/express` or `/setup/nest` import and the call from `main.ts`, stop setting `TECH_DOCS_PASSWORD`, and drop the docs-build Dockerfile stage.

**Documentation inside a service repo has no deploy story in this package.** The scaffold writes the Markdown sources and the VitePress setup, merges the `docs:*` scripts plus the documentation dependencies into the host `package.json`, and merges the pnpm settings the site needs (Mermaid's hoist patterns, `allowBuilds`) into the host `pnpm-workspace.yaml`; after `pnpm install`, `docs:build` produces a static site in `tech-docs/docs/.vitepress/dist`. Publishing that output is the host repo's own pipeline. The base path baked into the build is `/tech-docs/` by default and configurable with `--base`, so it can match wherever the host serves the site from. To deploy documentation as a standalone portal with its own image, pipeline and Terraform, use the `ana-docs` template instead.

**CLI:** the `create-ana` bin and the `create`/`init-tech-docs` subcommands are gone. Replace them:

- `create-ana <name> --gcp-project=X --server=Y --source=Z [--no-git]` → `tf-doc-vault setup <name> --template=ana-docs --gcp-project=X --server=Y --source=Z [--no-git]`
- `tf-doc-vault init-tech-docs --service-id=ID --project=P --repo=R` → `tf-doc-vault setup --template=tech-docs --service-id=ID --project=P --repo=R`

Without a TTY, `setup` never prompts: pass every required flag or it exits with an error listing what is missing. CI scripts that called `create-ana` or `init-tech-docs` need to switch to the flag form above; the `pnpm dlx @techfides/tf-doc-vault@latest create ...` command documented previously no longer works once `0.3.0` is published under `@latest`.

**Subpath exports:** `./template` and `./template-tech-docs` are replaced by the wildcard exports `./boilerplate/*` and `./templates/*`. The old bare-directory exports never resolved anything, so nothing that worked before stops working.

**`peerDependencies` no longer list `express` or `@nestjs/common`.**

**Existing scaffolded repos keep working.** The scaffold is one-shot: a generated repo's `.gitlab-ci.yml` calls only subcommands that still exist (`docs:validate`, `docs:print`, `docs:build`), and `tf-doc-vault sync` is a manual script, not a CI job. After the upgrade, `sync` compares against `boilerplate/` with the same tracked file set, except a missing counterpart is now reported as an error instead of silently marked "ok".

**New scaffolds no longer copy `.claude/settings.local.json`.**

**Adding a template needs no code change:** drop a folder under `templates/<name>/` with a `_template.md` manifest and Markdown content; `tf-doc-vault setup` lists it automatically.

## Migration to 0.4

Version 0.4.0 removes the GitLab/GCP deploy stack from `boilerplate/` (`.gitlab-ci.yml`, `Dockerfile`, `docker/`, `infra/`) and replaces it with GitHub
Actions + Vercel: a generic `.github/workflows/ci.yml`, `vercel.json`, and a Basic-auth `middleware.ts` that runs on Vercel's edge. This is a breaking change
to the `ana-docs` template's wizard fields, but **existing scaffolded repos are untouched**: the scaffold is one-shot, nothing rewrites a repo's already-generated
files. A repo keeps its `.gitlab-ci.yml`/`Dockerfile`/`infra/` until someone rescaffolds it or runs `tf-doc-vault sync --apply` against the new boilerplate.

**Wizard fields removed:** `--gcp-project` and `--server` are gone (no Docker image, no GCP project to configure). **Added:** `--repo-subdir` (edit-link
subfolder prefix, auto-detected inside a monorepo) and `--analytics` (adds `@vercel/analytics`, off by default and traceless when off).

**Git detection.** Scaffolding an `ana-docs` folder that already sits inside a git repository (the "one folder per offer" monorepo pattern) now
auto-detects that: `git init` is skipped, and `--repo`/`--repo-subdir` default to the repo's own `origin` remote and the folder's path within it, instead of
the manifest's static default. `--no-git` still works as an explicit override.

**`makeConfig`'s `editLink.host` default changes from `https://gitlab.com` to `https://github.com`.** A GitLab consumer relying on the old default must now
pass `host: "https://gitlab.com"` explicitly. `EditLink` also gains an optional `path` field: a subfolder prefix for a docs site that lives inside a monorepo
rather than at its repo's root.

**`sync`'s tracked file set changes:** `Dockerfile`, `docker/nginx*.conf` and `infra/*.tf` are dropped; `vercel.json`, `middleware.ts` and
`.github/workflows/ci.yml` are added.

## Migration to 0.5

Version 0.5.0 rebuilds the theme on a three-layer token system and adds a page backdrop, a set of author-facing pattern classes and seven components.
Consumer sites change appearance substantially, but the override surface does not: **no `--brand-*` token is renamed, removed or added**, so an existing
`docs/.vitepress/theme/custom.css` keeps working untouched. As with every `0.x` release nothing pulls a repo onto `0.5.0` on its own, since a caret range
under `0.x` does not cross a minor bump.

**What the redesign changes.** The dark palette moves to near-neutral darks, so the blue accent sits against a ground that is not competing with it. The
enforced square corners are replaced by a `6/8/12/16/pill` radius scale. State colours are set per mode instead of shared, each calibrated against the worst
ground it actually lands on. Light mode is no longer an inversion of dark: it uses opaque panels above a tinted page plus a shadow, and pulls that tint from
`--brand-navy` so borders and text stay one family with the blue rather than drifting to neutral grey.

**Two things need revisiting.** A site that overrode `--vp-*` variables directly rather than `--brand-*` is now fighting the mapping layer, because the theme
derives `--vp-*` from the tokens above it; move those overrides onto the `--brand-*` names. A site that restyled the sidebar marker `::before` rules also needs
a look, because the markers are a background image now rather than emoji `content`.

**Default values moved even though the names did not.** `--brand-bg-page` goes from `#ffffff` to `#f7f9fc`, so panels can be white above a tinted page instead
of white on white. `--brand-text-default` becomes `#16202e` and `--brand-text-muted` becomes `#5a6678`, which takes the muted meta lines from 3.2:1 to 5.2:1
and over the AA line they had been under. The border tokens become `rgba` tints of the navy instead of flat greys. The `DocMeta` badge tokens are now a
`color-mix` of the state colours rather than hardcoded light/dark pairs, so overriding `--brand-success` moves the published pill in both modes at once.

**A `--tf-*` layer sits between `--brand-*` and `--vp-*`.** Brand inputs go in, the design system is derived from them (panels, lines, type scale, radii,
motion), and `--vp-*` is mapped from both. Override `--brand-*`; reach into `--tf-*` only for a single token at a time, and leave `--vp-*` alone. The layers and
every token in them are documented in [BRANDING.md](../BRANDING.md).

**Fonts change.** `branding.fonts: "google"` now injects Inter, IBM Plex Sans, IBM Plex Mono and Noto Color Emoji instead of Open Sans and Noto Color Emoji.
A site on `fonts: "none"` that self-hosts Open Sans keeps rendering, but the faces it hosts no longer match the stack the theme asks for: either host the new
families, or point `--tf-font-display`, `--tf-font-body` and `--tf-font-mono` at what you do host.

**The page backdrop mounts by default.** `PageBackdrop` paints a nebula, and in dark mode a static star field, at `z-index: -1` behind the whole site. It works
only while the layout above it stays transparent: the page colour goes on `html`, and `body` plus the VitePress containers are pinned transparent. **A
`background` on `body` in a consumer's `custom.css` buries it**, and the result looks exactly like the component failing to mount. Turn it off with
`createTheme({ backdrop: false })`, the one new option on that factory, or tune it with `--tf-nebula-opacity` and `--tf-stars-opacity`.

**Seven components are registered globally:** `AuthorCard`, `FeatureCard`, `ReferenceCard`, `Spotlight`, `StepCard`, `Timeline` and `TimelineItem`. A consumer
theme that registers its own component under one of those names now collides, and which one survives depends on whether its `enhanceApp` runs before or after
the theme's. Rename yours rather than relying on that order.

**Pattern classes ship for Markdown authors.** `patterns.css` adds classes a page can use without a component or an inline style (`tf-cards`, `tf-card`,
`tf-stat`, `tf-tile`, `tf-chip`, `tf-step`, `tf-checks`, `tf-btn`, `tf-rows`, `tf-divider`, `tf-logos`), plus the `data-tf-edge` and `data-tf-reveal`
attributes. All of it is additive and nothing existing changes.

## Migration to 0.5.2

Version 0.5.2 makes `order` in frontmatter the real sort key for the sidebar, the top nav and the print page, instead of a value only `title` extraction bothered to read. The field also becomes required, so the break lands on `docs:validate` rather than on the rendered site.

**The sidebar and the nav render identically for a repo that has no `order` field anywhere**, because a folder with nothing ordered still falls back to today's alphabetical order. **The print page is the exception.** The same release fixes the print collector, which stopped two directory levels down and silently dropped anything below that, so `print.md` and the PDF built from it can gain pages that were missing before: this repo's own playground goes from 36 pages to 39. A nested group heading in the print page also changes, from the directory name to the group's title, and the table of contents becomes a nested list that mirrors the sidebar tree instead of a flat run of bold headings.

**`docs:validate` starts failing until you normalize.** A missing `order`, a non-integer value, or two siblings claiming the same one are now lint errors, and a repo scaffolded before this change has no `order` field at all, so the first `docs:validate` after upgrading fails outright. Fix it in place, without touching what the site renders:

```bash
pnpm docs:normalize && pnpm docs:validate
```

`docs:normalize` fills in `order` for every page and folder that lacks it, walking each folder in its current alphabetical order so the assigned numbers preserve the position already on screen. It never overwrites a page that already carries a valid `order`.

**A directory with no `index.md` is now a `docs:validate` error, even though the sidebar keeps rendering it fine as an unlinked group label.** There is nowhere for such a directory to carry its own `order`, so lint refuses to leave it in the alphabetical tail forever, and `docs:normalize` cannot fix it for you either: reaching a directory or a `.md` file it cannot write `order` into (no `index.md`, or a file with no frontmatter block at all) makes it stop numbering the rest of that folder's alphabetical tail, rather than number around the problem and shift that item in the render. So on a tree with either case, the upgrade recipe becomes a loop, not one shot: run `docs:normalize`, run `docs:validate`, fix whatever it reports (add the missing `index.md` with a `title` and `order`, or add the missing frontmatter block), and repeat both commands until `docs:validate` is clean.

**Numeric filename prefixes keep working.** A page named `001-intro.md` still resolves fine: `order` in frontmatter wins over the filename, so the prefix becomes redundant rather than wrong. Dropping the prefixes is optional and manual; renaming the file changes its URL, so track down and fix every link to it yourself, internal or external. There is no tool for that part.

## Migration to 0.5.4

Version 0.5.4 fixes three defects in the print page and the PDF built from it. Nothing to run: the changes take effect on the next `docs:print` / `docs:pdf`.

**Quoted frontmatter values stop rendering with their quotes.** The frontmatter reader treated a value as plain text, so a `title` that YAML requires to be quoted (one holding a colon, above all) reached the sidebar, the top nav and the print page as `"S1: cache a škálování"`. Those titles now render without the quotes, which means **the visible label of such a page changes** on the site as well as in the PDF. Single and double quoting are both understood, along with their escapes; a value that merely begins and ends with a quote (`"a" or "b"`) is left alone. `docs:validate` gets stricter in the same move: `status: "draft"` and `order: "3"` used to fail as an invalid status and a non-integer order, and now read as what they are.

**Repeated heading ids no longer break the build.** A `{#id}` is unique per page, but the print page is one document assembled out of all of them, and VitePress aborts the whole build on the second copy of an id it sees. A site where two pages both carry `## Chybové stavy {#chybove-stavy}` could not produce a PDF at all. Heading ids in `print.md` are now qualified with the page slug (`{#v2-scenarios-sc-11-chybove-stavy}`), and same-page links move with them. Anchors are capped at the 127 bytes a PDF name token allows, falling back to a hashed page prefix when the readable form would overflow. **Only `print.md` is rewritten**, so the anchors on the site itself are untouched and links shared into a page keep working.

**The PDF waits for Mermaid.** `export-pdf` printed as soon as the page reached `networkidle` with its fonts loaded, while Mermaid renders in the browser after that point and takes tens of seconds on a large site. Every diagram that had not finished was printed as Mermaid's "Syntax error in text" placeholder, on a 147-diagram site all of them. The exporter now waits for every diagram to carry an SVG and report no error, up to three minutes.

**`export-pdf` can now exit 1.** If a diagram never renders, because its source genuinely does not parse, the export writes the PDF (look at it to find the diagram) and exits non-zero, which also stops the `pdf` chain before its second pass. Two Mermaid traps account for most of these: a `;` in sequence-diagram text is a statement separator, and a bare `{` in a flowchart node label opens a rhombus. Write `#59;` for a literal semicolon, and quote a label containing braces.
