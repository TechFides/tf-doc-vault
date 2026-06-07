---
name: prerelease-check
description: >-
  Pre-publish release-readiness check for the @techfides/tf-doc-vault package.
  Confirms the external API / CLI surface is unchanged since the last release,
  runs the full quality gate (lint, typecheck, format, build, unit) plus the
  Playwright smoke suite, and does VISUAL BROWSER checks of the playground, the
  ana (create-ana) site and the tech-docs (init-tech-docs) site — verifying
  base-path correctness and a clean browser console. Use this whenever the user
  is about to publish or release a new version, cut a release, bump the version,
  run `pnpm release`/`npm publish`, or asks for a "prerelease check", "sanity
  check before publishing", "release readiness", or "is it safe to publish" —
  even if they don't spell out every step. Run it BEFORE the release.
---

# Pre-release functionality check

A repeatable "is this safe to publish?" gate for `@techfides/tf-doc-vault`. The
package is a VitePress tooling library: a config factory, a Vue theme, a sidebar
generator, a CLI (`tf-doc-vault`, `create-ana` + subcommands), the Express/Nest
`setupTechDocs` mounts, plus Docker and Terraform. Because downstream repos pin
to the published npm package, the two things that hurt most on a bad release are
**a silently-changed public API** and **a site that builds but renders broken in
a browser**. This skill checks both, end to end.

Run every step from the repo root. Report results as you go; if any step fails,
stop and surface the failure with the root cause rather than pressing on.

## What "done" looks like

A short report (template at the bottom) covering: API surface unchanged, gate
green, smoke green, all three sites visually verified (render + base paths +
clean console), and a clear statement of which fixes are actually on the branch
being published. The working tree must be clean at the end.

---

## Step 0 — Establish the baseline

Know what is being published and against what to compare.

```bash
git branch --show-current
git status --short | grep -vE 'dist/' || echo '(clean)'
git describe --tags --abbrev=0 2>/dev/null || echo '(no tags yet)'   # last release
node -e "console.log(require('./package.json').version)"
```

The publishable artifact is the current branch's `src/` (compiled to `dist/` on
publish). `renovate.json`, tests, `.claude/`, `playground/` are **not** in the
npm `files` list, so changes there never affect the release — note this if the
user worries about uncommitted tooling changes.

If there are open PRs with behaviour fixes the user expects in the release,
confirm whether they're merged into the branch (Step 4 of the API check below
shows the `git merge-base --is-ancestor` pattern).

---

## Step 1 — External API / commands unchanged

A patch/minor release must not change the public surface. Verify it two ways.

**1a. Which files did the new commits touch?** Anything under the public surface
is a red flag worth a closer look. The public surface is: `package.json`
(`bin`/`exports`/`files`/`engines`), `src/index.ts`, `src/cli/tf-doc-vault.ts`
(the dispatcher + flag/usage text), and `src/setup/**`.

```bash
LAST=$(git describe --tags --abbrev=0 2>/dev/null)
git diff --stat ${LAST:+$LAST..}HEAD -- \
  package.json src/index.ts src/cli/tf-doc-vault.ts src/setup || \
  echo "(no public-surface files changed)"
```

Empty/quiet output is the happy path. If something shows up, read the diff and
judge whether it's an intended, documented API change (which would warrant a
minor/major bump and a changelog note) or an accident.

**1b. Snapshot the surface and eyeball it.** These must match the last release:

```bash
node -e "const p=require('./package.json');console.log(JSON.stringify({bin:p.bin,exports:Object.keys(p.exports),files:p.files,engines:p.engines},null,2))"
grep -nE '^export' src/index.ts
grep -nE 'cmd === \"|runCliScript\(' src/cli/tf-doc-vault.ts
```

Confirm specifically:

- `bin` is still `tf-doc-vault` + `create-ana`.
- `exports` still includes `.`, `./config`, `./sidebar`, `./theme`,
  `./setup/express`, `./setup/nest`, the config/template/docker subpaths.
- `src/index.ts` still exports `makeConfig`, `createTheme`, the sidebar
  generators — and **`setupTechDocs` is still NOT re-exported from the root**
  (it's built separately by unbuild; a root re-export dangles at runtime — this
  is a hard limit in AGENTS.md).
- Dispatcher subcommands unchanged: `create`, `init-tech-docs`,
  `import-confluence`, `export-pdf`, `pdf`, `validate`, `normalize`, `fix`.

CLI flags and env-var names (`--site`, `--root-page-id`, `--output`, `--space`,
`--verbose`; `CONFLUENCE_USER_EMAIL`, `CONFLUENCE_API_TOKEN`) live inside the
individual `src/cli/*.ts` entrypoints — if `git diff` flagged any of those, read
the change to confirm flags weren't renamed/removed.

---

## Step 2 — Quality gate

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
pnpm test:unit
```

All must pass. `build` matters here because the smoke suite and the browser
checks run against the freshly-built `dist/`. Unit tests should report **0
skipped** — a lingering `.skip` is a regression test that isn't actually
guarding anything; investigate before publishing.

---

## Step 3 — Smoke suite (all use cases, automated)

```bash
pnpm test:smoke
```

This packs the real tarball and exercises every consumer-facing use case in a
real Chromium with hydration/console-error assertions: `create-ana` (dev +
preview), tech-docs preview, CLI subcommands (`import-confluence --help`,
`print`, `ensure-lf`, `normalize`), every subpath export, the theme/dark-mode,
and the Express **and** Nest mounts in both ESM and CJS. Expect ~18 tests
passing in well under a couple of minutes.

The global-setup leaves built sandboxes on disk that Step 4 reuses:

```bash
SMOKE=$(node -e "console.log(require('os').tmpdir())")/tf-smoke
ls -d "$SMOKE"/ana-parent/ana_test/docs/.vitepress/dist "$SMOKE"/tech-docs/docs/.vitepress/dist
```

---

## Step 4 — Visual browser checks

Smoke already asserts the sites render without console errors, but a human-style
visual pass catches what assertions miss (broken layout, literal markdown,
wrong-base links that still 200). Check **all three** sites: playground, ana,
tech-docs. ana is the most important — it's where the home-page theme
(`BrandHero`, `FeatureCards`) and the `/docs/` base both live.

These are the sites and their **base paths** (the base is baked into each build,
so you must navigate to `/<base>/`, not `/`):

| Site       | Source to serve                                 | Base          |
| ---------- | ----------------------------------------------- | ------------- |
| playground | `playground/docs` (run `pnpm build:docs` first) | `/`           |
| ana        | `$SMOKE/ana-parent/ana_test/docs`               | `/docs/`      |
| tech-docs  | `$SMOKE/tech-docs/docs`                         | `/tech-docs/` |

If the smoke sandboxes were cleaned up, re-run `pnpm test:smoke` to rebuild them
(or scaffold/build manually).

### Serving + viewing

Use the `Claude_Preview` MCP tools (own headless browser — this is "your
browser"). It starts servers from `.claude/launch.json`, so write a temporary
config, use it, then **delete it** — `.claude/` is not gitignored in this repo
and a stray file would dirty the tree right before publish.

1. Write `.claude/launch.json` with one configuration per site you'll view. Each
   serves a built docs dir on its own port; `Claude_Preview` runs from the repo
   root, so pass the **absolute** docs path:

   ```json
   {
     "version": "0.0.1",
     "configurations": [
       {
         "name": "ana",
         "runtimeExecutable": "pnpm",
         "runtimeArgs": [
           "exec",
           "vitepress",
           "preview",
           "<ABS>/ana_test/docs",
           "--port",
           "4174",
           "--host",
           "127.0.0.1"
         ],
         "port": 4174
       },
       {
         "name": "tech-docs",
         "runtimeExecutable": "pnpm",
         "runtimeArgs": [
           "exec",
           "vitepress",
           "preview",
           "<ABS>/tech-docs/docs",
           "--port",
           "4173",
           "--host",
           "127.0.0.1"
         ],
         "port": 4173
       }
     ]
   }
   ```

2. For each site: `preview_start` it → it loads `/` which 404s under a non-`/`
   base, so navigate to the base with `preview_eval`
   (`window.location.assign('/docs/')`) → `preview_screenshot` →
   `preview_console_logs` (level `warn`, then `error`).

   A full-page navigation closes the eval context (you'll see "Inspected target
   navigated or closed") — that's expected; just take the screenshot next.

### What to verify on each site

- **Renders, not broken.** Themed nav, hero, footer, content; no raw HTML, no
  Vue-compiler crash, no empty body.
- **Console is clean.** `preview_console_logs` at `warn` and `error` should
  return nothing. Mermaid/Vue-compile errors show up here.
- **Base paths are correct.** This is the high-value check — links that omit the
  base still return 200 in dev but 404 for real users. Assert internal links
  carry the base:

  ```js
  // ana — feature cards must point at /docs/v1/...
  [...document.querySelectorAll('.feature-card')].map(a => a.getAttribute('href'))
  // tech-docs — every internal link under /tech-docs/
  [...document.querySelectorAll('a')].map(a=>a.getAttribute('href'))
     .filter(h=>h&&h.startsWith('/')).every(h=>h.startsWith('/tech-docs'))
  ```

  (Background: VitePress base-prefixes markdown links and nav items, but **not**
  raw `:href` bindings in custom Vue components — that class of bug is invisible
  to a build and only shows up here.)

- **No literal markdown.** Component slot text (e.g. `BrandHero`'s subtitle) is
  not markdown-processed, so `**bold**` written there renders as literal
  asterisks. Eyeball the hero/intro text. If you spot it, flag it as a finding
  (it's usually a template/component issue, not a release blocker).

### Cleanup (do not skip)

```bash
lsof -ti:4173,4174 | xargs kill 2>/dev/null   # stop the preview servers
rm -f .claude/launch.json                      # remove the temp launch config
git status --short | grep -vE 'dist/' || echo '(clean)'
```

The tree must be clean afterwards.

> Alternative: if `Claude_Preview` is unavailable, serve each site with a
> background `pnpm exec vitepress preview <docs> --port <p> --host 127.0.0.1`
> and drive `Claude_in_Chrome` against the full URL incl. base (e.g.
> `http://127.0.0.1:4174/docs/`). No `.claude/launch.json` needed that way.

---

## Step 5 — Confirm what's actually in the release

If behaviour fixes were spread across branches/PRs, confirm each is on the branch
being published, so the report tells the user exactly what ships:

```bash
for sha in <commit-shas>; do
  git merge-base --is-ancestor $sha HEAD && echo "on branch ✓ $sha" || echo "NOT on branch ✗ $sha"
done
```

---

## Report template

```
Pre-release check — <branch> @ <short-sha> (current version <x.y.z>)

API/commands ........ unchanged ✓   (bin, exports, src/index.ts, dispatcher all identical; setup not re-exported)
Quality gate ........ lint / typecheck / format / build / unit (<N> passed, 0 skipped) ✓
Smoke ............... <N>/<N> passed ✓  (ana dev+preview, tech-docs, CLI subcommands, exports, theme, express+nest ESM+CJS)
Browser visual ......
  • playground (/) .......... renders, console clean ✓
  • ana (/docs/) ............ renders; feature-card hrefs = /docs/v1/... ✓; console clean ✓
  • tech-docs (/tech-docs/) . renders; internal links = /tech-docs/... ✓; console clean ✓
In the release ...... <fixes confirmed on branch>
Findings ............ <none | pre-existing cosmetic items, e.g. literal ** in a component slot>
Tree ................ clean

Verdict: safe to publish  /  blockers: <...>
```
