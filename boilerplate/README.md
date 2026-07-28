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
pnpm sync              # diff infra/CI/config files against the @techfides/tf-doc-vault boilerplate
pnpm sync:apply        # overwrite drifted files from the boilerplate
```

## Deployment

GCP Cloud Run, image in Artifact Registry, deployed via GitLab CI/CD on every push to `master`.

### First deployment

The GitLab repository does not need to exist in advance; push-to-create sets it up under `techfides/tf-analysis` on the first push. Add the remote and push:

```bash
git remote add origin git@gitlab.com:techfides/tf-analysis/__PROJECT__.git
git push -u origin master
```

> CI and the Docker build install with `--frozen-lockfile`, so the repo must contain a committed `pnpm-lock.yaml`. Scaffolding generated it and added it to the first commit automatically; if it is missing from `git status`, or you changed dependencies, generate and commit it before pushing: `pnpm install && git add pnpm-lock.yaml && git commit`.

Then, in the newly created project, set up infra and the CI/CD variables:

```bash
pnpm install                                       # the Terraform module is read from node_modules/
gcloud auth application-default login              # one-time, for Terraform (GCS backend + provider)

cd infra
cp terraform.tfvars.example terraform.tfvars     # fill in project_id

# Bootstrap the GCS bucket for tfstate (one-time, outside terraform):
gcloud storage buckets create gs://__GCP_PROJECT__-tfstate \
  --project=__GCP_PROJECT__ --location=europe-west1 \
  --uniform-bucket-level-access
gcloud storage buckets update gs://__GCP_PROJECT__-tfstate --versioning

terraform init && terraform apply
terraform output -raw ci_service_account_key | base64 -d > /tmp/sa-key.json
# Put the contents of /tmp/sa-key.json into GitLab CI/CD Variables as GCP_SA_KEY.
# Also set: GCP_PROJECT, GCP_REGION, SERVICE_NAME.
# If you use the nginx-auth runtime, fill in BASIC_AUTH_USER / BASIC_AUTH_PASS
# directly in the `variables:` block of .gitlab-ci.yml (not secret: repo access = app access).
```

The next push (or a pipeline retry) then passes both build and deploy.

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
