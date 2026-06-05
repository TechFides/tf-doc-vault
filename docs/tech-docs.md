[← All guides](./README.md)

# Technical documentation in a service repo (`tech-docs`)

Technical documentation that lives directly inside an existing backend repo and is served by the application itself at `/tech-docs` with HTTP Basic auth.

## How it works

Running `init-tech-docs` does this:

1. **Copies the bundled `template-tech-docs/` scaffold** into a new `tech-docs/` directory inside your service repo. Files that already exist are skipped, so
   re-running the command is safe.
2. **Substitutes placeholders** throughout the copied files — `__SERVICE_ID__`, `__PROJECT__`, `__DATE__`, and optionally `__REPO__` — so generated frontmatter,
   titles, and edit links already reference your project from the start.
3. **Patches `package.json` and `.gitignore`** — adds `docs:dev`, `docs:build`, `docs:validate`, `docs:fix`, and other scripts (only those not already present),
   and appends the VitePress `dist/` and `cache/` directories to `.gitignore`.

After the command runs, the service repo contains a ready-to-use `tech-docs/docs/` VitePress site. Developers write Markdown, run `docs:dev` for a live preview,
and `docs:build` produces the `dist/` folder that the application serves at `/tech-docs`.

```bash
pnpm exec tf-doc-vault init-tech-docs \
  --service-id=TST \       # service identifier
  --project=testProject \  # project name
  --repo=myorg/myrepo      # optional — GitHub/GitLab repo for edit links
```

## Options

| Option              | Default         | Description                                                     |
| ------------------- | --------------- | --------------------------------------------------------------- |
| `--service-id=<ID>` | _(required)_    | Service identifier, e.g. `TST`. Used in frontmatter and titles. |
| `--project=<name>`  | cwd folder name | Project name substituted into templates.                        |
| `--repo=<org/repo>` | _(none)_        | GitHub/GitLab repo path for edit links, e.g. `myorg/myrepo`.    |

## Next steps

1. **Add VitePress peer dependencies** to `devDependencies` in the service repo's `package.json`:

   ```json
   "vitepress": "^1.6.4",
   "vitepress-plugin-mermaid": "^2.0.17",
   "mermaid": "^11.14.0"
   ```

   These must be installed directly in the project so the `vitepress` binary is available when running `docs:dev` and `docs:build`.

2. **If you use pnpm v11+, approve the esbuild build script.** Create or amend `pnpm-workspace.yaml` at the service root:

   ```yaml
   allowBuilds:
     esbuild: true
   ```

   Without this, pnpm 11's `verifyDepsBeforeRun` aborts every `pnpm <script>` invocation with `ERR_PNPM_IGNORED_BUILDS`. pnpm v10 ignores the setting harmlessly, so it's safe to ship in any repo.

3. **Install and preview locally:**

   ```bash
   npm install
   npm run docs:dev   # http://localhost:5173/tech-docs/
   ```

4. **Add the `docs-build` stage to the Dockerfile** — see [`template-tech-docs/docs-build-stage.md`](../template-tech-docs/docs-build-stage.md).

5. **Call `setupTechDocs()` in `main.ts`:**

   ```ts
   import { setupTechDocs } from "@techfides/tf-doc-vault/setup/nest";

   await setupTechDocs(app, {
     auth: { username: "docs", password: process.env.TECH_DOCS_PASSWORD ?? "" },
   });
   ```

   If `auth.password` is empty or `dist/` does not exist, `setupTechDocs` does nothing — the middleware is a no-op in production where the env var is unset.

6. **Set the `TECH_DOCS_PASSWORD` env variable** (dev/staging only, not prod).

7. **Build the docs and verify:**

   ```bash
   npm run docs:build
   npm run dev   # or however you start the application
   ```

   The docs will be available at `/tech-docs/` with HTTP Basic auth (**username**: `docs`, **password** from `TECH_DOCS_PASSWORD`).

---

**See also:** [Editing &amp; publishing docs](./updating-docs.md) · [Import from Confluence](./confluence-import.md)
