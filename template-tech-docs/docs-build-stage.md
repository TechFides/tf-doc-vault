# Tech-docs build stage pro service Dockerfile

Přidej před production stage (některé comandy mohou být redundantní s již existujícími v Dockerfile):

```dockerfile
###################
# TECH-DOCS BUILD
###################

FROM node:24-alpine AS docs-build

WORKDIR /usr/src/app

COPY --chown=node:node package-lock.json package.json ./

RUN npm ci --ignore-scripts

COPY --chown=node:node tech-docs ./tech-docs

RUN npx vitepress build tech-docs/docs
```

A v production stage:

```dockerfile
COPY --chown=node:node --from=docs-build \
  /usr/src/app/tech-docs/docs/.vitepress/dist \
  ./tech-docs/docs/.vitepress/dist
```

**Důležité:**

- docs-build stage běží paralelně s app build stage (Buildkit). Úprava
  `tech-docs/architecture.md` invaliduje jen docs cache, ne app cache.
- Žádný `GH_NPM_TOKEN` ani `.npmrc` registry override — `@techfides/tf-doc-vault`
  je veřejně dostupný z npmjs.com.
