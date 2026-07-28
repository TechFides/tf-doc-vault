# Tech-docs build stage for the service Dockerfile

Add before the production stage (some commands may be redundant with ones already in the Dockerfile):

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

And in the production stage:

```dockerfile
COPY --chown=node:node --from=docs-build \
  /usr/src/app/tech-docs/docs/.vitepress/dist \
  ./tech-docs/docs/.vitepress/dist
```

**Important:**

- The docs-build stage runs in parallel with the app build stage (Buildkit). Editing
  `tech-docs/architecture.md` invalidates only the docs cache, not the app cache.
- No `GH_NPM_TOKEN` or `.npmrc` registry override is needed;
  `@techfides/tf-doc-vault` is publicly available from npmjs.com.
