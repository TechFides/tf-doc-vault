[← All guides](./README.md)

# Technical documentation in a service repo (`tech-docs`)

Technical documentation that lives directly inside an existing backend repo, in a `tech-docs/` subfolder, scaffolded from the `tech-docs` template.

## How it works

Running `tf-doc-vault setup --template=tech-docs` does this:

1. **Copies the `boilerplate/` VitePress project and the `tech-docs` template's Markdown** into a `tech-docs/` directory inside your service repo: `docs/` with the VitePress config and theme wiring, `CLAUDE.md`, `import-confluence.md`, and a minimal `package.json` that marks the folder as ESM. Anything the host repo already owns (its own `README.md`, `package.json`, ESLint / TypeScript / Prettier configs, `.gitignore`) stays out, as do the files that only make sense for a standalone portal (`vercel.json`, `middleware.ts`, `.github/`). Files that already exist are skipped, so re-running the command is safe.
2. **Substitutes placeholders** throughout the copied files (`__SERVICE_ID__`, `__PROJECT__`, `__DATE__`, `__REPO__`) so the generated frontmatter and titles reference your project from the start.
3. **Patches `package.json` and `.gitignore`** in the host repo: adds `docs:dev`, `docs:build`, `docs:validate`, `docs:fix`, and other scripts (only those not already present), adds the documentation dependencies (`@techfides/tf-doc-vault` itself, plus `vitepress`, `vitepress-plugin-mermaid`, `mermaid` and `vue`) to `devDependencies` unless the repo already declares them, and appends the VitePress `dist/` and `cache/` directories to `.gitignore`. The ranges come from this package's own `peerDependencies`, so they match what it is tested against; an entry the repo already pins is left untouched. The package itself has to be there because the `docs:*` scripts call its `tf-doc-vault` binary and the generated VitePress config imports `makeConfig` from it.
4. **Merges the pnpm settings the site needs into `pnpm-workspace.yaml`** at the host repo root, creating the file when there is none: the `publicHoistPattern` entries for Mermaid's CJS transitive dependencies, and `allowBuilds` for esbuild and this package. The values are read from the boilerplate's own workspace file, so a scaffold inside a service repo gets exactly what a standalone portal ships. The merge only adds: an entry the repo already declares keeps its place and its value, and re-running the wizard finds nothing left to add. Without the hoist entries `docs:dev` serves a blank page whose console reads `dayjs.min.js does not provide an export named 'default'`, and without `allowBuilds` pnpm 11 aborts every `pnpm <script>` with `ERR_PNPM_IGNORED_BUILDS`.

After the command runs, the service repo contains a ready-to-use `tech-docs/docs/` VitePress site. Developers write Markdown, run `docs:dev` for a live preview, and `docs:build` produces the `dist/` folder.

`--service-id` is the service identifier, `--project` the project name.

`--repo` is optional and the wizard never asks for it. VitePress can put an "Edit this page" link at the bottom of every page, pointing at the Markdown source in your repository; the generated `docs/.vitepress/config.mts` ships that `editLink` block commented out, with the repository path shown as an example. Enable the link by uncommenting the block and filling the path in there. Passing `--repo=<org/repo>` only pre-fills the path inside the still-commented block.

```bash
pnpm dlx @techfides/tf-doc-vault@latest setup --template=tech-docs \
  --service-id=TST \
  --project=testProject
```

Without a TTY (CI, scripts), pass every required flag; `setup` never prompts and exits with an error listing what is missing.

## Options

| Option                               | Default            | Description                                                                            |
| ------------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `--template=tech-docs`               | _(required)_       | Selects this template.                                                                 |
| `--service-id=<ID>`                  | _(required)_       | Service identifier, e.g. `TST`. Used in frontmatter and titles.                        |
| `--project=<name>`                   | cwd folder name    | Project name substituted into templates.                                               |
| `--section-nav` / `--no-section-nav` | `--no-section-nav` | Whether the top bar gets a link per documentation section. Off means one flat sidebar. |
| `--base=<path>`                      | `/tech-docs/`      | Base path baked into the VitePress build. See "Serving the documentation" below.       |
| `--repo=<org/repo>`                  | derived            | Not prompted for. Pre-fills the path inside the commented-out edit-link block.         |

Run `setup` without flags and the wizard asks for each option above except `--repo`, with these defaults pre-filled. `--base` has to start and end with a slash; the wizard rejects anything else rather than shipping a build whose assets 404.

`--source`, `--dev`, `--ref`, `--git-url` and `--file-path` exist for maintainers developing this package against a local checkout. They are never prompted for. They decide the spec written for `@techfides/tf-doc-vault` itself: the published version by default, a `file:` path with `--dev`.

## Serving the documentation

This package has no deploy story for documentation that lives inside a service repo. The scaffold gives the repo the Markdown sources, the VitePress setup and the `docs:*` scripts merged into the host `package.json`. `docs:build` writes a static site to `tech-docs/docs/.vitepress/dist`; publishing that directory is the host repo's own pipeline, the same one that already ships the service.

What the scaffold does decide is the **base path** baked into the build, `/tech-docs/` unless you pass `--base`. It has to match the path the site is served from: `--base=/tech-docs/` for `https://your-service.example.com/tech-docs/`, `--base=/` for a host that serves the site at the domain root. A mismatch returns 404 for every asset, and neither `docs:build` nor `vitepress preview` will tell you, because preview serves the site under whatever base was configured.

If you want the documentation deployed as a standalone portal (its own Vercel project, its own GitHub Actions workflow), scaffold it that way instead: [Analytical documentation](./ana-docs.md) covers that flavour, `vercel.json`, `middleware.ts` and CI included.

## Next steps

1. **Install and preview locally.** The wizard writes the dependencies and the pnpm settings but never installs anything, so the lockfile is still yours to generate and commit:

   ```bash
   pnpm install
   pnpm docs:dev   # http://localhost:5173/tech-docs/
   ```

2. **Build, then publish with your own pipeline:**

   ```bash
   pnpm docs:build
   ```

   Wire the resulting `tech-docs/docs/.vitepress/dist` into whatever the service already uses to publish static assets, and serve it at the path `--base` was set to.

If the service repo is itself a package inside a larger pnpm workspace, pnpm reads workspace settings only at the workspace root. Copy the `publicHoistPattern` and `allowBuilds` blocks the wizard wrote into the outermost `pnpm-workspace.yaml` as well, or the install ignores them.

---

**See also:** [Editing &amp; publishing docs](./updating-docs.md) · [Import from Confluence](./confluence-import.md)
