[← All guides](./README.md)

# Technical documentation in a service repo (`tech-docs`)

Technical documentation that lives directly inside an existing backend repo, in a `tech-docs/` subfolder, scaffolded from the `tech-docs` template.

## How it works

Running `tf-doc-vault setup --template=tech-docs` does this:

1. **Copies the `boilerplate/` VitePress project and the `tech-docs` template's Markdown** into a `tech-docs/` directory inside your service repo: `docs/` with the VitePress config and theme wiring, `CLAUDE.md`, `import-confluence.md`, and a minimal `package.json` that marks the folder as ESM. Anything the host repo already owns (its own `README.md`, `package.json`, ESLint / TypeScript / Prettier configs, `.gitignore`) stays out, as do the files that only make sense for a standalone portal (Dockerfile, `.gitlab-ci.yml`, `infra/`). Files that already exist are skipped, so re-running the command is safe.
2. **Substitutes placeholders** throughout the copied files (`__SERVICE_ID__`, `__PROJECT__`, `__DATE__`, `__REPO__`) so the generated frontmatter and titles reference your project from the start.
3. **Patches `package.json` and `.gitignore`** in the host repo: adds `docs:dev`, `docs:build`, `docs:validate`, `docs:fix`, and other scripts (only those not already present), and appends the VitePress `dist/` and `cache/` directories to `.gitignore`.

After the command runs, the service repo contains a ready-to-use `tech-docs/docs/` VitePress site. Developers write Markdown, run `docs:dev` for a live preview, and `docs:build` produces the `dist/` folder.

`--service-id` is the service identifier, `--project` the project name. `--repo` is optional; it pre-fills the repository path in the commented-out `editLink` block of `docs/.vitepress/config.mts`, so edit links start working once you uncomment that block. Leave it out and the template derives a path from the project name, which you can correct in that block.

```bash
tf-doc-vault setup --template=tech-docs \
  --service-id=TST \
  --project=testProject \
  --repo=myorg/myrepo
```

Without a TTY (CI, scripts), pass every required flag; `setup` never prompts and exits with an error listing what is missing.

## Options

| Option                 | Default         | Description                                                                      |
| ---------------------- | --------------- | -------------------------------------------------------------------------------- |
| `--template=tech-docs` | _(required)_    | Selects this template.                                                           |
| `--service-id=<ID>`    | _(required)_    | Service identifier, e.g. `TST`. Used in frontmatter and titles.                  |
| `--project=<name>`     | cwd folder name | Project name substituted into templates.                                         |
| `--repo=<org/repo>`    | derived         | Repository path pre-filled into the commented-out edit-link block.               |
| `--base=<path>`        | `/tech-docs/`   | Base path baked into the VitePress build. See "Serving the documentation" below. |

`--base` has to start and end with a slash; the wizard rejects anything else rather than shipping a build whose assets 404.

## Serving the documentation

This package has no deploy story for documentation that lives inside a service repo. The scaffold gives the repo the Markdown sources, the VitePress setup and the `docs:*` scripts merged into the host `package.json`. `docs:build` writes a static site to `tech-docs/docs/.vitepress/dist`; publishing that directory is the host repo's own pipeline, the same one that already ships the service.

What the scaffold does decide is the **base path** baked into the build, `/tech-docs/` unless you pass `--base`. It has to match the path the site is served from: `--base=/tech-docs/` for `https://your-service.example.com/tech-docs/`, `--base=/` for a host that serves the site at the domain root. A mismatch returns 404 for every asset, and neither `docs:build` nor `vitepress preview` will tell you, because preview serves the site under whatever base was configured.

If you want the documentation deployed as a standalone portal (its own image, its own Cloud Run service, its own pipeline), scaffold it that way instead: [Analytical documentation](./ana-docs.md) covers that flavour, Dockerfile, CI and Terraform included.

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

4. **Build, then publish with your own pipeline:**

   ```bash
   npm run docs:build
   ```

   Wire the resulting `tech-docs/docs/.vitepress/dist` into whatever the service already uses to publish static assets, and serve it at the path `--base` was set to.

---

**See also:** [Editing &amp; publishing docs](./updating-docs.md) · [Import from Confluence](./confluence-import.md)
