#!/usr/bin/env node
/**
 * setup: interactive wizard that scaffolds documentation from one of the
 * bundled templates. Everything template-specific comes from the manifest that
 * `scaffold.ts` reads, so a new template is a new folder and no code change.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";
import * as clack from "@clack/prompts";
import {
  SetupError,
  findAncestorFile,
  parseArgs,
  replacePlaceholders,
  type ParsedArgs,
} from "./utils.js";
import {
  FIELD_CATALOG,
  PACKAGE_DIR,
  BOILERPLATE_DIR,
  applyCopyPlan,
  boilerplateWorkspaceSettings,
  checkFieldValue,
  documentationDependencies,
  placeholderValues,
  resolveCopyPlan,
  resolveDependencyValue,
  resolveManifestDefault,
  resolveSource,
  scanTemplates,
  unquoteYaml,
  type Answer,
  type DefaultContext,
  type FieldOption,
  type FieldSpec,
  type FieldType,
  type TemplateManifest,
  type TemplateScan,
  type WorkspaceSettings,
} from "./scaffold.js";
import { detectHostRepo } from "./git-context.js";

export class CancelledError extends Error {}

export interface PromptRequest {
  key: string;
  type: FieldType;
  message: string;
  hint?: string;
  initialValue?: string | boolean;
  options?: FieldOption[];
  validate?: (value: string) => string | undefined;
}

export type PromptFn = (request: PromptRequest) => Promise<Answer>;

// ─── flags ───

export interface SetupInput {
  /** Positional only; there is no `--name` flag. */
  projectName?: string;
  flags: ParsedArgs["flags"];
}

export function templateFlag(flags: ParsedArgs["flags"]): string | undefined {
  return typeof flags.template === "string" ? flags.template : undefined;
}

/**
 * Presence only, without validating: a field the chosen template does not ask
 * about is reported as ignored, never rejected.
 */
function isSupplied(field: FieldSpec, input: SetupInput): boolean {
  if (field.flag.startsWith("[")) return input.projectName !== undefined;
  if (input.flags[field.key] !== undefined) return true;
  return (
    field.type === "confirm" && input.flags[`no-${field.key}`] !== undefined
  );
}

function suppliedValue(field: FieldSpec, input: SetupInput): Answer {
  if (field.flag.startsWith("[")) return input.projectName;
  if (field.type === "confirm") {
    // `--git=false` parses as the string "false", which reads as "off" and would
    // otherwise be dropped, leaving the default in place.
    for (const key of [field.key, `no-${field.key}`]) {
      if (typeof input.flags[key] !== "string") continue;
      throw new SetupError(
        `--${key} takes no value. Use --${field.key} or --no-${field.key}.`,
      );
    }
    if (input.flags[field.key] === true) return true;
    if (input.flags[`no-${field.key}`] === true) return false;
    return undefined;
  }
  const value = input.flags[field.key];
  if (value === true) {
    throw new SetupError(`${field.flag} needs a value.`);
  }
  return typeof value === "string" ? value : undefined;
}

function checkSupplied(field: FieldSpec, value: Answer): Answer {
  if (typeof value === "string") {
    const problem = checkFieldValue(field, value);
    if (problem)
      throw new SetupError(`Invalid ${field.flag}: ${value}\n  ${problem}`);
  }
  return value;
}

export function knownFlagKeys(): Set<string> {
  const keys = new Set(["template", "help"]);
  for (const field of FIELD_CATALOG) {
    if (!field.flag.startsWith("[")) keys.add(field.key);
    if (field.type === "confirm") keys.add(`no-${field.key}`);
    for (const companion of field.companions ?? []) keys.add(companion.key);
  }
  return keys;
}

export function unknownFlags(flags: ParsedArgs["flags"]): string[] {
  const known = knownFlagKeys();
  return Object.keys(flags).filter((key) => !known.has(key));
}

function fieldDefault(field: FieldSpec, ctx: DefaultContext): Answer {
  if (field.preferComputedDefault) {
    // Truthy, not merely defined: an empty "nothing detected" result must
    // still fall through to the manifest's own static default below.
    const computed = field.defaultValue?.(ctx);
    if (computed) return computed;
  }
  const override = ctx.manifest.defaults[field.key];
  if (override === undefined) return field.defaultValue?.(ctx);
  if (typeof override !== "string") return override;
  return resolveManifestDefault(ctx.manifest, field, override, ctx.answers);
}

// ─── dialogue ───

async function ask(
  field: FieldSpec,
  fallback: Answer,
  promptFn: PromptFn,
): Promise<Answer> {
  const required = field.type === "text" && fallback === undefined;
  const answer = await promptFn({
    key: field.key,
    type: field.type,
    message: field.prompt,
    hint: field.hint,
    initialValue:
      typeof fallback === "string" || typeof fallback === "boolean"
        ? fallback
        : undefined,
    options: field.options,
    validate: (value: string): string | undefined => {
      // Clearing a prefilled default is how an empty value reaches an
      // optional field, so the field's own validator judges "" too.
      if (value === "" && required) return "This value is required.";
      return field.validate?.(value);
    },
  });
  if (field.type === "confirm") return answer === true;
  return typeof answer === "string" ? answer : "";
}

export interface AnswerContext {
  cwd: string;
  interactive: boolean;
}

export interface AnswerResult {
  answers: Record<string, Answer>;
  /** Messages for stderr; none of them stops the run. */
  warnings: string[];
}

/** `promptFn` is injected so the whole dialogue runs in tests without a TTY. */
export async function resolveAnswers(
  manifest: TemplateManifest,
  input: SetupInput,
  promptFn: PromptFn,
  ctx: AnswerContext,
): Promise<AnswerResult> {
  const answers: Record<string, Answer> = {};
  const warnings: string[] = [];
  const missing: string[] = [];

  for (const key of unknownFlags(input.flags)) {
    warnings.push(`Unknown flag --${key}; ignoring it.`);
  }

  for (const field of FIELD_CATALOG) {
    if (!manifest.fields.includes(field.key)) {
      const ignored = [
        ...(isSupplied(field, input) ? [field.flag] : []),
        ...(field.companions ?? [])
          .filter((companion) => input.flags[companion.key] !== undefined)
          .map((companion) => companion.flag),
      ];
      for (const flag of ignored) {
        warnings.push(
          `${flag} does not apply to the "${manifest.name}" template; ignoring it.`,
        );
      }
      continue;
    }

    const supplied = suppliedValue(field, input);
    if (supplied !== undefined) {
      answers[field.key] = checkSupplied(field, supplied);
      continue;
    }

    const fallback = fieldDefault(field, {
      cwd: ctx.cwd,
      manifest,
      answers,
      flags: input.flags,
    });
    if (ctx.interactive && !field.flagOnly) {
      answers[field.key] = await ask(field, fallback, promptFn);
      continue;
    }
    if (fallback === undefined) {
      missing.push(field.flag);
      continue;
    }
    answers[field.key] = fallback;
  }

  if (missing.length > 0) {
    throw new SetupError(
      `No TTY, so nothing can be prompted for. Missing: ${missing.join(", ")}.\n` +
        `  Retry with: tf-doc-vault setup --template=${manifest.name} ${missing.join(" ")}`,
    );
  }

  return { answers, warnings };
}

export async function selectTemplate(
  scan: TemplateScan,
  requested: string | undefined,
  promptFn: PromptFn,
  ctx: { interactive: boolean },
): Promise<TemplateManifest> {
  const { templates } = scan;
  if (templates.length === 0) {
    throw new SetupError("No usable templates are bundled with this package.");
  }
  const available = templates.map((template) => template.name).join(", ");

  if (requested !== undefined) {
    const found = templates.find((template) => template.name === requested);
    if (found) return found;
    const broken = scan.unavailable.find((entry) => entry.name === requested);
    if (broken) {
      throw new SetupError(
        `Template "${requested}" is unavailable: ${broken.reason}`,
      );
    }
    throw new SetupError(
      `Unknown template: ${requested}\n  Available templates: ${available}`,
    );
  }

  if (!ctx.interactive) {
    throw new SetupError(
      `No TTY, so nothing can be prompted for. Missing: --template=<name>.\n` +
        `  Available templates: ${available}`,
    );
  }

  const chosen = await promptFn({
    key: "template",
    type: "select",
    message: "Which template do you want to use?",
    options: templates.map((template) => ({
      value: template.name,
      label: template.label,
      hint: template.name,
    })),
  });
  const found = templates.find((template) => template.name === chosen);
  if (!found) throw new SetupError(`Unknown template: ${String(chosen)}`);
  return found;
}

// ─── placeholders ───

/**
 * Every catalog placeholder starts empty, so a field the chosen template never
 * asks about is substituted away instead of leaving a literal `__NAME__` in the
 * scaffold. The two that would break the generated config when empty fall back
 * to the manifest.
 */
export function resolvePlaceholders(
  manifest: TemplateManifest,
  answers: Record<string, Answer>,
  extra: Record<string, string>,
): Record<string, string> {
  const placeholders: Record<string, string> = {};
  for (const field of FIELD_CATALOG) {
    for (const fill of field.fills ?? []) placeholders[fill.placeholder] = "";
  }
  return {
    ...placeholders,
    __DOCS_BASE__: manifest.base,
    __SECTION_NAV__: String(manifest.sectionNav),
    ...placeholderValues(manifest.fields, answers),
    ...extra,
  };
}

/** A template that does not ask about the source gets the published version. */
export function dependencyFlags(
  manifest: TemplateManifest,
  answers: Record<string, Answer>,
  flags: ParsedArgs["flags"],
): ParsedArgs["flags"] {
  if (!manifest.fields.includes("source")) return {};
  const out: ParsedArgs["flags"] = {};
  if (typeof answers.source === "string") out.source = answers.source;
  for (const key of ["dev", "file-path", "ref", "git-url"]) {
    const value = flags[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function sourceWarnings(
  manifest: TemplateManifest,
  source: string,
  flags: ParsedArgs["flags"],
): string[] {
  if (!manifest.fields.includes("source")) return [];
  const warnings: string[] = [];
  if (
    source !== "git" &&
    (flags.ref !== undefined || flags["git-url"] !== undefined)
  ) {
    warnings.push(
      `--ref/--git-url are ignored unless --source=git (current source: ${source}).`,
    );
  }
  if (source !== "file" && flags["file-path"] !== undefined) {
    warnings.push(
      `--file-path is ignored unless --source=file (current source: ${source}).`,
    );
  }
  return warnings;
}

// ─── host repository integration ───

export function docsScripts(docsPath: string): Record<string, string> {
  return {
    "docs:dev": `vitepress dev ${docsPath}`,
    "docs:build": `vitepress build ${docsPath}`,
    "docs:validate": `tf-doc-vault validate --root=${docsPath}`,
    "docs:normalize": `tf-doc-vault normalize --root=${docsPath}`,
    "docs:fix": `tf-doc-vault fix --root=${docsPath}`,
    "docs:lf": `tf-doc-vault ensure-lf --root=${docsPath}`,
    "docs:print": `tf-doc-vault print --root=${docsPath}`,
    "docs:export-pdf": `tf-doc-vault export-pdf --root=${docsPath}`,
    "docs:import-confluence": "tf-doc-vault import-confluence",
  };
}

export function gitignoreEntries(docsPath: string): string[] {
  return [`${docsPath}/.vitepress/dist/`, `${docsPath}/.vitepress/cache/`];
}

export function updatePackageJson(dir: string, docsPath: string): void {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  ⚠ package.json not found; scripts not added.");
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = pkg.scripts ?? {};
  let added = 0;
  for (const [key, value] of Object.entries(docsScripts(docsPath))) {
    if (!(key in scripts)) {
      scripts[key] = value;
      added++;
    }
  }
  if (added === 0) {
    console.log("  package.json: scripts already present; skipped.");
    return;
  }
  pkg.scripts = scripts;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`  package.json updated (+${added} scripts)`);
}

export interface HostPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * A host may legitimately keep a peer in `dependencies` (an application repo
 * already shipping vue), so both blocks count as declared and an existing range
 * is never rewritten.
 */
export function missingDependencies(
  peers: Record<string, string>,
  host: HostPackageJson,
): Record<string, string> {
  const missing: Record<string, string> = {};
  for (const [name, range] of Object.entries(peers).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (host.dependencies?.[name] !== undefined) continue;
    if (host.devDependencies?.[name] !== undefined) continue;
    missing[name] = range;
  }
  return missing;
}

export function updateDevDependencies(
  dir: string,
  peers: Record<string, string>,
): void {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  ⚠ package.json not found; dependencies not added.");
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as HostPackageJson;
  const missing = missingDependencies(peers, pkg);
  const added = Object.keys(missing).length;
  if (added === 0) {
    console.log(
      "  package.json: documentation dependencies already present; skipped.",
    );
    return;
  }
  pkg.devDependencies = Object.fromEntries(
    Object.entries({ ...pkg.devDependencies, ...missing }).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`  package.json updated (+${added} devDependencies)`);
}

/**
 * The scaffolded folder needs `type: module` of its own: the host repo may be
 * CommonJS and the VitePress config is ESM.
 */
export function writeMinimalPackageJson(dir: string): void {
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) return;
  fs.writeFileSync(
    pkgPath,
    JSON.stringify({ private: true, type: "module" }, null, 2) + "\n",
    "utf-8",
  );
  console.log(`  ${path.basename(dir)}/package.json created`);
}

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const HOIST_KEY = "publicHoistPattern";
const BUILDS_KEY = "allowBuilds";

/** Unquoted, `*mermaid*` reads as a YAML alias and `a: b` as a nested key. */
const PLAIN_SCALAR = /^[A-Za-z0-9_][^:#]*$/;

function yamlScalar(value: string): string {
  return PLAIN_SCALAR.test(value) ? value : JSON.stringify(value);
}

export function renderWorkspaceSettings(settings: WorkspaceSettings): string {
  return [
    `${HOIST_KEY}:`,
    ...settings.publicHoistPattern.map(
      (pattern) => `  - ${yamlScalar(pattern)}`,
    ),
    `${BUILDS_KEY}:`,
    ...Object.entries(settings.allowBuilds).map(
      ([name, value]) => `  ${yamlScalar(name)}: ${String(value)}`,
    ),
    "",
  ].join("\n");
}

function keyLine(lines: string[], key: string): number {
  return lines.findIndex((line) => line.startsWith(`${key}:`));
}

function inlineValue(lines: string[], at: number, key: string): string {
  const rest = lines[at]!.slice(key.length + 1).trim();
  return rest.startsWith("#") ? "" : rest;
}

/** First line index past the block nested under `at`. */
function blockEnd(lines: string[], at: number): number {
  let end = at + 1;
  for (let i = at + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break;
    end = i + 1;
  }
  return end;
}

function blockIndent(lines: string[], at: number, end: number): string {
  for (let i = at + 1; i < end; i++) {
    const match = /^\s+/.exec(lines[i]!);
    if (match) return match[0];
  }
  return "  ";
}

/** Sequence items or mapping keys, whichever shape the block uses. */
function declaredEntries(lines: string[], at: number, end: number): string[] {
  const entries: string[] = [];
  for (let i = at + 1; i < end; i++) {
    const text = lines[i]!.trim();
    if (text === "") continue;
    if (text.startsWith("- ")) {
      entries.push(unquoteYaml(text.slice(2).trim()));
      continue;
    }
    const colon = text.indexOf(":");
    if (colon > 0) entries.push(unquoteYaml(text.slice(0, colon).trim()));
  }
  return entries;
}

function declaredIn(lines: string[], key: string): string[] {
  const at = keyLine(lines, key);
  if (at === -1) return [];
  return declaredEntries(lines, at, blockEnd(lines, at));
}

function appendEntries(lines: string[], key: string, entries: string[]): void {
  if (entries.length === 0) return;
  const at = keyLine(lines, key);
  if (at === -1) {
    lines.push(`${key}:`, ...entries.map((entry) => `  ${entry}`));
    return;
  }
  const end = blockEnd(lines, at);
  const indent = blockIndent(lines, at, end);
  lines.splice(end, 0, ...entries.map((entry) => `${indent}${entry}`));
}

export interface WorkspaceMerge {
  content: string;
  added: string[];
  /** The host writes these keys inline, which this merge cannot extend safely. */
  manual: boolean;
}

/**
 * Additive only: an entry the host already declares keeps its place and its
 * value, so a second run has nothing left to add.
 */
export function mergeWorkspaceSettings(
  existing: string,
  settings: WorkspaceSettings,
): WorkspaceMerge {
  const builds = Object.entries(settings.allowBuilds);
  if (existing.trim() === "") {
    return {
      content: renderWorkspaceSettings(settings),
      added: [...settings.publicHoistPattern, ...builds.map(([name]) => name)],
      manual: false,
    };
  }

  const lines = existing.replace(/\n+$/, "").split("\n");
  for (const key of [HOIST_KEY, BUILDS_KEY]) {
    const at = keyLine(lines, key);
    if (at !== -1 && inlineValue(lines, at, key) !== "") {
      return { content: existing, added: [], manual: true };
    }
  }

  const haveHoist = declaredIn(lines, HOIST_KEY);
  const missingHoist = settings.publicHoistPattern.filter(
    (pattern) => !haveHoist.includes(pattern),
  );
  const haveBuilds = declaredIn(lines, BUILDS_KEY);
  const missingBuilds = builds.filter(([name]) => !haveBuilds.includes(name));

  appendEntries(
    lines,
    HOIST_KEY,
    missingHoist.map((pattern) => `- ${yamlScalar(pattern)}`),
  );
  appendEntries(
    lines,
    BUILDS_KEY,
    missingBuilds.map(
      ([name, value]) => `${yamlScalar(name)}: ${String(value)}`,
    ),
  );

  return {
    content: `${lines.join("\n")}\n`,
    added: [...missingHoist, ...missingBuilds.map(([name]) => name)],
    manual: false,
  };
}

export function updatePnpmWorkspace(
  dir: string,
  settings: WorkspaceSettings,
): void {
  const file = path.join(dir, WORKSPACE_FILE);
  const existed = fs.existsSync(file);
  const merge = mergeWorkspaceSettings(
    existed ? fs.readFileSync(file, "utf-8") : "",
    settings,
  );
  if (merge.manual) {
    console.warn(
      `  ⚠ ${WORKSPACE_FILE} writes ${HOIST_KEY} or ${BUILDS_KEY} inline; merge this in by hand:\n` +
        renderWorkspaceSettings(settings)
          .trimEnd()
          .split("\n")
          .map((line) => `      ${line}`)
          .join("\n"),
    );
    return;
  }
  if (merge.added.length === 0) {
    console.log(`  ${WORKSPACE_FILE}: pnpm settings already present; skipped.`);
    return;
  }
  fs.writeFileSync(file, merge.content, "utf-8");
  console.log(
    `  ${WORKSPACE_FILE} ${existed ? "updated" : "created"} (+${merge.added.length} entries)`,
  );
}

export function updateGitignore(dir: string, docsPath: string): void {
  const gitignorePath = path.join(dir, ".gitignore");
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";
  const missing = gitignoreEntries(docsPath).filter(
    (entry) => !existing.includes(entry),
  );
  if (missing.length === 0) return;
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(
    gitignorePath,
    existing + prefix + missing.join("\n") + "\n",
    "utf-8",
  );
  console.log(`  .gitignore updated (+${missing.length} entries)`);
}

/**
 * pnpm honors workspace config only at the workspace root, so a scaffold placed
 * inside an existing workspace silently ignores its own `pnpm-workspace.yaml`
 * and the docs page renders blank with a dayjs default-export SyntaxError.
 */
export function warnIfEmbeddedInWorkspace(
  targetDir: string,
  ancestor: string | null,
): void {
  if (!ancestor) return;

  const relativeFolder =
    path.relative(path.dirname(ancestor), targetDir) ||
    path.basename(targetDir);
  const rule = "─".repeat(68);

  process.stderr.write(`
${rule}
⚠  Detected parent pnpm workspace:
   ${ancestor}

Because pnpm only honors workspace config at the workspace root, the
pnpm-workspace.yaml and .npmrc inside ${relativeFolder}/ will be
IGNORED. Vitepress will fail to load mermaid's CJS transitive deps and
the page will render blank with:

   "dayjs.min.js does not provide an export named 'default'"

To fix this, merge the following into your parent pnpm-workspace.yaml:

   packages:
     - ${relativeFolder}
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

Then re-run \`pnpm install\` from your monorepo root.

See README → "Embedding inside an existing pnpm workspace" for details.
${rule}
`);
}

/**
 * Pre-generate `pnpm-lock.yaml` before the scaffold's own first commit;
 * otherwise CI and Docker abort on ERR_PNPM_NO_LOCKFILE.
 */
function generateLockfile(dir: string): void {
  const result = spawnSync("pnpm", ["install", "--lockfile-only"], {
    cwd: dir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.stderr.write(
      "\n⚠  Could not pre-generate pnpm-lock.yaml. Run `pnpm install` and " +
        "commit the resulting pnpm-lock.yaml before pushing: CI and the " +
        "Docker build install with --frozen-lockfile and fail without it.\n",
    );
  }
}

function initGitRepo(dir: string): void {
  // `-c init.defaultBranch=main` rather than `git init -b` (git >= 2.28):
  // older git ignores the unknown key and still lands on whatever its own
  // compiled-in default is, which is what the documented push command, the CI
  // branch rules and Vercel's production deploy all assume is `main`.
  spawnSync("git", ["-c", "init.defaultBranch=main", "init", "-q"], {
    cwd: dir,
    stdio: "inherit",
  });
  spawnSync("git", ["add", "."], { cwd: dir, stdio: "inherit" });
  spawnSync(
    "git",
    ["commit", "-q", "-m", "Initial scaffold from @techfides/tf-doc-vault"],
    { cwd: dir, stdio: "inherit" },
  );
}

/** GitHub org this package's scaffolds are published under. */
export function originUrl(projectName: string): string {
  return `git@github.com:TechFides/${projectName}.git`;
}

/**
 * GitHub only reads workflows from `.github/workflows/` at a repo's root, so
 * inside an existing repo (the offers monorepo case) the CI workflow has to
 * land there instead of the offer subfolder. Never overwrites: a later offer
 * scaffolded into the same repo must not clobber CI tuning an earlier one (or
 * a human) already made.
 */
function placeCiWorkflow(gitRoot: string): void {
  const dest = path.join(gitRoot, ".github", "workflows", "ci.yml");
  if (fs.existsSync(dest)) {
    console.log(
      `  .github/workflows/ci.yml already present at the repo root; skipped.`,
    );
    return;
  }
  const source = path.join(BOILERPLATE_DIR, ".github", "workflows", "ci.yml");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  console.log(`  .github/workflows/ci.yml created at the repo root`);
}

const VERCEL_ANALYTICS_VERSION = "^2.0.1";

/**
 * Off leaves no trace, so enabling it is a patch of the freshly-copied
 * scaffold's own files rather than a placeholder: the dependency and the
 * theme wiring only exist when asked for.
 */
export function enableAnalytics(targetDir: string): void {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
  };
  pkg.dependencies = Object.fromEntries(
    Object.entries({
      ...pkg.dependencies,
      "@vercel/analytics": VERCEL_ANALYTICS_VERSION,
    }).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");

  const themePath = path.join(targetDir, "docs/.vitepress/theme/index.ts");
  const theme = fs.readFileSync(themePath, "utf-8");
  const injected = theme.replace(
    /\n(export default createTheme)/,
    '\nimport { inject } from "@vercel/analytics";\n' +
      "\n" +
      // Vite's SSR pass has no `window`; `import.meta.env.SSR` would need
      // `vite/client` in the scaffold's tsconfig `types` to typecheck.
      'if (typeof window !== "undefined") inject();\n' +
      "\n$1",
  );
  if (injected === theme) {
    throw new SetupError(
      `Could not wire up @vercel/analytics: "export default createTheme" not found in ${themePath}`,
    );
  }
  fs.writeFileSync(themePath, injected, "utf-8");
  console.log("  @vercel/analytics enabled (dependency + theme wiring)");
}

// ─── output ───

const COLUMN = 26;

function pad(text: string): string {
  return text.padEnd(COLUMN);
}

/** Printed paths are shell commands, so they use forward slashes everywhere. */
function posix(value: string): string {
  return value.split(path.sep).join("/");
}

/** A multi-line cell (a manifest error) keeps every line inside the column. */
export function table(rows: [string, string][]): string[] {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  const indent = " ".repeat(2 + width);
  return rows.map(([label, text]) => {
    const [first = "", ...rest] = text.split("\n");
    return [
      `  ${label.padEnd(width)}${first}`,
      ...rest.map((line) => `${indent}${line.trim()}`),
    ].join("\n");
  });
}

/** Scans on its own, so `--help` works before any manifest has been read. */
function usage(exitCode = 0): never {
  const { templates, unavailable } = scanTemplates();
  const positional = FIELD_CATALOG.filter((field) =>
    field.flag.startsWith("["),
  );
  const options = FIELD_CATALOG.filter(
    (field) => !field.flag.startsWith("[") && !field.flagOnly,
  );
  const flagOnly = FIELD_CATALOG.filter((field) => field.flagOnly);
  const rowsFor = (fields: FieldSpec[]): [string, string][] =>
    fields.flatMap((field): [string, string][] => [
      [field.flag, field.help],
      ...(field.companions ?? []).map((companion): [string, string] => [
        companion.flag,
        companion.help,
      ]),
    ]);
  const lines = [
    "",
    "tf-doc-vault setup [name] [options]",
    "",
    "Scaffold documentation from one of the bundled templates. Every prompt has an",
    "equivalent flag. Without a TTY the wizard never prompts, so each required value",
    "has to arrive as a flag.",
    "",
    "Which options apply is up to the chosen template; the rest are ignored with a",
    "warning.",
    "",
    "Templates:",
    ...table(templates.map((template) => [template.name, template.label])),
    ...(unavailable.length === 0
      ? []
      : [
          "",
          "Unavailable templates:",
          ...table(unavailable.map((entry) => [entry.name, entry.reason])),
        ]),
    "",
    "Arguments:",
    ...table(positional.map((field) => [field.flag, field.help])),
    "",
    "Options:",
    ...table([
      ["--template=<name>", "Template to scaffold, from the list above"],
      ...rowsFor(options),
      ["--help, -h", "Print this help and exit"],
    ]),
    "",
    "Never prompted for, pass them only when you need them:",
    ...table(rowsFor(flagOnly)),
    "",
    "  --source and the flags around it are for maintainers developing this",
    "  package against a local checkout.",
    "",
  ];
  console.log(lines.join("\n"));
  process.exit(exitCode);
}

function printSummary(
  manifest: TemplateManifest,
  answers: Record<string, Answer>,
  targetDir: string,
  dependency: string,
): void {
  console.log(`\nScaffolding from template "${manifest.name}":`);
  console.log(`  ${pad("target")}${targetDir}`);
  for (const field of FIELD_CATALOG) {
    if (!manifest.fields.includes(field.key)) continue;
    const value = answers[field.key];
    console.log(
      `  ${pad(field.key)}${value === "" ? "(empty)" : String(value)}`,
    );
  }
  if (manifest.fields.includes("source")) {
    console.log(`  ${pad("dependency")}${dependency}`);
  }
  console.log();
}

export function nextSteps(ctx: {
  manifest: TemplateManifest;
  answers: Record<string, Answer>;
  targetDir: string;
  cwd: string;
  dependency: string;
  gitInitialized: boolean;
}): string {
  const relative = posix(path.relative(ctx.cwd, ctx.targetDir)) || ".";
  // The host-driven flavour runs its scripts from the repository root, every
  // other one is told to cd into the target first, so every path printed below
  // is relative to wherever that leaves the reader standing.
  const insideTarget = !ctx.manifest.host.packageJsonScripts;
  const fromHere = (entry: string): string =>
    insideTarget ? entry : posix(path.join(relative, entry));
  const blocks: string[] = [];

  if (ctx.dependency.startsWith("file:")) {
    // Printed before the cd instruction, so it is relative to the cwd.
    blocks.push(
      `If @techfides/tf-doc-vault is not built yet, run once:
  (cd ${posix(path.relative(ctx.cwd, PACKAGE_DIR)) || "."} && pnpm install)
  # → installs deps and builds dist/ (via the "prepare" hook)`,
    );
  }

  if (ctx.manifest.host.packageJsonScripts) {
    blocks.push(`Next steps:

  1) Install the documentation dependencies and start a local preview:
       pnpm install && pnpm docs:dev
     The install also writes the lockfile entries for them; commit it.

  2) Build the documentation locally:
       pnpm docs:build`);
  } else {
    blocks.push(`Next steps:
  cd ${relative}
  pnpm install
  pnpm docs:dev          # http://localhost:5173`);
  }

  if (ctx.manifest.target.mode === "new-folder" && !ctx.gitInitialized) {
    blocks.push(`The documentation lives inside the surrounding repository.
Commit it together with your other changes:
  git add ${fromHere(".")}
  git commit -m "docs: add the ${relative} documentation"
  git push`);
  }

  // A template can exclude the deploy files, so the hint follows what landed.
  if (fs.existsSync(path.join(ctx.targetDir, "vercel.json"))) {
    blocks.push(`Deploy (Vercel, via git integration):
  Import the repo in the Vercel dashboard, Root Directory = this folder.
  Set BASIC_AUTH_USER / BASIC_AUTH_PASS as project env vars for a password;
  leave them unset to keep the site public.`);
  }

  if (ctx.gitInitialized && typeof ctx.answers.name === "string") {
    blocks.push(`Publish the new repository:
  git remote add origin ${originUrl(ctx.answers.name)}
  git push -u origin main`);
  }

  return blocks.join("\n\n");
}

// ─── prompt layer ───

const SHOW_CURSOR = "\u001B[?25h";

/**
 * Ctrl+D on an empty answer closes clack's readline instead of producing its
 * cancel symbol, so `isCancel` never fires: the prompt stays pending and node
 * exits 13 on the unsettled top-level await. An open prompt holds stdin
 * flowing, so `beforeExit` or an stdin EOF both prove nothing can answer it any
 * more. Cancelling here also has to undo clack's cursor hiding.
 */
function abandonedPrompt(): { abandoned: Promise<never>; release: () => void } {
  let cancel = (): void => {};
  const abandoned = new Promise<never>((_, reject) => {
    cancel = (): void => {
      if (process.stdout.isTTY) process.stdout.write(SHOW_CURSOR);
      reject(new CancelledError());
    };
    process.once("beforeExit", cancel);
    process.stdin.once("end", cancel);
  });
  return {
    abandoned,
    release: (): void => {
      process.off("beforeExit", cancel);
      process.stdin.off("end", cancel);
    },
  };
}

/**
 * clack runs a confirm or select message through its guide-prefixing wrapper,
 * so a second line lands under the bar on its own. A text prompt writes the
 * message verbatim, so there the line has to carry the bar itself.
 */
function hinted(request: PromptRequest, ownBar: boolean): string {
  if (!request.hint) return request.message;
  const bar = ownBar ? `${styleText("gray", clack.S_BAR)}  ` : "";
  return `${request.message}\n${bar}${styleText("dim", request.hint)}`;
}

async function askClack(request: PromptRequest): Promise<Answer> {
  let result: unknown;
  if (request.type === "confirm") {
    result = await clack.confirm({
      message: hinted(request, false),
      initialValue:
        typeof request.initialValue === "boolean" ? request.initialValue : true,
    });
  } else if (request.type === "select") {
    result = await clack.select<string>({
      message: hinted(request, false),
      options: request.options ?? [],
      initialValue:
        typeof request.initialValue === "string"
          ? request.initialValue
          : undefined,
    });
  } else {
    result = await clack.text({
      message: hinted(request, true),
      initialValue:
        typeof request.initialValue === "string"
          ? request.initialValue
          : undefined,
      validate: (value) => request.validate?.(value ?? ""),
    });
  }
  if (clack.isCancel(result)) throw new CancelledError();
  return result as Answer;
}

async function clackPrompt(request: PromptRequest): Promise<Answer> {
  const { abandoned, release } = abandonedPrompt();
  try {
    return await Promise.race([askClack(request), abandoned]);
  } finally {
    release();
  }
}

// ─── entry point ───

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  const { positional, flags } = parseArgs(argv);
  // Before the scan, so a broken template folder cannot take --help down.
  if (flags.help === true || argv.includes("-h")) usage(0);

  const cwd = process.cwd();
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (interactive) clack.intro("tf-doc-vault setup");

  const scan = scanTemplates();
  const requested = templateFlag(flags);
  for (const entry of scan.unavailable) {
    // The requested one is raised as an error below, with the same reason.
    if (entry.name === requested) continue;
    process.stderr.write(
      `⚠  Template "${entry.name}" is unavailable: ${entry.reason}\n`,
    );
  }

  const manifest = await selectTemplate(scan, requested, clackPrompt, {
    interactive,
  });
  const { answers, warnings } = await resolveAnswers(
    manifest,
    { projectName: positional[0], flags },
    clackPrompt,
    { cwd, interactive },
  );
  for (const warning of warnings) process.stderr.write(`⚠  ${warning}\n`);

  const depFlags = dependencyFlags(manifest, answers, flags);
  const source = resolveSource(depFlags);
  for (const warning of sourceWarnings(manifest, source, flags)) {
    process.stderr.write(`⚠  ${warning}\n`);
  }

  const hostRepo = detectHostRepo(cwd);
  const plan = resolveCopyPlan(manifest, answers, {
    cwd,
    gitRoot: hostRepo?.root ?? null,
  });
  const targetDir = plan.target;
  if (manifest.target.mode === "new-folder" && fs.existsSync(targetDir)) {
    throw new SetupError(`Target already exists: ${targetDir}`);
  }
  const dependency = resolveDependencyValue(depFlags, targetDir);

  printSummary(manifest, answers, targetDir, dependency);

  const { copied, skipped } = applyCopyPlan(plan);
  console.log(
    `  copied: ${copied} file(s), skipped: ${skipped} (already exist)`,
  );

  // GitHub only reads workflows from the real repo root, not the offer
  // subfolder `resolveCopyPlan` excluded `.github` from above.
  if (hostRepo && manifest.target.mode === "new-folder") {
    placeCiWorkflow(hostRepo.root);
  }

  replacePlaceholders(
    targetDir,
    resolvePlaceholders(manifest, answers, {
      __VITEPRESS_COMMON_DEP__: dependency,
      __DATE__: new Date().toISOString().slice(0, 10),
    }),
  );

  // Read before the host steps: `host.pnpmWorkspace` writes a workspace file of
  // its own into the cwd, which is an ancestor of the target.
  const ancestorWorkspace = findAncestorFile(targetDir, WORKSPACE_FILE);

  const docsPath = path.posix.join(
    path.relative(cwd, targetDir).split(path.sep).join("/"),
    "docs",
  );
  if (manifest.host.minimalPackageJson) writeMinimalPackageJson(targetDir);
  if (manifest.host.packageJsonScripts) updatePackageJson(cwd, docsPath);
  if (manifest.host.devDependencies) {
    updateDevDependencies(cwd, documentationDependencies(depFlags, cwd));
  }
  if (manifest.host.pnpmWorkspace) {
    updatePnpmWorkspace(cwd, boilerplateWorkspaceSettings());
  }
  if (manifest.host.gitignore) updateGitignore(cwd, docsPath);

  if (manifest.workspaceWarning) {
    warnIfEmbeddedInWorkspace(targetDir, ancestorWorkspace);
  }
  if (answers.analytics === true) enableAnalytics(targetDir);

  // An embedded scaffold shares the parent workspace's lockfile at its root.
  // Runs after `enableAnalytics`: the lockfile must reflect every dependency
  // the scaffold ends up with, including the one analytics adds.
  if (manifest.lockfile && !ancestorWorkspace) generateLockfile(targetDir);

  const gitInitialized = manifest.git.init && answers.git !== false;
  if (gitInitialized) initGitRepo(targetDir);

  const epilogue = nextSteps({
    manifest,
    answers,
    targetDir,
    cwd,
    dependency,
    gitInitialized,
  });
  console.log(`\n✓ Done.\n\n${epilogue}\n`);
  if (interactive) clack.outro("Happy documenting.");
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof CancelledError) {
      process.stderr.write("✗ Cancelled.\n");
      process.exit(1);
    }
    if (error instanceof SetupError) {
      process.stderr.write(`✗ ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

// Run main() only when invoked as a CLI, not when a test imports the exported
// helpers. realpath resolves the bin symlink so node_modules/.bin still matches.
const invokedAsScript = ((): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedAsScript) await main();
