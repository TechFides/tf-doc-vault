[← All guides](./README.md)

# Analytical documentation (`*_ana` repos)

Standalone documentation repositories for business analysis, functional specs, and technical design — the `*_ana` pattern. Suited for projects where the
documentation has its own lifecycle and deployment, and needs to be accessible outside the application itself (e.g. for stakeholders or external reviewers).

Each repo gets a complete VitePress site with versioned content, a multi-stage Docker image deployed to GCP Cloud Run via Terraform, a full GitLab CI/CD
pipeline (install → lint → build → deploy), and optional Basic auth.

## How it works

1. `pnpm dlx` downloads the tooling from GitHub, builds `dist/` (via the `prepare` hook), and runs `tf-doc-vault create`.
2. The scaffolder copies `template/` to `./my_analysis/`, substituting placeholders (`__PROJECT__`, `__GCP_PROJECT__`, `__SERVER_TYPE__`,
   `__VITEPRESS_COMMON_DEP__`).
3. `git init` + first commit are run automatically (skip with `--no-git` when embedding into an existing repo).

```bash
pnpm dlx @techfides/tf-doc-vault@latest create my_analysis \
  --gcp-project=tfsa-my-analysis \
  --server=nginx
```

## Options

`tf-doc-vault create <project-name> [options]`:

| Option               | Default                                               | Description                                                                                                                                             |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--gcp-project=<id>` | `tfsa-<project>`                                      | GCP project ID (written to `terraform.tfvars`).                                                                                                         |
| `--server=<type>`    | `nginx`                                               | Runtime image: `nginx` (static, no auth) or `nginx-auth` (Nginx + Basic auth from `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`).                                 |
| `--source=<src>`     | `git`                                                 | `git` → `git+ssh://…/tf-doc-vault.git#<ref>` (production, pinned to tag). `file` → `file:<path>` (local package development next to the consumer repo). |
| `--ref=<git-ref>`    | `v<package version>`                                  | Tag/branch/SHA for `--source=git`.                                                                                                                      |
| `--git-url=<url>`    | `git+ssh://git@github.com/techfides/tf-doc-vault.git` | Override git URL for `--source=git`.                                                                                                                    |
| `--file-path=<path>` | relative path to the package                          | Override `file:` path for `--source=file`.                                                                                                              |
| `--no-git`           | _(false)_                                             | Skip `git init` + first commit. Use when embedding the docs inside an existing repo — all infrastructure is still generated.                            |

### Dedicated repository

The standard setup — the analytical docs live in their own git repository and are deployed independently. The scaffolder runs `git init` and makes the first
commit automatically.

The GitLab repository **does not need to be created in advance** — GitLab
supports [push-to-create](https://docs.gitlab.com/topics/git/project/#create-a-project-using-git-push). Just add the remote and push:

```bash
cd my_analysis
pnpm install            # pulls peer deps + tf-doc-vault from git (prepare hook builds dist/)
pnpm docs:dev           # http://localhost:5173

git remote add origin git@gitlab.com:techfides/tf-analysis/my_analysis.git
git push -u origin master   # GitLab creates the project automatically
```

Prerequisite: at least `Developer` rights in `techfides/tf-analysis`. After the first push, set the CI/CD variables (`GCP_SA_KEY`, `GCP_PROJECT`, `GCP_REGION`,
`SERVICE_NAME`) in the newly created GitLab project — without them the `🐳 build:docs` job will fail.

Deployment: `terraform apply` in `infra/` provisions Cloud Run + Artifact Registry on first run. Subsequent deploys happen automatically via CI on every push to
`master`.

### Embedded in an existing repo (`--no-git`)

When the analytical docs belong inside an existing service or project repo, add `--no-git`. The full structure — VitePress site, Dockerfile, CI, Terraform — is
still generated, but `git init` is skipped so the output is committed as part of the parent repo:

```bash
pnpm dlx @techfides/tf-doc-vault@latest create ana_project \
  --gcp-project=ana_project \
  --server=nginx \
  --no-git

cd ana_project
pnpm install
pnpm docs:dev   # http://localhost:5173

cd ..
git add ana_project/
git commit -m "docs: add ana_project analytical documentation"
git push
```

The docs can still be deployed to Cloud Run independently using their own CI/CD pipeline.

### Embedding inside an existing pnpm workspace

If the parent repo is itself a **pnpm workspace** (it has a `pnpm-workspace.yaml` at its root), `create` will print a warning telling you to merge a small config block into the parent file. This is necessary because **pnpm only honors workspace configuration at the workspace root** — the scaffolded `pnpm-workspace.yaml` and `.npmrc` inside `<your-folder>/` are silently ignored when pnpm sees an ancestor workspace.

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

### CI/CD integration

GitLab only reads the root-level `.gitlab-ci.yml`, so the generated `ana_project/.gitlab-ci.yml` won't run automatically from the parent pipeline. Add a **child
pipeline trigger** to the parent repo's `.gitlab-ci.yml`:

```yaml
ana_project:docs:
  stage: build # any stage that already exists in the parent pipeline
  trigger:
    include: ana_project/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes:
        - ana_project/**
      when: on_success
    - when: never
```

Replace `ana_project` with the actual directory name. The child pipeline runs only when files under `ana_project/` change, inherits CI/CD variables from project
settings, and has isolated stages with no naming conflicts. `strategy: depend` makes the parent job reflect the child pipeline's pass/fail status.

## Auth (`nginx-auth`)

The `nginx-auth` runtime protects the application with HTTP Basic auth. Username and password are set **at build time** via Docker build-args `BASIC_AUTH_USER` /
`BASIC_AUTH_PASS` — the `Dockerfile` generates `/etc/nginx/.htpasswd` from them. If they are empty, the build fails fast.

The values are stored directly in the repo, in the top-level `variables:` block of `.gitlab-ci.yml`:

```yaml
variables:
  PNPM_STORE: "$CI_PROJECT_DIR/.pnpm-store"
  BASIC_AUTH_USER: "anadocs"
  BASIC_AUTH_PASS: "anadocsTF"
```

This is not a secret — anyone with repo access has application access. The `🐳 build:docs` job conditionally passes them to `docker build` only when non-empty,
so projects without auth (runtime `nginx`) just leave them blank.

Local build:

```bash
docker build --build-arg SERVER_TYPE=nginx-auth \
             --build-arg BASIC_AUTH_USER=anadocs \
             --build-arg BASIC_AUTH_PASS=anadocsTF \
             -t docs-web .
```

Password rotation = update `variables:` + commit + redeploy (the htpasswd hash is baked into the image layer).

### Switching an existing project from `nginx` to `nginx-auth`

`__SERVER_TYPE__` is baked into two places during scaffolding — switching requires updating both:

1. **`.gitlab-ci.yml`** — in `BUILD_ARGS` (job `🐳 build:docs`) change `SERVER_TYPE=nginx` to `SERVER_TYPE=nginx-auth`.
2. **`Dockerfile`** — `ARG SERVER_TYPE=nginx` → `ARG SERVER_TYPE=nginx-auth` (default for local builds without a build-arg; CI always overrides it).
3. **`.gitlab-ci.yml`** `variables:` — fill in `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` (otherwise the build fails on the fail-fast check in `Dockerfile`).
4. Commit + push → CI builds a new image, Cloud Run rolls out a new revision.

Back to `nginx` = the same steps in reverse + clear both `BASIC_AUTH_*` values.

## Syncing the template to an existing repo

When the package adds or fixes something in `template/` (Dockerfile, CI, configs, Terraform), consumer repos don't receive the update automatically — those
files belong to them. To inspect or apply the diff:

```bash
pnpm sync           # shows a unified diff of all drifted files
pnpm sync:apply     # overwrites drifted files with the template (placeholders are rendered from the current repo)
```

User content (`docs/`, `package.json`, README, CLAUDE, custom.css, terraform.tfvars) is excluded from overwriting.

---

**See also:** [Editing &amp; publishing docs](./updating-docs.md) · [Import from Confluence](./confluence-import.md)
