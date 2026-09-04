[← All guides](./README.md)

# Analytical documentation (`*_ana` repos)

Standalone documentation repositories for business analysis, functional specs, and technical design: the `*_ana` pattern. Suited for projects where the
documentation has its own lifecycle and deployment, and needs to be accessible outside the application itself (e.g. for stakeholders or external reviewers).

Each repo gets a complete VitePress site with versioned content, a GitHub Actions workflow (typecheck → lint → format → validate → build), and deploy via
Vercel's git integration (a preview URL per branch, production on merge to `main`), with optional HTTP Basic auth via an edge middleware.

## How it works

1. `pnpm dlx` downloads the tooling from the npm registry and runs `tf-doc-vault setup --template=ana-docs`.
2. The scaffolder copies the `boilerplate/` VitePress project and the `ana-docs` template's Markdown to `./my_analysis/`, substituting placeholders (`__PROJECT__`, `__REPO__`, `__REPO_SUBDIR__`,
   `__VITEPRESS_COMMON_DEP__`).
3. `git init` + first commit are run automatically, **unless the target folder already lives inside an existing git repository** (the "one folder per offer"
   monorepo pattern): in that case `git init` is skipped, and `--repo`/`--repo-subdir` are derived from that repo's own `origin` remote and the folder's path
   within it, instead of falling back to the manifest's default.

```bash
pnpm dlx @techfides/tf-doc-vault@latest setup my_analysis --template=ana-docs
```

The scaffold ships the portal and its toolchain, but no documentation skills.
Those live in the TechFides skills library and are installed per project, so a
portal always runs the current generation rather than a copy frozen at scaffold
time:

```bash
tf-skills install docs
```

The scaffolded `CLAUDE.md` holds the portal-wide rules the skills assume. It is
tracked by `sync` / `sync:apply` (see [Syncing the boilerplate to an existing
repo](#syncing-the-boilerplate-to-an-existing-repo)), so a rule change reaches
existing portals instead of only new ones.

## Options

`tf-doc-vault setup <project-name> --template=ana-docs [options]`:

Each of these except `--repo`, `--repo-subdir` and `--analytics` is also a prompt, with the listed default pre-filled:

| Option                               | Default                                                           | Description                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `--section-nav` / `--no-section-nav` | `--section-nav`                                                   | Whether the top bar gets a link per documentation section. Off means one flat sidebar.                                          |
| `--base=<path>`                      | `/`                                                               | Base path baked into the VitePress build. Has to start and end with a slash.                                                    |
| `--repo=<org/repo>`                  | `TechFides/<project>`, or the detected repo's own `origin` remote | Not prompted for. Pre-fills the path inside the commented-out edit-link block of `docs/.vitepress/config.ts`.                   |
| `--repo-subdir=<path>`               | detected path from the repo root, empty for a standalone repo     | Not prompted for. Pre-fills the edit link's subfolder prefix when this folder lives inside a larger repo.                       |
| `--no-git`                           | _(false)_                                                         | Skip `git init` + first commit. Automatic when the target already sits inside a git repo (see above); use this to force it too. |
| `--analytics` / `--no-analytics`     | `--no-analytics`                                                  | Add `@vercel/analytics` and wire it into the VitePress theme. Off leaves no trace: no dependency, no wiring.                    |

The flags below are for maintainers developing this package against a local checkout. The wizard never prompts for them, and a consumer wants the default (`npm`):

| Option               | Default                                               | Description                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--source=<src>`     | `npm`                                                 | `npm` → published version from the public registry (no git credentials needed in CI). `git` → `git+ssh://…/tf-doc-vault.git#<ref>` (pinned to a tag). `file` → `file:<path>`. |
| `--dev`              | _(false)_                                             | Shortcut for `--source=file` pointing at this package's checkout.                                                                                                             |
| `--ref=<git-ref>`    | `v<package version>`                                  | Tag/branch/SHA for `--source=git` (ignored for `npm`/`file`).                                                                                                                 |
| `--git-url=<url>`    | `git+ssh://git@github.com/techfides/tf-doc-vault.git` | Override git URL for `--source=git`.                                                                                                                                          |
| `--file-path=<path>` | relative path to the package                          | Override `file:` path for `--source=file`.                                                                                                                                    |

### Dedicated repository

The standard setup: the analytical docs live in their own git repository and are deployed independently. The scaffolder runs `git init` and makes the first
commit automatically.

Unlike GitLab, GitHub has no push-to-create: create the repository first (web UI or `gh repo create TechFides/my_analysis --private`), then add the remote and
push:

```bash
cd my_analysis
pnpm install            # installs peer deps + tf-doc-vault from the npm registry
pnpm docs:dev           # http://localhost:5173

git remote add origin git@github.com:TechFides/my_analysis.git
git push -u origin main
```

Then, in the Vercel dashboard: New Project → import the repository → framework preset `vitepress` (`vercel.json` already pins the build command and output
directory explicitly, so nothing to configure). A push to a feature branch gets a preview URL automatically; merging to `main` deploys production. Set up
branch protection on `main` requiring the `result` check and forbidding direct pushes.

### Embedded in an existing repo, or the offers monorepo pattern

Two related but different cases:

- **A one-off embed into any existing repo:** pass `--no-git` explicitly. The full structure (`vercel.json`, `middleware.ts`, the GitHub workflow) is still
  generated, but `git init` is skipped so the output is committed as part of the parent repo.
- **The "one folder per offer" monorepo pattern** (many independent analytical docs sites sharing one repo, each its own Vercel project with Root Directory
  set to its folder): scaffold straight into the repo, no flags needed. The wizard detects the existing git repository on its own, skips `git init`, and
  derives `--repo`/`--repo-subdir` from the repo's `origin` remote and the new folder's path within it:

```bash
cd tf-sales-private-offers   # already a git repo, with an origin remote
pnpm dlx @techfides/tf-doc-vault@latest setup my_offer --template=ana-docs

cd my_offer
pnpm install
pnpm docs:dev   # http://localhost:5173

cd ..
git add my_offer/
git commit -m "docs: add my_offer analytical documentation"
git push
```

Each folder still deploys as its own Vercel project (Root Directory = that folder), independently of every other folder in the repo.

### Embedding inside an existing pnpm workspace

If the parent repo is itself a **pnpm workspace** (it has a `pnpm-workspace.yaml` at its root), `setup` will print a warning telling you to merge a small config block into the parent file. This is necessary because **pnpm only honors workspace configuration at the workspace root**, so the scaffolded `pnpm-workspace.yaml` and `.npmrc` inside `<your-folder>/` are silently ignored when pnpm sees an ancestor workspace.

Without this step, `pnpm docs:dev` will render a blank page and the browser console will show:

```
Uncaught SyntaxError: The requested module '.../dayjs.min.js'
does not provide an export named 'default'
```

The fix is to merge the following into the parent `pnpm-workspace.yaml`:

```yaml
packages:
  - <your-folder>
publicHoistPattern:
  - "*mermaid*"
  - dayjs
  - debug
  - "@braintree/*"
  - cytoscape*
  - "@types/d3*"
  - d3-*
allowBuilds:
  "@techfides/tf-doc-vault": true
  esbuild: true
```

Then re-run `pnpm install` from the monorepo root. The scaffolder prints these exact instructions on stderr whenever it detects an ancestor `pnpm-workspace.yaml`, so you don't need to memorise them.

### CI in a monorepo

GitHub only reads `.github/workflows/` at a repo's root, so the wizard places the generic workflow there directly (never inside an offer's own folder), and
never overwrites one that's already there. The workflow itself only validates the folders whose `docs:validate` script actually changed in a given PR or
push, so scaffolding more offers into the repo does not slow down CI for the others.

## Auth (edge middleware)

`middleware.ts` runs on Vercel's edge, ahead of every request (including static assets), and reads `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` from that Vercel
project's environment variables:

- **Unset:** the request passes through untouched; the site is public.
- **Set:** a request without a valid `Authorization: Basic` header gets a `401` with `WWW-Authenticate: Basic realm="Documentation"`, so the browser shows its
  native login dialog.

The credentials never live in the repo or the built client bundle; they exist only as Vercel project env vars, read server-side at the edge. Rotate a password
by updating the env vars and redeploying (or just triggering a new deploy).

### Public ↔ private

The same scaffold serves both: a public offer simply never sets `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`. Adding auth to an existing public offer, or removing it
from a private one, is only a Vercel project settings change, no redeploy of code required.

## Syncing the boilerplate to an existing repo

When the package adds or fixes something in `boilerplate/` (`vercel.json`, `middleware.ts`, the GitHub workflow, lint/format configs, `CLAUDE.md`), consumer
repos don't receive the update automatically; those files belong to them. To inspect or apply the diff:

```bash
pnpm sync           # shows a unified diff of all drifted files
pnpm sync:apply     # overwrites drifted files with the boilerplate (placeholders are rendered from the current repo)
```

User content (`docs/`, `package.json`, README) is excluded from overwriting. `CLAUDE.md` is the exception: it carries the portal-wide documentation rules
rather than project content, and a portal silently keeping superseded rules is worse than being told its copy drifted. `pnpm sync` shows that diff, and only
`pnpm sync:apply` replaces the file, so a portal that deliberately edited its own copy sees the change before it happens.

---

**See also:** [Editing &amp; publishing docs](./updating-docs.md) · [Import from Confluence](./confluence-import.md)
