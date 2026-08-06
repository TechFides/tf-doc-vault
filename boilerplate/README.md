# __PROJECT__ documentation portal

Documentation for the **__PROJECT__** project, generated with VitePress + the shared [`@techfides/tf-doc-vault`](https://github.com/techfides/tf-doc-vault) tooling.

## Locally

```bash
pnpm install
pnpm docs:dev          # http://localhost:5173
```

## Useful commands

```bash
pnpm docs:build        # production build
pnpm docs:validate     # frontmatter, broken links, lint
pnpm docs:normalize    # canonical frontmatter ordering
pnpm docs:pdf          # export to artifacts/docs-full.pdf
pnpm fix               # LF, normalize, format, lint --fix, typecheck, validate
pnpm sync              # diff the Vercel/CI/config files against the @techfides/tf-doc-vault boilerplate
pnpm sync:apply        # overwrite drifted files from the boilerplate
```

## Deployment

GitHub Actions runs typecheck/lint/format/docs validation on every PR and push
to `main`; Vercel's own git integration builds and deploys, no deploy step in
CI. A push to a feature branch gets a Vercel preview URL; merging to `main`
deploys production. Branch protection on `main` should require the `result`
check and forbid direct pushes.

### First deployment

Unlike GitLab, GitHub has no push-to-create: create the repository first (web UI or `gh repo create TechFides/__PROJECT__ --private`), then add the remote and push:

```bash
git remote add origin git@github.com:TechFides/__PROJECT__.git
git push -u origin main
```

> CI installs with `--frozen-lockfile`, so the repo must contain a committed `pnpm-lock.yaml`. Scaffolding generated it and added it to the first commit automatically; if it is missing from `git status`, or you changed dependencies, generate and commit it before pushing: `pnpm install && git add pnpm-lock.yaml && git commit`.

Then, in the Vercel dashboard:

```
1. New Project → import this repository.
2. Root Directory = this folder (only matters when it lives inside a
   larger repo; leave the default for a standalone repo).
3. Framework preset: vitepress (vercel.json already pins the build
   command and output directory explicitly).
4. Project → Settings → Environment Variables: set BASIC_AUTH_USER and
   BASIC_AUTH_PASS to require a password on every path (see
   middleware.ts); leave both unset to keep the site public.
5. Project → Settings → Git → Deploy Hooks: nothing to do, the git
   integration deploys on every push automatically.
```

The next push (or the first import) then builds and deploys.

## `docs/` structure

```
docs/
  v1/                                ← version
    byznys-specifikace/
      index.md                       ← section intro
      <page>.md
    funkcni-specifikace/
    technicka-specifikace/
```

Every `.md` must have frontmatter:

```markdown
---
title: Title
status: published | draft | review | archived
updated_at: 2026-04-27
---
```
