/**
 * Template manifests, the wizard's field catalog, and the copy plan. The
 * catalog lives here so the manifest validator can check `fields:` and
 * `defaults:` against it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SetupError,
  copyDir,
  type CopyDirResult,
  type ParsedArgs,
} from "./utils.js";
import { detectHostRepo } from "./git-context.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/cli → package root
export const PACKAGE_DIR = path.resolve(__dirname, "..", "..");
export const BOILERPLATE_DIR = path.join(PACKAGE_DIR, "boilerplate");
export const TEMPLATES_DIR = path.join(PACKAGE_DIR, "templates");

const MANIFEST_FILE = "_template.md";

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
  renames: Record<string, string>;
  host: {
    packageJsonScripts: boolean;
    devDependencies: boolean;
    gitignore: boolean;
    minimalPackageJson: boolean;
    pnpmWorkspace: boolean;
  };
  git: { init: boolean };
  lockfile: boolean;
  workspaceWarning: boolean;
  description: string;
  /** Absolute path of the template folder. */
  dir: string;
}

export interface CopyPlan {
  sources: string[];
  exclude: string[];
  renames: Record<string, string>;
  target: string;
}

// ─── field catalog ───

export type FieldType = "text" | "select" | "confirm";

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

export interface PlaceholderFill {
  placeholder: string;
  format?: (value: string) => string;
}

export interface CompanionFlag {
  key: string;
  flag: string;
  help: string;
}

export interface DefaultContext {
  cwd: string;
  manifest: TemplateManifest;
  /** Answers resolved so far, in catalog order. */
  answers: Record<string, Answer>;
  /** Raw command line, so a default can read a companion flag. */
  flags: ParsedArgs["flags"];
}

export interface FieldSpec {
  key: string;
  type: FieldType;
  prompt: string;
  /** One line under the prompt saying what the value does. */
  hint?: string;
  /** Square brackets mark the positional form. */
  flag: string;
  /** Line printed by `--help`. */
  help: string;
  /** Only read from the command line, so such a field needs a `defaultValue`. */
  flagOnly?: boolean;
  options?: FieldOption[];
  validate?: (value: string) => string | undefined;
  /** Flags that only make sense together with this field. */
  companions?: CompanionFlag[];
  fills?: PlaceholderFill[];
  /** Returning undefined makes the field required. */
  defaultValue?: (ctx: DefaultContext) => Answer;
  /**
   * A computed default (e.g. detected from the surrounding git repo) that
   * should win over a manifest's static `defaults:` entry when it resolves to
   * a value, instead of the usual manifest-first precedence.
   */
  preferComputedDefault?: boolean;
}

export function dashed(value: string): string {
  return value.replace(/_/g, "-");
}

const NAME_PATTERN = /^[a-z][a-z0-9_-]*$/;

function validateName(value: string): string | undefined {
  if (NAME_PATTERN.test(value)) return undefined;
  return "Use lowercase letters, digits, hyphens or underscores; must start with a letter.";
}

function validateRequired(value: string): string | undefined {
  if (value.trim() === "") return "This value is required.";
  return undefined;
}

/** A base path without a slash at each end 404s every asset once deployed. */
export function validateBase(value: string): string | undefined {
  if (!value.startsWith("/") || !value.endsWith("/")) {
    return "A base path has to start and end with a slash, for example /docs/ (or / for the site root).";
  }
  return undefined;
}

const PROJECT_FILLS: PlaceholderFill[] = [
  { placeholder: "__PROJECT__" },
  { placeholder: "__PROJECT_DASHED__", format: dashed },
];

export const FIELD_CATALOG: FieldSpec[] = [
  {
    key: "name",
    type: "text",
    prompt: "Project name",
    hint: "Names the folder created here; lowercase letters, digits, - and _.",
    flag: "[name]",
    help: "Project name; also the folder the scaffold is written to",
    validate: validateName,
    fills: PROJECT_FILLS,
  },
  {
    key: "source",
    type: "select",
    prompt: "Where should the scaffold pull @techfides/tf-doc-vault from?",
    flag: "--source=<src>",
    help: "npm | git | file, where the scaffold pulls @techfides/tf-doc-vault from",
    // A consumer always wants the published version, so this is never asked.
    flagOnly: true,
    options: [
      {
        value: "npm",
        label: "npm",
        hint: "published version from the public registry, so CI needs no git credentials",
      },
      { value: "git", label: "git", hint: "git+ssh URL pinned to --ref" },
      {
        value: "file",
        label: "file",
        hint: "file:<path> to a local checkout, the --dev shortcut",
      },
    ],
    companions: [
      {
        key: "dev",
        flag: "--dev",
        help: "Shortcut for --source=file, pointing at this package's checkout",
      },
      {
        key: "file-path",
        flag: "--file-path=<path>",
        help: "Override the file: target (default: relative path to this package)",
      },
      {
        key: "ref",
        flag: "--ref=<git-ref>",
        help: "Tag, branch or SHA to pin to with --source=git (default: v<version>)",
      },
      {
        key: "git-url",
        flag: "--git-url=<url>",
        help: "Override the git URL used with --source=git",
      },
    ],
    // `source` always ends up answered, so a flat "npm" default would reach
    // resolveSource first and shadow --dev for good.
    defaultValue: ({ flags }) => (flags.dev === true ? "file" : "npm"),
  },
  {
    key: "service-id",
    type: "text",
    prompt: "Service ID (for example BAT)",
    hint: "Short identifier of the service, shown in the documentation titles.",
    flag: "--service-id=<id>",
    help: "Service identifier shown on the documentation front page",
    validate: validateRequired,
    fills: [{ placeholder: "__SERVICE_ID__" }],
  },
  {
    key: "project",
    type: "text",
    prompt: "Project name",
    hint: "Shown in the documentation titles; defaults to this folder's name.",
    flag: "--project=<name>",
    help: "Project name (default: the current folder name)",
    validate: validateRequired,
    fills: PROJECT_FILLS,
    defaultValue: ({ cwd }) => path.basename(cwd),
  },
  {
    key: "section-nav",
    type: "confirm",
    prompt: "Show a top navigation link per documentation section?",
    hint: "Off gives one flat sidebar over all sections and no section links.",
    flag: "--section-nav | --no-section-nav",
    help: "Add a top navigation entry per documentation section",
    fills: [{ placeholder: "__SECTION_NAV__" }],
    defaultValue: ({ manifest }) => manifest.sectionNav,
  },
  {
    key: "base",
    type: "text",
    prompt: "Base path the site is served from",
    hint: "Has to match the URL path the site is published under, slash at each end.",
    flag: "--base=<path>",
    help: "Base path the site is served from (default: per template)",
    validate: validateBase,
    fills: [{ placeholder: "__DOCS_BASE__" }],
    defaultValue: ({ manifest }) => manifest.base,
  },
  {
    key: "repo",
    type: "text",
    prompt: "Repository path for edit links, as org/repo (optional)",
    flag: "--repo=<org/repo>",
    help: "Repository path pre-filled into the commented-out edit-link block",
    flagOnly: true,
    fills: [{ placeholder: "__REPO__" }],
    // Inside an existing repo (the offers monorepo case), the origin remote
    // names the real repo; only fall back to the manifest's static default
    // (e.g. "TechFides/__PROJECT__") when there is none to detect.
    preferComputedDefault: true,
    defaultValue: ({ cwd }) => detectHostRepo(cwd)?.originRepo ?? "",
  },
  {
    key: "repo-subdir",
    type: "text",
    prompt: "Path prefix between the repo root and this folder (optional)",
    hint: "Used by the edit link when this folder lives inside a larger repo.",
    flag: "--repo-subdir=<path>",
    help: "Path prefix for edit links when this folder lives inside a larger repo",
    flagOnly: true,
    fills: [{ placeholder: "__REPO_SUBDIR__" }],
    defaultValue: ({ cwd, manifest, answers }): string => {
      const detected = detectHostRepo(cwd);
      if (!detected) return "";
      // `cwd` is the offer's future parent, not the offer folder itself, so
      // append what the target will be named once it exists.
      const targetName = targetRelativeName(manifest, answers);
      if (!targetName) return detected.subdir;
      return [detected.subdir, targetName].filter(Boolean).join("/");
    },
  },
  {
    key: "git",
    type: "confirm",
    prompt: "Initialize a git repository?",
    hint: "Runs git init in the new folder and commits the scaffold.",
    flag: "--git | --no-git",
    help: "Run git init and make the first commit",
    // Nesting `git init` inside an already-existing repo (the offers monorepo
    // case) would create a broken, disconnected sub-repo, so detecting one
    // flips the default off; --git still overrides it for whoever insists.
    defaultValue: ({ manifest, cwd }) =>
      detectHostRepo(cwd) ? false : manifest.git.init,
  },
  {
    key: "analytics",
    type: "confirm",
    prompt: "Enable Vercel Web Analytics?",
    hint: "Off leaves no trace in the scaffold: no dependency, no wiring.",
    flag: "--analytics | --no-analytics",
    help: "Add @vercel/analytics and wire it into the VitePress theme",
    defaultValue: () => false,
  },
];

export function findField(key: string): FieldSpec | undefined {
  return FIELD_CATALOG.find((field) => field.key === key);
}

/** Option list plus the field's own validator, shared by flags and manifests. */
export function checkFieldValue(
  field: FieldSpec,
  value: string,
): string | undefined {
  if (field.type === "select") {
    const allowed = (field.options ?? []).map((option) => option.value);
    if (!allowed.includes(value)) return `Use ${allowed.join(" | ")}.`;
  }
  return field.validate?.(value);
}

export function fieldPlaceholders(field: FieldSpec): string[] {
  return (field.fills ?? []).map((fill) => fill.placeholder);
}

/**
 * Walked in catalog order, so the last field filling a shared placeholder wins.
 * The interpolated `defaults:` and the scaffolded file contents both read this
 * one map, so they cannot disagree on where a placeholder comes from.
 */
export function placeholderValues(
  fields: string[],
  answers: Record<string, Answer>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of FIELD_CATALOG) {
    if (!fields.includes(field.key)) continue;
    const answer = answers[field.key];
    if (answer === undefined) continue;
    // The generated TypeScript config wants a literal `true` / `false`.
    const value = typeof answer === "boolean" ? String(answer) : answer;
    for (const fill of field.fills ?? []) {
      values[fill.placeholder] = fill.format ? fill.format(value) : value;
    }
  }
  return values;
}

/**
 * The manifest validator sees only the uninterpolated string, so a value such
 * as `nginx-__PROJECT__` can reach a select field whose option list it does not
 * match. Re-check the expansion here.
 */
export function resolveManifestDefault(
  manifest: TemplateManifest,
  field: FieldSpec,
  value: string,
  answers: Record<string, Answer>,
): string {
  let filled = value;
  for (const [placeholder, replacement] of Object.entries(
    placeholderValues(manifest.fields, answers),
  )) {
    filled = filled.split(placeholder).join(replacement);
  }
  const problem = checkFieldValue(field, filled);
  if (problem) {
    fail(
      manifest.name,
      `"defaults.${field.key}" resolves to "${filled}", which is invalid: ${problem}`,
    );
  }
  return filled;
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

/** `"*mermaid*"` and `*mermaid*` are the same value, so compare them unquoted. */
export function unquoteYaml(raw: string): string {
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"));
  return quoted && raw.length >= 2 ? raw.slice(1, -1) : raw;
}

function parseYamlScalar(raw: string): YamlValue {
  if (raw === "{}") return {};
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => parseYamlScalar(item.trim()));
  }
  const unquoted = unquoteYaml(raw);
  if (unquoted !== raw) return unquoted;
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
    const key = unquoteYaml(line.text.slice(0, colon).trim());
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
const HOST_KEYS = [
  "packageJsonScripts",
  "devDependencies",
  "gitignore",
  "minimalPackageJson",
  "pnpmWorkspace",
];
const GIT_KEYS = ["init"];

function fail(templateName: string, message: string): never {
  throw new SetupError(`${templateName}/${MANIFEST_FILE}: ${message}`);
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

function checkFields(templateName: string, fields: string[]): void {
  for (const key of fields) {
    if (findField(key)) continue;
    fail(
      templateName,
      `"fields" lists "${key}", which is not a wizard field.\n` +
        `  Known fields: ${FIELD_CATALOG.map((field) => field.key).join(", ")}`,
    );
  }
}

/** A `defaults:` entry bypasses the flag path, so re-run the same checks. */
function checkDefaults(
  templateName: string,
  fields: string[],
  defaults: Record<string, string | boolean>,
): void {
  for (const [key, value] of Object.entries(defaults)) {
    if (!fields.includes(key)) {
      fail(
        templateName,
        `"defaults.${key}" is not listed in "fields", so it has no effect`,
      );
    }
    const field = findField(key)!;
    const wantsBoolean = field.type === "confirm";
    if (wantsBoolean !== (typeof value === "boolean")) {
      fail(
        templateName,
        `"defaults.${key}" must be ${wantsBoolean ? "true or false" : "a string"}`,
      );
    }
    if (typeof value !== "string") continue;

    // A default may interpolate a placeholder that an earlier field fills.
    // Fields resolve in catalog order, whatever order "fields" lists them in.
    const earlier = FIELD_CATALOG.slice(
      0,
      FIELD_CATALOG.findIndex((candidate) => candidate.key === key),
    ).filter((candidate) => fields.includes(candidate.key));
    const fillable = new Set(earlier.flatMap(fieldPlaceholders));
    const tokens = value.match(/__[A-Z0-9_]+__/g) ?? [];
    for (const token of tokens) {
      if (fillable.has(token)) continue;
      fail(
        templateName,
        `"defaults.${key}" uses ${token}, which no field resolved before "${key}" fills`,
      );
    }
    // No final form yet; `resolveManifestDefault` checks it once answers are in.
    if (tokens.length > 0) continue;

    const problem = checkFieldValue(field, value);
    if (problem) fail(templateName, `"defaults.${key}" is invalid: ${problem}`);
  }
}

/** `copyDir` filters only at the root of a source, so a nested path would copy. */
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
  const match = /^---\s*\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/.exec(
    source.replace(/\r\n/g, "\n"),
  );
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
  checkBoilerplateEntries(templateName, "exclude", exclude, boilerplateDir);

  const fields = asStringList(templateName, "fields", raw.fields);
  checkFields(templateName, fields);
  const defaults = asDefaults(templateName, raw.defaults);
  checkDefaults(templateName, fields, defaults);

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
    fields,
    defaults,
    exclude,
    renames,
    host: {
      packageJsonScripts: asBoolean(
        templateName,
        "host.packageJsonScripts",
        host.packageJsonScripts,
      ),
      devDependencies: asBoolean(
        templateName,
        "host.devDependencies",
        host.devDependencies,
      ),
      gitignore: asBoolean(templateName, "host.gitignore", host.gitignore),
      minimalPackageJson: asBoolean(
        templateName,
        "host.minimalPackageJson",
        host.minimalPackageJson,
      ),
      pnpmWorkspace: asBoolean(
        templateName,
        "host.pnpmWorkspace",
        host.pnpmWorkspace,
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

export interface UnavailableTemplate {
  name: string;
  reason: string;
}

export interface TemplateScan {
  templates: TemplateManifest[];
  unavailable: UnavailableTemplate[];
}

/**
 * One broken folder is reported as unavailable rather than thrown, so it cannot
 * take `--help` and every healthy template down with it.
 */
export function scanTemplates(
  dirs: ScaffoldDirs = defaultDirs(),
): TemplateScan {
  let names: string[];
  try {
    names = fs
      .readdirSync(dirs.templatesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return { templates: [], unavailable: [] };
  }

  const templates: TemplateManifest[] = [];
  const unavailable: UnavailableTemplate[] = [];
  for (const name of names) {
    const dir = path.join(dirs.templatesDir, name);
    const manifestPath = path.join(dir, MANIFEST_FILE);
    try {
      if (!fs.existsSync(manifestPath)) fail(name, "missing manifest file");
      templates.push(
        parseTemplateManifest(
          fs.readFileSync(manifestPath, "utf-8"),
          name,
          dir,
          dirs.boilerplateDir,
        ),
      );
    } catch (error) {
      unavailable.push({ name, reason: (error as Error).message });
    }
  }
  return { templates, unavailable };
}

function defaultDirs(): ScaffoldDirs {
  return { templatesDir: TEMPLATES_DIR, boilerplateDir: BOILERPLATE_DIR };
}

/**
 * The eventual target's name/path relative to `cwd`, computed before the
 * target may exist. `repo-subdir`'s default needs this: detection only knows
 * the repo relative to `cwd` (typically the offer's future parent), not the
 * offer folder itself.
 */
function targetRelativeName(
  manifest: TemplateManifest,
  answers: Record<string, Answer>,
): string | undefined {
  if (manifest.target.mode === "subfolder") return manifest.target.path;
  return typeof answers.name === "string" && answers.name !== ""
    ? answers.name
    : undefined;
}

export function resolveCopyPlan(
  manifest: TemplateManifest,
  answers: Record<string, Answer>,
  ctx: { cwd?: string; boilerplateDir?: string; gitRoot?: string | null } = {},
): CopyPlan {
  const cwd = ctx.cwd ?? process.cwd();
  const boilerplateDir = ctx.boilerplateDir ?? BOILERPLATE_DIR;

  // Inside an existing repo, GitHub only reads workflows from its own root, so
  // the CI workflow must not land inside the offer subfolder; `setup.ts`
  // places it at `ctx.gitRoot` separately (see `placeCiWorkflow`).
  const exclude = [
    MANIFEST_FILE,
    ...manifest.exclude,
    ...(ctx.gitRoot ? [".github"] : []),
  ];

  let target: string;
  if (manifest.target.mode === "subfolder") {
    target = path.resolve(cwd, manifest.target.path!);
  } else {
    const name = targetRelativeName(manifest, answers);
    if (!name) {
      throw new SetupError(`Template "${manifest.name}" needs a project name.`);
    }
    target = path.resolve(cwd, name);
  }

  return {
    sources: [boilerplateDir, manifest.dir],
    exclude,
    renames: { ...manifest.renames },
    target,
  };
}

/**
 * Files that cannot be live under their real name inside this repo (`npm pack`
 * strips dotfiles and files npm treats as its own config; `tsconfig.json`
 * would extend this package's own self-reference, which only resolves once
 * the package is installed as a dependency of itself) ship prefixed and the
 * scaffolder renames them on copy. `sync` resolves a baseline through the
 * inverse of this one table.
 */
const SCAFFOLD_RENAMES: Record<string, string> = {
  _npmrc: ".npmrc",
  _gitignore: ".gitignore",
  "_pnpm-workspace.yaml": "pnpm-workspace.yaml",
  "_tsconfig.json": "tsconfig.json",
};

const WORKSPACE_SOURCE = "_pnpm-workspace.yaml";

export interface WorkspaceSettings {
  publicHoistPattern: string[];
  allowBuilds: Record<string, boolean>;
}

/**
 * Read from the boilerplate's own workspace file, so a host repo receives
 * exactly what a standalone scaffold ships. Mermaid's transitive dependencies
 * are CJS: without the hoist patterns Vite pre-bundles them wrong and the page
 * renders blank with a dayjs default-export SyntaxError.
 */
export function boilerplateWorkspaceSettings(
  boilerplateDir: string = BOILERPLATE_DIR,
): WorkspaceSettings {
  const file = path.join(boilerplateDir, WORKSPACE_SOURCE);
  const raw = parseYamlMap(
    tokenizeYaml(fs.readFileSync(file, "utf-8")),
    0,
    0,
  )[0];
  const patterns = raw.publicHoistPattern;
  const builds = raw.allowBuilds;
  if (
    !Array.isArray(patterns) ||
    !patterns.every((item) => typeof item === "string") ||
    typeof builds !== "object" ||
    Array.isArray(builds)
  ) {
    throw new SetupError(
      `${WORKSPACE_SOURCE}: expected a publicHoistPattern list of strings and an allowBuilds mapping.`,
    );
  }
  return {
    publicHoistPattern: patterns,
    allowBuilds: Object.fromEntries(
      Object.entries(builds).map(([name, value]) => [name, value === true]),
    ),
  };
}

export function consumerName(boilerplateEntry: string): string {
  return SCAFFOLD_RENAMES[boilerplateEntry] ?? boilerplateEntry;
}

export function boilerplateName(consumerEntry: string): string {
  for (const [source, target] of Object.entries(SCAFFOLD_RENAMES)) {
    if (target === consumerEntry) return source;
  }
  return consumerEntry;
}

/**
 * Compose the sources in a staging directory with overwrite, so a later source
 * wins, then copy the result to the target once. Layering idempotent copies
 * straight into the target would give the FIRST source precedence and would
 * count collisions between sources as pre-existing consumer files.
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
        throw new SetupError(
          `Cannot rename "${from}": the copy plan excluded it.`,
        );
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

/**
 * Read from this package's own `peerDependencies`, so the ranges written into a
 * host repo cannot drift from the ones this package is tested against.
 */
export function packagePeerDependencies(
  packageDir: string = PACKAGE_DIR,
): Record<string, string> {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf-8"),
  ) as { peerDependencies?: Record<string, string> };
  return pkg.peerDependencies ?? {};
}

export function packageName(packageDir: string = PACKAGE_DIR): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf-8"),
  ) as { name?: string };
  if (!pkg.name) fail("package.json", "has no name");
  return pkg.name;
}

/**
 * A package cannot list itself as its own peer, yet the generated `docs:*`
 * scripts call its binary and the generated VitePress config imports from it,
 * so the host repo has to receive the peers plus this package.
 */
export function documentationDependencies(
  flags: ParsedArgs["flags"],
  hostDir: string,
): Record<string, string> {
  return {
    ...packagePeerDependencies(),
    [packageName()]: resolveDependencyValue(flags, hostDir),
  };
}

export function resolveSource(flags: ParsedArgs["flags"]): string {
  return String(flags.source ?? (flags.dev ? "file" : "npm"));
}

/**
 * Defaults to the published npm version, so CI and the Docker build of a
 * scaffold need no git credentials.
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
      throw new SetupError(
        `Invalid --source: ${source}. Use npm | git | file.`,
      );
  }
}
