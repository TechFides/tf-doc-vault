# Contributing

This is an internal TechFides tooling package. External contributions are welcome but come with no support guarantees.

## Setup

```bash
pnpm install   # installs deps + runs prepare (builds dist/)
pnpm dev       # watch mode: tsc --watch + asset copy
```

## Workflow

- Use **pnpm** (enforced via corepack).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). `changelogen` derives the next version and changelog entries from these, so keep them well-formed.
- Run `pnpm typecheck && pnpm lint` before submitting a PR.
- Releases: see [Releasing](#releasing) below.

## Adding a template

A template is a folder under `templates/<name>/`: Markdown content plus a `_template.md` manifest (YAML frontmatter, never copied to a scaffold). The manifest declares the template's label, target location, which fields from the wizard's field catalog to prompt for, which `boilerplate/` files to exclude, and any post-scaffold steps (`git init`, pre-generating `pnpm-lock.yaml`, merging `docs:*` scripts into the host `package.json`, merging the pnpm settings into its `pnpm-workspace.yaml`, and so on). Adding a template never touches `src/**`: `tf-doc-vault setup` reads `templates/*/_template.md` at startup and lists whatever it finds. A wizard field with no existing entry in the field catalog (`FIELD_CATALOG` in `src/cli/scaffold.ts`) needs that catalog extended first.

A template that excludes `_pnpm-workspace.yaml` from the boilerplate has to set `host.pnpmWorkspace: true`, or the scaffolded site has no hoist patterns and its dev server serves a blank page. The values come from `boilerplate/_pnpm-workspace.yaml` at runtime, so that file is the only place they are written down.

A field the wizard should never ask about (a maintainer or local-development concern such as the dependency source) is marked `flagOnly` in the catalog and needs a `defaultValue`, because there is no dialogue to fall back to. Every other prompted field carries a one-line `hint`, or, for a select, a `hint` on each option.

**Field order is the catalog's, not the manifest's.** `fields:` is a set: the prompt order, the order in the summary, and which field counts as resolved before another all follow the order of `FIELD_CATALOG`. Reordering `fields:` changes nothing. Two fields can fill the same placeholder (`name` and `project` both fill `__PROJECT__`); the later one in the catalog wins, in the interpolated defaults and in the scaffolded files alike.

**`defaults:` may interpolate placeholders.** A `defaults:` value overrides the catalog default for that field, and a string value may contain the placeholders of any field resolved before it, so a template can pre-fill something derived from an earlier answer:

```yaml
fields: [service-id, project, repo]
defaults:
  repo: TechFides/__PROJECT_DASHED__ # `project` fills this, and resolves first
```

A placeholder that no earlier field fills is rejected when the manifest loads. The interpolated result then goes through the field's own validation, so a value that expands into something the field rejects (a `source` default expanding to `git-probe`, which is not `npm | git | file`) fails the run with `exit 1` instead of reaching the scaffold.

## Releasing

Releases are cut **locally** with `changelogen`, then a tag push triggers a publish workflow that requires manual approval. Anyone with write access can prepare a release, but a designated reviewer must approve before anything reaches npm.

### 1. Cut the release locally

```bash
git checkout master
git pull --ff-only
pnpm release         # = changelogen --release --no-github
```

`pnpm release` reads conventional commits since the last `v*` tag, computes the next version, writes it to `package.json`, prepends a section to `CHANGELOG.md`, and creates a commit + annotated tag (`chore(release): v0.x.y` / `v0.x.y`).

> **⚠️ Always pass `--no-github` (the `pnpm release` script already does).** Plain `changelogen --release` has an undocumented default that _also_ creates a GitHub release, and if you don't have a GitHub token in your env, it opens your browser at a pre-filled `releases/new` URL. Clicking "Publish" creates the remote `vX.Y.Z` tag at the _remote's default-branch HEAD_, not at your local release commit. That locks the tag to the wrong commit and a later `git push --follow-tags` will silently reject your correct local tag. **CI is the only thing that should create the GitHub release**, and it does so as the final workflow step (`changelogen gh release`), after the tag is already on the remote at the right commit.

> **Semver note for 0.x versions:** under `0.x.y`, `feat:` bumps the middle digit and `fix:` bumps the last. Standard semver kicks in at `1.0.0`.

To force a specific bump or version (remember to include `--no-github`):

```bash
pnpm changelogen --release --no-github --minor      # force minor bump
pnpm changelogen --release --no-github -r 0.2.0     # pin exact version
```

### 2. Write the migration notes into `CHANGELOG.md`

`changelogen` lifts commit subjects and nothing else, so a release with breaking
changes arrives in `CHANGELOG.md` as a handful of one-line entries with no
instructions. CI turns that same section into the GitHub release body, so
whatever is missing here is missing for every consumer.

Edit the section `pnpm release` just prepended: under the breaking changes, add a
short migration summary (what disappeared, what replaces it, the replacement
command) and a link to the matching section in `docs/MIGRATIONS.md`, for example
`[Migration to 0.3](https://github.com/TechFides/tf-doc-vault/blob/master/docs/MIGRATIONS.md#migration-to-03)`.
Absolute links, because the release body is rendered outside the repo.

The tag has to end up on the finished text, so fold the edit into the release
commit and move the tag with it:

```bash
git add CHANGELOG.md
git commit --amend --no-edit
git tag -f -a v0.3.0 -m v0.3.0   # same version changelogen just wrote
```

Skip this step only for a release whose changelog section is already
self-explanatory (a plain `fix:` patch).

### 3. Review and push

```bash
git show HEAD                # the chore(release) commit, sanity check
git tag --list 'v*' | tail -3
git tag --points-at HEAD     # the tag must sit on the amended commit
git push --follow-tags       # pushes the commit AND the tag
```

### 4. Approve the deployment

Pushing the `v*` tag starts the `Release & Publish` workflow, which **pauses on the `npm-publish` environment** waiting for a required reviewer.

- Open the run in the **Actions** tab.
- Click **Review deployments** → tick `npm-publish` → **Approve and deploy**.

Until you approve, nothing builds, publishes, or releases.

### 5. Verify

- **npmjs.com**: the new version page shows a **Provenance** badge linking to the workflow run.
- **GitHub Releases**: a new release exists, body matches the just-added `CHANGELOG.md` section.

### Recovery: CI failed after the tag was pushed

The tag and `chore(release)` commit are already on `master`. Nothing was published. Two options:

- **Fix forward** (recommended): make the fix, run `pnpm release` again; that cuts the next patch (the failed tag stays in history as a dead tag).
- **Clean up the dead tag** (optional, cosmetic): `git push --delete origin vX.Y.Z && git tag -d vX.Y.Z`.

### Security model

- **Tag push** requires write access to the repo.
- **`npm-publish` environment** requires manual approval from a named reviewer; a contributor with write access cannot publish on their own.
- **npm trusted publisher** is pinned to this repo, the `publish.yml` workflow, the `release` job, and the `npm-publish` environment. Any drift (e.g. someone edits the workflow to drop the environment) makes npm reject the publish, even if the workflow itself runs.
- No `NPM_TOKEN` exists in the repo; auth is via OIDC at publish time.

## Local development

There are two ways to iterate, depending on what you're changing.

### A. Playground with hot reload (recommended for theme/config work)

The package ships with `playground/docs/`, a minimal VitePress site that imports `makeConfig` and `createTheme` directly from `src/`, not from `dist/`. Editing any
`.vue` / `.css` / `.ts` under `src/theme/` or `src/config/` triggers Vite HMR in the browser instantly. No `pnpm build`, no syncing into a consumer.

```bash
pnpm install         # once after cloning
pnpm dev:docs        # → http://localhost:5173
```

Then edit, for example, `src/theme/components/DocMeta.vue` or one of the four
stylesheets in `src/theme/styles/`; the browser re-renders without restart. The
stylesheets are imported in cascade order by `src/theme/index.ts` and each has one
job: `tokens.css` defines tokens, `icons.css` carries the icon font, `backdrop.css`
draws the nebula and star field, `base.css` maps tokens onto VitePress and styles
Markdown, `patterns.css` holds the author-facing classes and must stay last so they
outrank the chrome.

Sample content lives under `playground/docs/v1/`. `showcase/001-elements` holds
every Markdown construct on one page, `showcase/002-patterns` every pattern class,
and `showcase/003-specification` a full-length document for judging vertical
rhythm; `tokens/` and `components/` cover the individual features.

Production build of the playground (useful for sanity-checking the eventual consumer build):

```bash
pnpm build:docs
pnpm preview:docs    # serves the built output
```

**How it works.** `playground/docs/.vitepress/config.ts` imports `makeConfig` from `../../../src/config/index.ts`. A Vite alias maps
`@techfides/tf-doc-vault/*` to local source paths, so internal imports inside the theme resolve the same way they would in a published consumer.

**Mermaid is disabled in the playground** via `makeConfig({ mermaid: false })` to avoid `vitepress-plugin-mermaid` optimizeDeps friction with pnpm-installed sub-deps
(dayjs, cytoscape, …). Diagrams render as plain code blocks. To test Mermaid specifically, use the consumer flow below.

### B. Against a real consumer (full integration)

For changes that touch sidebar/nav generation, multi-version flows, CLI scripts (`tf-doc-vault validate`, `print`, `export-pdf`, …), or anything that needs a fully
scaffolded project:

```bash
# 1. in the package, once after cloning
cd tf-doc-vault
pnpm install                  # deps + "prepare" hook builds dist/
pnpm dev                      # tsc --watch + auto-copy static assets (.vue/.css/.json/.ico)

# 2. in an adjacent application repo scaffolded with --source=file
cd ../<something>_ana
pnpm install                  # pulls peer deps and links file:../tf-doc-vault
pnpm docs:dev
```

An application repo scaffolded for local development declares the dependency via `file:`:

```json
"dependencies": { "@techfides/tf-doc-vault": "file:../tf-doc-vault" }
```

Prerequisite for `file:` install: both directories must be siblings (relative path `../tf-doc-vault`). If the package is elsewhere, `--file-path=/abs/path`
during scaffolding overrides it.

**Note.** pnpm `file:` dependencies are _copies_ from `dist/` into the consumer's pnpm store, not live symlinks. After each `tsc --watch` rebuild in the package,
refresh the consumer with `pnpm install --force` so it picks up the new `dist/`. Path A above sidesteps this entirely, which is why it's the default for theme work.

## Local pre-publish testing (tarball flow)

When validating the `tech-docs` use case end-to-end on a service like `srvc-bat`
**before** tagging a release, use `pnpm pack` so the consumer installs exactly
what `pnpm publish` would push to npmjs.com: no auth tokens, no registry
overrides, identical file layout.

The `*.tgz` produced by `pnpm pack` is gitignored at the repo root, so it can't
leak into a commit. The snippets below are maintainer-only; they never appear
in `boilerplate/` or `templates/` and therefore never propagate to consumer
repos via `tf-doc-vault setup`.

### 1. Build + pack in this repo

```bash
pnpm install
pnpm build               # tsc emits dist/
pnpm pack                # writes ./techfides-tf-doc-vault-0.1.0.tgz
cp techfides-tf-doc-vault-0.1.0.tgz ../srvc-bat/   # adjust path to your BAT clone
```

### 2. Install in the consumer service repo

```bash
cd ../srvc-bat
pnpm add file:./techfides-tf-doc-vault-0.1.0.tgz
```

`pnpm exec tf-doc-vault ...` works immediately. Re-packing in `tf-doc-vault`
and copying a fresh `.tgz` over the old one is enough, because pnpm picks up the new
content hash and reinstalls on the next `pnpm install`.

After v0.1.0 is published to npmjs.com, swap
`"@techfides/tf-doc-vault": "file:./techfides-tf-doc-vault-0.1.0.tgz"` to
`"^0.1.0"` (or the published version range) in the consumer's `package.json`
and delete the `.tgz`.

### Pre-commit checklist (must hold before merging this branch)

- `git status` shows no `*.tgz` (covered by `.gitignore`, but verify)
- `boilerplate/**` and `templates/**` contain zero references to `*.tgz` or `file:./`
- `pnpm pack --dry-run` lists exactly these top-level entries: `dist/`, `src/`,
  `boilerplate/`, `templates/`, `configs/`, `infra/`, `docker/`, `README.md`,
  `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `package.json`, and **no
  `specs/`**
