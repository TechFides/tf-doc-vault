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
