# Contributing

This is an internal TechFides tooling package. External contributions are welcome but come with no support guarantees.

## Setup

```bash
pnpm install   # installs deps + runs prepare (builds dist/)
pnpm dev       # watch mode: tsc --watch + asset copy
```

## Workflow

- Use **pnpm** (enforced via corepack).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run `pnpm typecheck && pnpm lint` before submitting a PR.
- Releases are tagged `vX.Y.Z` and trigger the npm publish GitHub Action automatically.

## Testing changes locally

```bash
# In this repo:
pnpm build

# In a consumer repo (scaffolded with --dev):
pnpm install   # picks up file: dependency
pnpm docs:dev  # verifies changes via VitePress dev server
```

## Local pre-publish testing (tarball flow)

When validating the `tech-docs` use case end-to-end on a service like `srvc-bat`
**before** tagging a release, use `pnpm pack` so the consumer installs exactly
what `pnpm publish` would push to npmjs.com — no auth tokens, no registry
overrides, identical file layout.

The `*.tgz` produced by `pnpm pack` is gitignored at the repo root, so it can't
leak into a commit. The snippets below are maintainer-only — they never appear
in `template-tech-docs/` and therefore never propagate to consumer repos via
`init-tech-docs`.

### 1. Build + pack in this repo

```bash
pnpm install
pnpm build               # tsc + unbuild emits dist/setup/{express,nest}.{mjs,cjs,d.ts}
pnpm pack                # writes ./techfides-tf-doc-vault-0.1.0.tgz
cp techfides-tf-doc-vault-0.1.0.tgz ../srvc-bat/   # adjust path to your BAT clone
```

### 2. Install in the consumer service repo

```bash
cd ../srvc-bat
pnpm add file:./techfides-tf-doc-vault-0.1.0.tgz
```

`pnpm exec tf-doc-vault ...` works immediately. Re-packing in `tf-doc-vault`
and copying a fresh `.tgz` over the old one is enough — pnpm picks up the new
content hash and reinstalls on the next `pnpm install`.

### 3. Pre-publish Dockerfile fragment

The post-publish fragment in [`template-tech-docs/docs-build-stage.md`](template-tech-docs/docs-build-stage.md)
assumes the package is on npmjs.com, so it does a vanilla `pnpm install`.
For pre-publish testing on a service like BAT, copy the tarball into the
build context and add **one extra line** to the docs-build stage:

```dockerfile
FROM node:24-alpine AS docs-build
RUN npm install -g pnpm@10
WORKDIR /usr/src/app

# Pre-publish only: copy the local tarball alongside lockfile + manifest.
COPY --chown=node:node techfides-tf-doc-vault-0.1.0.tgz pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --chown=node:node tech-docs ./tech-docs
RUN pnpm exec vitepress build tech-docs
```

After v0.1.0 is published to npmjs.com:

- swap `"@techfides/tf-doc-vault": "file:./techfides-tf-doc-vault-0.1.0.tgz"`
  to `"^0.1.0"` (or the published version range) in BAT's `package.json`,
- delete the `.tgz`,
- remove the `*.tgz` token from the Dockerfile `COPY` line.

The result is identical to the post-publish fragment in `docs-build-stage.md`,
so the swap is a clean four-token diff.

### Pre-commit checklist (must hold before merging this branch)

- `git status` shows no `*.tgz` (covered by `.gitignore`, but verify)
- `template-tech-docs/**/*` contains zero references to `*.tgz` or `file:./`
- `pnpm pack --dry-run` lists exactly: `dist/`, `bin/`, `src/`, `template/`,
  `template-tech-docs/`, `configs/`, `infra/`, `docker/`, `README.md`,
  `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `package.json` — and **nothing
  pre-publish-flavoured**

