# __PROJECT__ — dokumentační portál

Dokumentace projektu **__PROJECT__** generovaná přes VitePress + sdílený tooling [`@techfides/ana-docs`](https://gitlab.com/techfides/tf-analysis/ana-docs).

## Lokálně

```bash
pnpm install
pnpm docs:dev          # http://localhost:5173
```

## Užitečné příkazy

```bash
pnpm docs:build        # produkční build
pnpm docs:validate     # frontmatter, broken links, lint
pnpm docs:normalize    # kanonické řazení frontmatter
pnpm docs:pdf          # export do artifacts/docs-full.pdf
pnpm fix               # LF, normalize, format, lint --fix, typecheck, validate
pnpm sync              # diff infra/CI/config souborů proti šabloně @techfides/ana-docs
pnpm sync:apply        # přepsat drifted soubory podle šablony
```

## Deployment

GCP Cloud Run, image v Artifact Registry, deploy přes GitLab CI/CD po pushi do `master`.

### První nasazení

GitLab repozitář není potřeba předem vytvářet — push-to-create ho založí v `techfides/tf-analysis` při prvním pushi:

```bash
git remote add origin git@gitlab.com:techfides/tf-analysis/__PROJECT__.git
git push -u origin master
```

Pak v nově vzniklém projektu nastav infra a CI/CD variables:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars     # vyplnit project_id
terraform init && terraform apply
terraform output -raw ci_service_account_key | base64 -d > /tmp/sa-key.json
# Obsah /tmp/sa-key.json vlož do GitLab CI/CD Variables jako GCP_SA_KEY.
# Dále nastav: GCP_PROJECT, GCP_REGION, SERVICE_NAME.
# Pokud používáš nginx-auth runtime, vyplň BASIC_AUTH_USER / BASIC_AUTH_PASS
# přímo v `variables:` bloku .gitlab-ci.yml (není to tajné — přístup do repa = přístup do aplikace).
```

Další push (nebo retry pipeliny) už projde build i deploy.

## Struktura `docs/`

```
docs/
  v1/                                ← verze
    byznys-specifikace/
      index.md                       ← úvod sekce
      <stránka>.md
    funkcni-specifikace/
    technicka-specifikace/
```

Každý `.md` musí mít frontmatter:

```markdown
---
title: Název
status: published | draft | review | archived
updated_at: 2026-04-27
---
```
