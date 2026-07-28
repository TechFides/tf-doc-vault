/**
 * Copy plan for the bundled scaffolds: reads the manifests in `templates/*`,
 * works out which `boilerplate/` paths each one wants, and lays the sources
 * down into the target directory.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDir, type CopyDirResult, type ParsedArgs } from "./utils.js";

// gitlab, not github: the scaffold's CI token `insteadOf` rewrite only covers gitlab.com.
const GITLAB_HOST = "gitlab.com";
const GITLAB_GROUP = "techfides/tf-analysis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/cli → package root
export const PACKAGE_DIR = path.resolve(__dirname, "..", "..");
export const BOILERPLATE_DIR = path.join(PACKAGE_DIR, "boilerplate");
export const TEMPLATES_DIR = path.join(PACKAGE_DIR, "templates");

/** Carries the manifest, so it is always excluded from the copy. */
const MANIFEST_FILE = "_template.md";

/** Answer key that decides whether `deployFiles` are copied. */
const DEPLOY_FILES_FIELD = "deploy-files";

export type Answer = string | boolean | undefined;

export interface TemplateManifest {
  name: string;
  label: string;
  target: { mode: "new-folder" | "subfolder"; path?: string };
  base: string;
  sectionNav: boolean;
  fields: string[];
  defaults: Record<string, string | boolean>;
  exclude: string[];
  deployFiles: string[];
  renames: Record<string, string>;
  host: {
    packageJsonScripts: boolean;
    gitignore: boolean;
    minimalPackageJson: boolean;
  };
  git: { init: boolean };
  lockfile: boolean;
  workspaceWarning: boolean;
  /** Prose body of the manifest file. */
  description: string;
  /** Absolute path of the template folder. */
  dir: string;
}

export interface CopyPlan {
  sources: string[];
  exclude: string[];
  renames: Record<string, string>;
  placeholders: Record<string, string>;
  target: string;
}

// ─── manifest frontmatter ───

type YamlValue = string | boolean | YamlValue[] | { [key: string]: YamlValue };

interface YamlLine {
  indent: number;
  text: string;
}

function stripComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "#" && (i === 0 || /\s/.test(line[i - 1]!))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function tokenizeYaml(source: string): YamlLine[] {
  const lines: YamlLine[] = [];
  for (const raw of source.split("\n")) {
    const stripped = stripComment(raw);
    if (stripped.trim() === "") continue;
    lines.push({
      indent: stripped.length - stripped.trimStart().length,
      text: stripped.trim(),
    });
  }
  return lines;
}

function parseYamlScalar(raw: string): YamlValue {
  if (raw === "{}") return {};
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => parseYamlScalar(item.trim()));
  }
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"));
  if (quoted && raw.length >= 2) return raw.slice(1, -1);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function parseYamlSequence(
  lines: YamlLine[],
  start: number,
  indent: number,
): [YamlValue[], number] {
  const items: YamlValue[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.indent !== indent || !line.text.startsWith("- ")) break;
    items.push(parseYamlScalar(line.text.slice(2).trim()));
    i++;
  }
  return [items, i];
}

function parseYamlMap(
  lines: YamlLine[],
  start: number,
  indent: number,
): [Record<string, YamlValue>, number] {
  const map: Record<string, YamlValue> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.indent < indent) break;
    if (line.indent > indent) {
      throw new Error(`unexpected indentation at "${line.text}"`);
    }
    const colon = line.text.indexOf(":");
    if (colon === -1)
      throw new Error(`expected "key: value" at "${line.text}"`);
    const key = line.text.slice(0, colon).trim();
    const inlineValue = line.text.slice(colon + 1).trim();
    i++;
    if (inlineValue !== "") {
      map[key] = parseYamlScalar(inlineValue);
      continue;
    }
    const next = lines[i];
    if (!next || next.indent <= indent) {
      map[key] = "";
      continue;
    }
    if (next.text.startsWith("- ")) {
      const [items, nextIndex] = parseYamlSequence(lines, i, next.indent);
      map[key] = items;
      i = nextIndex;
    } else {
      const [nested, nextIndex] = parseYamlMap(lines, i, next.indent);
      map[key] = nested;
      i = nextIndex;
    }
  }
  return [map, i];
}

// ─── manifest validation ───

const TARGET_MODES = ["new-folder", "subfolder"] as const;

const KNOWN_KEYS = [
  "name",
  "label",
  "target",
  "base",
  "sectionNav",
  "fields",
  "defaults",
  "exclude",
  "deployFiles",
  "renames",
  "host",
  "git",
  "lockfile",
  "workspaceWarning",
];
const REQUIRED_KEYS = [
  "name",
  "label",
  "target",
  "base",
  "sectionNav",
  "fields",
  "host",
  "git",
  "lockfile",
  "workspaceWarning",
];
const TARGET_KEYS = ["mode", "path"];
const HOST_KEYS = ["packageJsonScripts", "gitignore", "minimalPackageJson"];
const GIT_KEYS = ["init"];

function fail(templateName: string, message: string): never {
  throw new Error(`${templateName}/${MANIFEST_FILE}: ${message}`);
}

function rejectUnknownKeys(
  templateName: string,
  where: string,
  value: Record<string, YamlValue>,
  known: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!known.includes(key))
      fail(templateName, `unknown key "${where}${key}"`);
  }
}

function asMap(
  templateName: string,
  key: string,
  value: YamlValue | undefined,
): Record<string, YamlValue> {
  if (
    value === undefined ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    fail(templateName, `"${key}" must be a mapping`);
  }
  return value;
}

function asStringList(
  templateName: string,
  key: string,
  value: YamlValue | undefined,
): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(templateName, `"${key}" must be a list`);
  return value.map((item) => {
    if (typeof item !== "string")
      fail(templateName, `"${key}" must be strings`);
    return item;
  });
}

function asString(
  templateName: string,
  key: string,
  value: YamlValue | undefined,
): string {
  if (typeof value !== "string")
    fail(templateName, `"${key}" must be a string`);
  return value;
}

function asBoolean(
  templateName: string,
  key: string,
  value: YamlValue | undefined,
): boolean {
  if (typeof value !== "boolean") {
    fail(templateName, `"${key}" must be true or false`);
  }
  return value;
}

function asStringMap(
  templateName: string,
  key: string,
  value: YamlValue | undefined,
): Record<string, string> {
  if (value === undefined) return {};
  const map = asMap(templateName, key, value);
  const out: Record<string, string> = {};
  for (const [from, to] of Object.entries(map)) {
    if (typeof to !== "string")
      fail(templateName, `"${key}.${from}" must be a string`);
    out[from] = to;
  }
  return out;
}

function asDefaults(
  templateName: string,
  value: YamlValue | undefined,
): Record<string, string | boolean> {
  if (value === undefined) return {};
  const map = asMap(templateName, "defaults", value);
  const out: Record<string, string | boolean> = {};
  for (const [key, entry] of Object.entries(map)) {
    if (typeof entry !== "string" && typeof entry !== "boolean") {
      fail(templateName, `"defaults.${key}" must be a scalar`);
    }
    out[key] = entry;
  }
  return out;
}

/**
 * `copyDir` filters excluded entries only at the root of each source, so a
 * nested path would silently copy anyway. Reject it instead.
 */
function checkBoilerplateEntries(
  templateName: string,
  key: string,
  entries: string[],
  boilerplateDir: string,
): void {
  for (const entry of entries) {
    if (entry.includes("/")) {
      fail(
        templateName,
        `"${key}" takes top-level boilerplate entries only, got "${entry}"`,
      );
    }
    if (!fs.existsSync(path.join(boilerplateDir, entry))) {
      fail(
        templateName,
        `"${key}" lists "${entry}", which is not in the boilerplate`,
      );
    }
  }
}

export function parseTemplateManifest(
  source: string,
  templateName: string,
  dir: string,
  boilerplateDir: string,
): TemplateManifest {
  const match = /^---\s*\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(source);
  if (!match) fail(templateName, "missing YAML frontmatter block");

  let raw: Record<string, YamlValue>;
  try {
    raw = parseYamlMap(tokenizeYaml(match[1]!), 0, 0)[0];
  } catch (error) {
    fail(templateName, (error as Error).message);
  }

  rejectUnknownKeys(templateName, "", raw, KNOWN_KEYS);
  for (const key of REQUIRED_KEYS) {
    if (!(key in raw)) fail(templateName, `missing key "${key}"`);
  }

  const name = asString(templateName, "name", raw.name);
  if (name !== templateName) {
    fail(
      templateName,
      `"name" is "${name}" but the folder is "${templateName}"`,
    );
  }

  const target = asMap(templateName, "target", raw.target);
  rejectUnknownKeys(templateName, "target.", target, TARGET_KEYS);
  const mode = asString(templateName, "target.mode", target.mode);
  if (!TARGET_MODES.includes(mode as (typeof TARGET_MODES)[number])) {
    fail(
      templateName,
      `"target.mode" must be one of ${TARGET_MODES.join(" | ")}`,
    );
  }
  const targetPath =
    target.path === undefined
      ? undefined
      : asString(templateName, "target.path", target.path);
  if (mode === "subfolder" && !targetPath) {
    fail(templateName, `"target.mode: subfolder" needs "target.path"`);
  }

  const host = asMap(templateName, "host", raw.host);
  rejectUnknownKeys(templateName, "host.", host, HOST_KEYS);
  const git = asMap(templateName, "git", raw.git);
  rejectUnknownKeys(templateName, "git.", git, GIT_KEYS);

  const exclude = asStringList(templateName, "exclude", raw.exclude);
  const deployFiles = asStringList(
    templateName,
    "deployFiles",
    raw.deployFiles,
  );
  checkBoilerplateEntries(templateName, "exclude", exclude, boilerplateDir);
  checkBoilerplateEntries(
    templateName,
    "deployFiles",
    deployFiles,
    boilerplateDir,
  );

  const renames = asStringMap(templateName, "renames", raw.renames);
  for (const from of Object.keys(renames)) {
    if (!fs.existsSync(path.join(boilerplateDir, from))) {
      fail(
        templateName,
        `"renames" maps "${from}", which is not in the boilerplate`,
      );
    }
  }

  return {
    name,
    label: asString(templateName, "label", raw.label),
    target: { mode: mode as (typeof TARGET_MODES)[number], path: targetPath },
    base: asString(templateName, "base", raw.base),
    sectionNav: asBoolean(templateName, "sectionNav", raw.sectionNav),
    fields: asStringList(templateName, "fields", raw.fields),
    defaults: asDefaults(templateName, raw.defaults),
    exclude,
    deployFiles,
    renames,
    host: {
      packageJsonScripts: asBoolean(
        templateName,
        "host.packageJsonScripts",
        host.packageJsonScripts,
      ),
      gitignore: asBoolean(templateName, "host.gitignore", host.gitignore),
      minimalPackageJson: asBoolean(
        templateName,
        "host.minimalPackageJson",
        host.minimalPackageJson,
      ),
    },
    git: { init: asBoolean(templateName, "git.init", git.init) },
    lockfile: asBoolean(templateName, "lockfile", raw.lockfile),
    workspaceWarning: asBoolean(
      templateName,
      "workspaceWarning",
      raw.workspaceWarning,
    ),
    description: (match[2] ?? "").trim(),
    dir,
  };
}

export interface ScaffoldDirs {
  templatesDir: string;
  boilerplateDir: string;
}

/** Source of truth for the available templates. */
export function listTemplates(
  dirs: ScaffoldDirs = defaultDirs(),
): TemplateManifest[] {
  const names = fs
    .readdirSync(dirs.templatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return names.map((name) => {
    const dir = path.join(dirs.templatesDir, name);
    const manifestPath = path.join(dir, MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) {
      fail(name, "missing manifest file");
    }
    return parseTemplateManifest(
      fs.readFileSync(manifestPath, "utf-8"),
      name,
      dir,
      dirs.boilerplateDir,
    );
  });
}

function defaultDirs(): ScaffoldDirs {
  return { templatesDir: TEMPLATES_DIR, boilerplateDir: BOILERPLATE_DIR };
}

export function resolveCopyPlan(
  manifest: TemplateManifest,
  answers: Record<string, Answer>,
  ctx: { cwd?: string; boilerplateDir?: string } = {},
): CopyPlan {
  const cwd = ctx.cwd ?? process.cwd();
  const boilerplateDir = ctx.boilerplateDir ?? BOILERPLATE_DIR;

  const exclude = [MANIFEST_FILE, ...manifest.exclude];
  if (!answers[DEPLOY_FILES_FIELD]) exclude.push(...manifest.deployFiles);

  let target: string;
  if (manifest.target.mode === "subfolder") {
    target = path.resolve(cwd, manifest.target.path!);
  } else {
    const name = answers.name;
    if (typeof name !== "string" || name === "") {
      throw new Error(`Template "${manifest.name}" needs a project name.`);
    }
    target = path.resolve(cwd, name);
  }

  return {
    sources: [boilerplateDir, manifest.dir],
    exclude,
    renames: { ...manifest.renames },
    placeholders: {
      __DOCS_BASE__: manifest.base,
      __SECTION_NAV__: String(manifest.sectionNav),
    },
    target,
  };
}

/**
 * `npm pack` strips `.npmrc` and `.gitignore` from published packages, so the
 * boilerplate ships them as `_npmrc` / `_gitignore` and renames them on copy.
 */
export function consumerName(boilerplateEntry: string): string {
  if (boilerplateEntry === "_npmrc") return ".npmrc";
  if (boilerplateEntry === "_gitignore") return ".gitignore";
  if (boilerplateEntry === "_pnpm-workspace.yaml") return "pnpm-workspace.yaml";
  return boilerplateEntry;
}

/**
 * Compose the sources in a staging directory with overwrite, so a later source
 * wins, then copy the result to the target once with `idempotent: true`.
 * Layering idempotent copies straight into the target would give the FIRST
 * source precedence and would count collisions between sources as files that
 * already existed in the consumer repo.
 */
export function applyCopyPlan(plan: CopyPlan): CopyDirResult {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "tf-doc-vault-"));
  try {
    for (const source of plan.sources) {
      copyDir(source, staging, {
        idempotent: false,
        renameEntry: consumerName,
        exclude: plan.exclude,
      });
    }
    for (const [from, to] of Object.entries(plan.renames)) {
      const fromPath = path.join(staging, from);
      if (!fs.existsSync(fromPath)) {
        throw new Error(`Cannot rename "${from}": the copy plan excluded it.`);
      }
      const toPath = path.join(staging, to);
      fs.mkdirSync(path.dirname(toPath), { recursive: true });
      fs.renameSync(fromPath, toPath);
    }
    return copyDir(staging, plan.target, { idempotent: true });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

// ─── dependency source of the generated project ───

function packageVersion(): string {
  try {
    const pkgPath = path.join(PACKAGE_DIR, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

export function resolveSource(flags: ParsedArgs["flags"]): string {
  return String(flags.source ?? (flags.dev ? "file" : "npm"));
}

/**
 * The `@techfides/tf-doc-vault` dependency spec written into the scaffold.
 * Defaults to the published npm version so CI and the Docker build need no git
 * credentials. `ctx` is injectable for tests.
 */
export function resolveDependencyValue(
  flags: ParsedArgs["flags"],
  targetDir: string,
  ctx: { version: string; packageDir: string } = {
    version: packageVersion(),
    packageDir: PACKAGE_DIR,
  },
): string {
  const source = resolveSource(flags);
  // typeof, not ??: a bare value-flag (`--ref` with no `=value`) parses as
  // boolean `true`, which `??` would interpolate as the literal "true".
  const ref = typeof flags.ref === "string" ? flags.ref : `v${ctx.version}`;
  const gitUrl =
    typeof flags["git-url"] === "string"
      ? flags["git-url"]
      : "git+ssh://git@github.com/techfides/tf-doc-vault.git";

  switch (source) {
    case "npm":
      return ctx.version;
    case "git":
      return `${gitUrl}#${ref}`;
    case "file": {
      const target =
        typeof flags["file-path"] === "string"
          ? flags["file-path"]
          : path.relative(targetDir, ctx.packageDir);
      return `file:${target}`;
    }
    default:
      console.error(`✗ Invalid --source: ${source}. Use npm | git | file.`);
      process.exit(1);
  }
}

export function originUrl(projectName: string): string {
  return `git@${GITLAB_HOST}:${GITLAB_GROUP}/${projectName}.git`;
}
