import { describe, test, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIELD_CATALOG,
  boilerplateWorkspaceSettings,
  documentationDependencies,
  packageName,
  packagePeerDependencies,
  resolveSource,
  resolveDependencyValue,
  originUrl,
  validateBase,
  type Answer,
  type TemplateManifest,
  type TemplateScan,
  type WorkspaceSettings,
} from "../../../src/cli/scaffold.js";
import { SetupError } from "../../../src/cli/utils.js";
import {
  CancelledError,
  dependencyFlags,
  docsScripts,
  gitignoreEntries,
  mergeWorkspaceSettings,
  missingDependencies,
  nextSteps,
  renderWorkspaceSettings,
  resolveAnswers,
  resolvePlaceholders,
  selectTemplate,
  sourceWarnings,
  table,
  templateFlag,
  unknownFlags,
  updateDevDependencies,
  updateGitignore,
  updatePackageJson,
  updatePnpmWorkspace,
  warnIfEmbeddedInWorkspace,
  writeMinimalPackageJson,
  type PromptFn,
  type PromptRequest,
} from "../../../src/cli/setup.js";

const CTX = { version: "9.9.9", packageDir: "/abs/pkg" };

/** Root package.json version, which the production `ctx` default resolves to. */
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const REAL_VERSION = (
  JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"),
  ) as { version: string }
).version;

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "setup-test-"));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveSource", () => {
  test("defaults to npm (no git credentials needed in CI)", () => {
    expect(resolveSource({})).toBe("npm");
  });

  test("explicit --source wins over --dev", () => {
    expect(resolveSource({ dev: true, source: "git" })).toBe("git");
  });
});

describe("resolveDependencyValue", () => {
  // The default has to be npm: a git+ssh GitHub URL is unfetchable from GitLab CI.
  test("npm default resolves to the published version", () => {
    expect(resolveDependencyValue({}, "/tmp/proj", CTX)).toBe("9.9.9");
  });

  // Covers the real ctx default (packageVersion()/PACKAGE_DIR); every other test injects CTX.
  test("production default arm reads the real package version (no injected ctx)", () => {
    expect(resolveDependencyValue({}, "/tmp/proj")).toBe(REAL_VERSION);
    expect(REAL_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("git source pins to the version tag by default", () => {
    expect(resolveDependencyValue({ source: "git" }, "/tmp/proj", CTX)).toBe(
      "git+ssh://git@github.com/techfides/tf-doc-vault.git#v9.9.9",
    );
  });

  test("git source honors an explicit --ref and --git-url", () => {
    expect(
      resolveDependencyValue(
        { source: "git", ref: "main", "git-url": "git+https://example/x.git" },
        "/tmp/proj",
        CTX,
      ),
    ).toBe("git+https://example/x.git#main");
  });

  test("file source honors an explicit --file-path", () => {
    expect(
      resolveDependencyValue(
        { source: "file", "file-path": "../local" },
        "/tmp/proj",
        CTX,
      ),
    ).toBe("file:../local");
  });

  test("an unusable source is a CLI error, not a stack trace", () => {
    expect(() =>
      resolveDependencyValue({ source: "carrier-pigeon" }, "/tmp/proj", CTX),
    ).toThrow(SetupError);
  });
});

describe("originUrl", () => {
  // The epilogue must print the GitLab origin; no git@github.com path exists.
  test("points at the GitLab analysis group, not GitHub", () => {
    expect(originUrl("lapa_ana")).toBe(
      "git@gitlab.com:techfides/tf-analysis/lapa_ana.git",
    );
  });
});

// ─── wizard fixtures ───

/**
 * Fixture manifests, so the dialogue tests never depend on a template that
 * happens to ship with the package.
 */
function manifest(overrides: Partial<TemplateManifest> = {}): TemplateManifest {
  return {
    name: "fixture",
    label: "Fixture template",
    target: { mode: "new-folder" },
    base: "/",
    sectionNav: true,
    fields: [],
    defaults: {},
    exclude: [],
    renames: {},
    host: {
      packageJsonScripts: false,
      devDependencies: false,
      gitignore: false,
      minimalPackageJson: false,
      pnpmWorkspace: false,
    },
    git: { init: true },
    lockfile: false,
    workspaceWarning: false,
    description: "",
    dir: "/abs/templates/fixture",
    ...overrides,
  };
}

function scanOf(
  templates: TemplateManifest[],
  unavailable: TemplateScan["unavailable"] = [],
): TemplateScan {
  return { templates, unavailable };
}

/** Prompt layer that replays scripted answers and records what it was asked. */
function scriptedPrompts(answers: Record<string, Answer>): {
  promptFn: PromptFn;
  asked: PromptRequest[];
} {
  const asked: PromptRequest[] = [];
  const promptFn: PromptFn = (request) => {
    asked.push(request);
    if (!(request.key in answers)) {
      throw new Error(`unexpected prompt for "${request.key}"`);
    }
    return Promise.resolve(answers[request.key]);
  };
  return { promptFn, asked };
}

const NO_PROMPTS: PromptFn = (request) => {
  throw new Error(`prompted for "${request.key}" without a TTY`);
};

const TTY = { cwd: "/work/host-repo", interactive: true };
const PIPED = { cwd: "/work/host-repo", interactive: false };

describe("selectTemplate", () => {
  const templates = [
    manifest({ name: "first", label: "The first one" }),
    manifest({ name: "second", label: "The second one" }),
  ];

  test("resolves an explicit --template", async () => {
    const chosen = await selectTemplate(
      scanOf(templates),
      "second",
      NO_PROMPTS,
      { interactive: false },
    );
    expect(chosen.name).toBe("second");
  });

  test("an unknown --template lists what is available", async () => {
    await expect(
      selectTemplate(scanOf(templates), "third", NO_PROMPTS, {
        interactive: false,
      }),
    ).rejects.toThrow(/Unknown template: third[\s\S]*first, second/);
  });

  // A broken folder is named with its reason instead of being called unknown.
  test("a template that failed to load reports why", async () => {
    await expect(
      selectTemplate(
        scanOf(templates, [{ name: "wrecked", reason: "missing key" }]),
        "wrecked",
        NO_PROMPTS,
        { interactive: false },
      ),
    ).rejects.toThrow(/Template "wrecked" is unavailable: missing key/);
  });

  // Without a TTY there is no --yes and no CI detection, only flags.
  test("without a TTY a missing --template is an error, never a prompt", async () => {
    await expect(
      selectTemplate(scanOf(templates), undefined, NO_PROMPTS, {
        interactive: false,
      }),
    ).rejects.toThrow(/Missing: --template=<name>/);
  });

  test("offers the manifest labels in the select", async () => {
    const { promptFn, asked } = scriptedPrompts({ template: "first" });
    const chosen = await selectTemplate(
      scanOf(templates),
      undefined,
      promptFn,
      { interactive: true },
    );
    expect(chosen.name).toBe("first");
    expect(asked[0]?.message).toBe("Which template do you want to use?");
    expect(asked[0]?.options).toEqual([
      { value: "first", label: "The first one", hint: "first" },
      { value: "second", label: "The second one", hint: "second" },
    ]);
  });
});

describe("resolveAnswers", () => {
  test("flags and derived defaults cover the whole dialogue", async () => {
    const { answers } = await resolveAnswers(
      manifest({ fields: ["name", "gcp-project", "server", "source", "git"] }),
      {
        projectName: "demo_proj",
        flags: { server: "nginx-auth", source: "npm", "no-git": true },
      },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers).toEqual({
      name: "demo_proj",
      // Derived from the project name, with underscores turned into hyphens.
      "gcp-project": "tfsa-demo-proj",
      server: "nginx-auth",
      source: "npm",
      git: false,
    });
  });

  test("a supplied flag skips its prompt even with a TTY", async () => {
    const { promptFn, asked } = scriptedPrompts({ "gcp-project": "tfsa-demo" });
    const { answers } = await resolveAnswers(
      manifest({ fields: ["name", "gcp-project"] }),
      { projectName: "demo", flags: {} },
      promptFn,
      TTY,
    );
    expect(asked.map((request) => request.key)).toEqual(["gcp-project"]);
    expect(answers.name).toBe("demo");
  });

  test("prompts for what the flags leave open, with the defaults prefilled", async () => {
    const { promptFn, asked } = scriptedPrompts({
      name: "demo",
      "gcp-project": "tfsa-custom",
      server: "nginx",
      "section-nav": true,
      base: "/",
      git: true,
    });
    const { answers } = await resolveAnswers(
      manifest({
        fields: ["name", "gcp-project", "server", "section-nav", "base", "git"],
      }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked.map((request) => request.message)).toEqual([
      "Project name",
      "GCP project ID",
      "Server flavour",
      "Show a top navigation link per documentation section?",
      "Base path the site is served from",
      "Initialize a git repository?",
    ]);
    // The GCP default follows the name answered one prompt earlier.
    expect(asked[1]?.initialValue).toBe("tfsa-demo");
    expect(asked[2]?.initialValue).toBe("nginx");
    // Both come from the manifest, which is where a template's own value lives.
    expect(asked[3]?.initialValue).toBe(true);
    expect(asked[4]?.initialValue).toBe("/");
    expect(asked[5]?.initialValue).toBe(true);
    expect(answers["gcp-project"]).toBe("tfsa-custom");
  });

  // A prompt without a hint leaves the reader guessing. A select explains itself
  // through its options, which clack renders next to the active one; every other
  // type needs the field's own hint line.
  test("every prompted field explains itself in one short line", async () => {
    const prompted = FIELD_CATALOG.filter((field) => !field.flagOnly);
    const answers: Record<string, Answer> = {};
    for (const field of prompted) {
      answers[field.key] = field.type === "confirm" ? true : "value_x";
    }
    const { promptFn, asked } = scriptedPrompts(answers);
    await resolveAnswers(
      manifest({ fields: prompted.map((field) => field.key) }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked).toHaveLength(prompted.length);
    for (const request of asked) {
      const hints =
        request.type === "select"
          ? (request.options ?? []).map((option) => option.hint ?? "")
          : [request.hint ?? ""];
      expect(
        hints.length,
        `${request.key} offers nothing to read`,
      ).toBeGreaterThan(0);
      for (const hint of hints) {
        expect(hint, `${request.key} has an unexplained choice`).not.toBe("");
        expect(
          hint.split("\n"),
          `${request.key} hint spans lines`,
        ).toHaveLength(1);
        expect(hint.length, `${request.key} hint is long`).toBeLessThan(90);
      }
    }
  });

  // The select options are where a select field explains itself, and the
  // recommended one has to read as such.
  test("the server options say what they do and which one is recommended", () => {
    const server = FIELD_CATALOG.find((field) => field.key === "server");
    expect(server?.options?.[0]?.label).toBe("nginx (recommended)");
    expect(server?.options?.[0]?.hint).toMatch(/reach the URL/);
    expect(server?.options?.[1]?.hint).toMatch(/Basic auth/);
  });

  // The dependency source is a maintainer concern; a consumer always wants the
  // published version, so the dialogue never brings it up.
  test("source is never prompted, only read from the flags", async () => {
    const { promptFn, asked } = scriptedPrompts({ name: "demo" });
    const { answers } = await resolveAnswers(
      manifest({ fields: ["name", "source"] }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked.map((request) => request.key)).toEqual(["name"]);
    expect(answers.source).toBe("npm");

    const withFlag = await resolveAnswers(
      manifest({ fields: ["name", "source"] }),
      { projectName: "demo", flags: { source: "git" } },
      NO_PROMPTS,
      TTY,
    );
    expect(withFlag.answers.source).toBe("git");
  });

  // The value only pre-fills a commented-out block, so asking for it in the
  // dialogue would be a question with no visible effect.
  test("repo is never prompted, only read from the flags", async () => {
    const { promptFn, asked } = scriptedPrompts({ "service-id": "BAT" });
    const { answers } = await resolveAnswers(
      manifest({ fields: ["service-id", "repo"] }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked.map((request) => request.key)).toEqual(["service-id"]);
    expect(answers.repo).toBe("");

    const withFlag = await resolveAnswers(
      manifest({ fields: ["service-id", "repo"] }),
      { flags: { "service-id": "BAT", repo: "acme/srvc-foo" } },
      NO_PROMPTS,
      TTY,
    );
    expect(withFlag.answers.repo).toBe("acme/srvc-foo");
  });

  // A flag-only field has no dialogue to fall back to, so a missing default
  // would report it as an unsatisfiable required flag even with a TTY.
  test("every flag-only field has a default", () => {
    for (const field of FIELD_CATALOG.filter((entry) => entry.flagOnly)) {
      expect(field.defaultValue, `${field.key} has no default`).toBeDefined();
    }
  });

  test("the git default comes from the manifest, not from the catalog", async () => {
    const { promptFn, asked } = scriptedPrompts({ git: false });
    await resolveAnswers(
      manifest({ fields: ["git"], git: { init: false } }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked[0]?.initialValue).toBe(false);
  });

  test("a manifest default outranks the catalog default", async () => {
    const withDefault = manifest({
      fields: ["server"],
      defaults: { server: "nginx-auth" },
    });
    const { answers } = await resolveAnswers(
      withDefault,
      { flags: {} },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers.server).toBe("nginx-auth");

    const overridden = await resolveAnswers(
      withDefault,
      { flags: { server: "nginx" } },
      NO_PROMPTS,
      PIPED,
    );
    expect(overridden.answers.server).toBe("nginx");
  });

  // Lets a template pre-fill a value derived from the project name without
  // naming that template anywhere in src/.
  test("a manifest default interpolates what an earlier field answered", async () => {
    const { answers } = await resolveAnswers(
      manifest({
        fields: ["project", "repo"],
        defaults: { repo: "org/tf-analysis/__PROJECT_DASHED__" },
      }),
      { flags: {} },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers.repo).toBe("org/tf-analysis/host-repo");
  });

  // The manifest validator sees the uninterpolated string, so the concrete value
  // is the first thing a select field's option list can be applied to. Left
  // unchecked, `nginx-demo` reached .gitlab-ci.yml as SERVER_TYPE and the
  // Dockerfile has no matching runner stage.
  test("an interpolating manifest default is checked once it has a value", async () => {
    await expect(
      resolveAnswers(
        manifest({
          fields: ["name", "server"],
          defaults: { server: "nginx-__PROJECT_DASHED__" },
        }),
        { projectName: "demo", flags: {} },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(
      /"defaults.server" resolves to "nginx-demo", which is invalid: Use nginx \| nginx-auth\./,
    );
  });

  test("an interpolating manifest default that resolves to a valid value passes", async () => {
    const { answers } = await resolveAnswers(
      manifest({
        fields: ["name", "server"],
        defaults: { server: "__PROJECT_DASHED__" },
      }),
      { projectName: "nginx-auth", flags: {} },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers.server).toBe("nginx-auth");
  });

  // Both name fields fill __PROJECT__ and __PROJECT_DASHED__, and an
  // interpolated default used to read the first of them while the scaffolded
  // files read the last.
  test("an interpolated default and the file contents agree on which field wins", async () => {
    const both = manifest({
      fields: ["name", "project", "repo"],
      defaults: { repo: "org/__PROJECT_DASHED__" },
    });
    const { answers } = await resolveAnswers(
      both,
      { projectName: "from_name", flags: { project: "from_project" } },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers.repo).toBe("org/from-project");
    expect(resolvePlaceholders(both, answers, {}).__PROJECT_DASHED__).toBe(
      "from-project",
    );
  });

  // Empty, it leaves a gap in the rendered tagline and truncates the edit link
  // to `techfides/`.
  test("an empty --project is rejected", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["project"] }),
        { flags: { project: "" } },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/Invalid --project=<name>/);
  });

  // Empty, it renders the service name as a blank in titles and the tagline.
  test("an empty --service-id is rejected", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["service-id"] }),
        { flags: { "service-id": "" } },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/Invalid --service-id=<id>/);
  });

  // Clearing the prefilled answer is the interactive route to the same value.
  test("the project prompt rejects a cleared answer", async () => {
    const { promptFn, asked } = scriptedPrompts({ project: "kept" });
    await resolveAnswers(
      manifest({ fields: ["project"] }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked[0]?.validate?.("")).toMatch(/required/);
    expect(asked[0]?.validate?.("  ")).toMatch(/required/);
    expect(asked[0]?.validate?.("srvc-bat")).toBeUndefined();
  });

  test("without a TTY a required value without a flag exits with a flag list", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["name", "service-id"] }),
        { flags: {} },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/Missing: \[name\], --service-id=<id>/);
  });

  test("without a TTY a defaulted value needs no flag", async () => {
    const { answers } = await resolveAnswers(
      manifest({ fields: ["project", "repo", "server"] }),
      { flags: {} },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers).toEqual({
      project: "host-repo",
      repo: "",
      server: "nginx",
    });
  });

  // A flag the template does not use is a warning, never a failure.
  test("a flag outside the template's fields warns and is dropped", async () => {
    const { answers, warnings } = await resolveAnswers(
      manifest({
        fields: ["service-id"],
        target: { mode: "subfolder", path: "sub" },
      }),
      {
        projectName: "stray",
        flags: { "service-id": "DEM", "gcp-project": "tfsa-x", ref: "main" },
      },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers).toEqual({ "service-id": "DEM" });
    expect(warnings).toEqual([
      `[name] does not apply to the "fixture" template; ignoring it.`,
      `--gcp-project=<id> does not apply to the "fixture" template; ignoring it.`,
      `--ref=<git-ref> does not apply to the "fixture" template; ignoring it.`,
    ]);
  });

  // A silently swallowed typo means a non-interactive run scaffolds with the
  // default instead of the value the caller meant.
  test("a flag outside the known set warns", async () => {
    const { answers, warnings } = await resolveAnswers(
      manifest({ fields: ["gcp-project", "name"] }),
      { projectName: "demo", flags: { "gcp-projct": "oops" } },
      NO_PROMPTS,
      PIPED,
    );
    expect(warnings).toEqual(["Unknown flag --gcp-projct; ignoring it."]);
    expect(answers["gcp-project"]).toBe("tfsa-demo");
  });

  test("every flag the catalog documents counts as known", () => {
    const documented: Record<string, string | boolean> = {
      template: "x",
      base: "/x/",
      help: true,
      "no-git": true,
    };
    for (const field of FIELD_CATALOG) {
      if (!field.flag.startsWith("[")) documented[field.key] = "x";
      for (const companion of field.companions ?? []) {
        documented[companion.key] = "x";
      }
    }
    expect(unknownFlags(documented)).toEqual([]);
  });

  test("an invalid select value is rejected", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["server"] }),
        { flags: { server: "apache" } },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(SetupError);
  });

  test("an invalid project name is rejected", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["name"] }),
        { projectName: "Demo Project", flags: {} },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/Invalid \[name\]: Demo Project/);
  });

  // `--git=false` reads as "off" but parses as a string, so accepting it
  // silently would scaffold WITH git.
  test("a value on a confirm flag is rejected, naming both valid forms", async () => {
    for (const flags of [{ git: "false" }, { "no-git": "true" }]) {
      await expect(
        resolveAnswers(
          manifest({ fields: ["git"] }),
          { flags },
          NO_PROMPTS,
          PIPED,
        ),
      ).rejects.toThrow(/takes no value\. Use --git or --no-git\./);
    }
  });

  test("a value flag with no value is rejected instead of dropped", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["service-id"] }),
        { flags: { "service-id": true } },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/--service-id=<id> needs a value/);
  });

  test("the name prompt rejects an empty answer and a bad shape", async () => {
    const { promptFn, asked } = scriptedPrompts({ name: "demo" });
    await resolveAnswers(
      manifest({ fields: ["name"] }),
      { flags: {} },
      promptFn,
      TTY,
    );
    const validate = asked[0]?.validate;
    expect(validate?.("")).toMatch(/required/);
    expect(validate?.("Demo")).toMatch(/lowercase/);
    expect(validate?.("demo")).toBeUndefined();
  });

  test("an optional prompt accepts an empty answer", async () => {
    const { promptFn, asked } = scriptedPrompts({ repo: "" });
    const { answers } = await resolveAnswers(
      manifest({ fields: ["repo"] }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked[0]?.validate?.("")).toBeUndefined();
    expect(answers.repo).toBe("");
  });

  // A base without both slashes 404s every asset once the site is deployed.
  test("base has to start and end with a slash, whichever way it arrives", async () => {
    expect(validateBase("/")).toBeUndefined();
    expect(validateBase("/docs/")).toBeUndefined();
    expect(validateBase("docs/")).toMatch(/start and end with a slash/);
    expect(validateBase("/docs")).toMatch(/start and end with a slash/);

    await expect(
      resolveAnswers(
        manifest({ fields: ["base"] }),
        { flags: { base: "/docs" } },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/Invalid --base=<path>: \/docs/);

    const { promptFn, asked } = scriptedPrompts({ base: "/kept/" });
    await resolveAnswers(
      manifest({ fields: ["base"] }),
      { flags: {} },
      promptFn,
      TTY,
    );
    expect(asked[0]?.validate?.("/docs")).toMatch(/start and end with a slash/);
  });

  test("a bare --base is rejected instead of silently dropped", async () => {
    await expect(
      resolveAnswers(
        manifest({ fields: ["base"] }),
        { flags: { base: true } },
        NO_PROMPTS,
        PIPED,
      ),
    ).rejects.toThrow(/--base=<path> needs a value/);
  });

  // Both come from the manifest so a template keeps deciding the sensible value,
  // and the flag or the prompt only overrides it.
  test("section-nav and base default to the manifest values", async () => {
    const { answers } = await resolveAnswers(
      manifest({
        fields: ["section-nav", "base"],
        sectionNav: false,
        base: "/sub/",
      }),
      { flags: {} },
      NO_PROMPTS,
      PIPED,
    );
    expect(answers).toEqual({ "section-nav": false, base: "/sub/" });

    const overridden = await resolveAnswers(
      manifest({
        fields: ["section-nav", "base"],
        sectionNav: false,
        base: "/sub/",
      }),
      { flags: { "section-nav": true, base: "/other/" } },
      NO_PROMPTS,
      PIPED,
    );
    expect(overridden.answers).toEqual({
      "section-nav": true,
      base: "/other/",
    });
  });

  test("a dismissed prompt propagates, so main can exit without side effects", async () => {
    const promptFn: PromptFn = () => Promise.reject(new CancelledError());
    await expect(
      resolveAnswers(
        manifest({ fields: ["name"] }),
        { flags: {} },
        promptFn,
        TTY,
      ),
    ).rejects.toThrow(CancelledError);
  });
});

// The whole point of --dev is the file: dependency, and every step of
// resolveAnswers → dependencyFlags → resolveDependencyValue can drop it.
describe("--dev end to end", () => {
  const withSource = manifest({ fields: ["name", "source"] });

  async function dependencyFor(
    flags: Record<string, string | boolean>,
    target = "/tmp/proj",
  ): Promise<string> {
    const { answers } = await resolveAnswers(
      withSource,
      { projectName: "demo", flags },
      NO_PROMPTS,
      PIPED,
    );
    return resolveDependencyValue(
      dependencyFlags(withSource, answers, flags),
      target,
      CTX,
    );
  }

  test("--dev produces a file: dependency", async () => {
    expect(await dependencyFor({ dev: true })).toBe(
      `file:${path.relative("/tmp/proj", CTX.packageDir)}`,
    );
  });

  test("--dev with an explicit --file-path uses that path", async () => {
    expect(await dependencyFor({ dev: true, "file-path": "../local" })).toBe(
      "file:../local",
    );
  });

  test("no --dev keeps the published version", async () => {
    expect(await dependencyFor({})).toBe("9.9.9");
  });

  test("an explicit --source still wins over --dev", async () => {
    expect(await dependencyFor({ dev: true, source: "npm" })).toBe("9.9.9");
  });

  // --dev has to survive the whole chain even with a TTY, where the source is
  // resolved from its default instead of from a prompt.
  test("--dev reaches the answers with a TTY too", async () => {
    const { answers } = await resolveAnswers(
      manifest({ fields: ["source"] }),
      { flags: { dev: true } },
      NO_PROMPTS,
      TTY,
    );
    expect(answers.source).toBe("file");
  });
});

describe("resolvePlaceholders", () => {
  test("a placeholder the template never asks about becomes empty", () => {
    // Regression: the merged boilerplate config carries __REPO__ inside a
    // commented editLink block, so a template without a `repo` field would
    // otherwise ship the literal.
    const placeholders = resolvePlaceholders(
      manifest({ fields: ["name"] }),
      { name: "demo_proj" },
      {},
    );
    expect(placeholders.__REPO__).toBe("");
    expect(placeholders.__SERVICE_ID__).toBe("");
    expect(placeholders.__GCP_PROJECT__).toBe("");
    expect(placeholders.__PROJECT__).toBe("demo_proj");
    expect(placeholders.__PROJECT_DASHED__).toBe("demo-proj");
  });

  // Catches a `fills` entry wired to a placeholder its own field never sets,
  // which leaves that placeholder empty in every scaffold that needs it.
  test("a template that asks about every field leaves no placeholder empty", () => {
    const answers: Record<string, Answer> = {};
    for (const field of FIELD_CATALOG) {
      answers[field.key] = field.type === "confirm" ? true : "value_x";
    }
    const placeholders = resolvePlaceholders(
      manifest({ fields: FIELD_CATALOG.map((field) => field.key) }),
      answers,
      {},
    );
    for (const [key, value] of Object.entries(placeholders)) {
      // Basic auth is filled in by the consumer, never by the wizard.
      if (key.startsWith("__BASIC_AUTH_")) continue;
      expect(value, `${key} resolved empty`).not.toBe("");
    }
  });

  test("either name field can fill the project placeholders", () => {
    const placeholders = resolvePlaceholders(
      manifest({ fields: ["project"] }),
      { project: "srvc_demo", name: "ignored" },
      {},
    );
    expect(placeholders.__PROJECT__).toBe("srvc_demo");
    expect(placeholders.__PROJECT_DASHED__).toBe("srvc-demo");
  });

  test("the caller's extras win over the catalog", () => {
    const placeholders = resolvePlaceholders(
      manifest({ fields: ["repo"] }),
      { repo: "org/repo" },
      { __DOCS_BASE__: "/sub/", __REPO__: "override" },
    );
    expect(placeholders.__DOCS_BASE__).toBe("/sub/");
    expect(placeholders.__REPO__).toBe("override");
  });

  // Empty, these two would emit `base: ""` and a bare `sectionNav:` into the
  // generated config, so a template that does not ask still gets its own value.
  test("base and sectionNav fall back to the manifest, and an answer wins", () => {
    const notAsked = resolvePlaceholders(
      manifest({ fields: [], base: "/sub/", sectionNav: false }),
      {},
      {},
    );
    expect(notAsked.__DOCS_BASE__).toBe("/sub/");
    expect(notAsked.__SECTION_NAV__).toBe("false");

    const answered = resolvePlaceholders(
      manifest({
        fields: ["section-nav", "base"],
        base: "/sub/",
        sectionNav: false,
      }),
      { "section-nav": true, base: "/other/" },
      {},
    );
    expect(answered.__DOCS_BASE__).toBe("/other/");
    expect(answered.__SECTION_NAV__).toBe("true");
  });
});

describe("flag helpers", () => {
  test("--template only counts when it carries a value", () => {
    expect(templateFlag({ template: "fixture" })).toBe("fixture");
    expect(templateFlag({ template: true })).toBeUndefined();
    expect(templateFlag({})).toBeUndefined();
  });

  test("the dependency flags follow the answered source", () => {
    expect(
      dependencyFlags(
        manifest({ fields: ["source"] }),
        { source: "git" },
        { ref: "main", unrelated: "x" },
      ),
    ).toEqual({ source: "git", ref: "main" });
  });

  // Without the source field the scaffold pins the published version.
  test("a template without a source field gets no dependency flags", () => {
    expect(
      dependencyFlags(manifest(), { source: "git" }, { ref: "main" }),
    ).toEqual({});
  });
});

describe("sourceWarnings", () => {
  const withSource = manifest({ fields: ["source"] });

  test("each companion flag names the source it belongs to", () => {
    expect(sourceWarnings(withSource, "npm", { ref: "main" })).toEqual([
      "--ref/--git-url are ignored unless --source=git (current source: npm).",
    ]);
    expect(sourceWarnings(withSource, "git", { "file-path": "../x" })).toEqual([
      "--file-path is ignored unless --source=file (current source: git).",
    ]);
  });

  test("a flag that matches the source stays quiet", () => {
    expect(sourceWarnings(withSource, "git", { ref: "main" })).toEqual([]);
    expect(sourceWarnings(withSource, "file", { "file-path": "../x" })).toEqual(
      [],
    );
  });

  // A template that never asks about the source reports those flags as not
  // applying at all, so warning twice would only repeat itself.
  test("a template without a source field says nothing here", () => {
    expect(sourceWarnings(manifest(), "npm", { ref: "main" })).toEqual([]);
  });
});

describe("--help table", () => {
  // An unavailable template carries a manifest error as its reason, and a
  // manifest error can span lines.
  test("a multi-line cell stays inside its column", () => {
    expect(
      table([
        ["short", "one line"],
        ["a-longer-label", "first line\n  second line"],
      ]),
    ).toEqual([
      "  short           one line",
      "  a-longer-label  first line\n                  second line",
    ]);
  });
});

describe("host repository integration", () => {
  // Both are derived from the target path, so a template landing elsewhere
  // still gets consistent scripts and ignores.
  test("the docs scripts point at the scaffolded folder", () => {
    const scripts = docsScripts("sub/docs");
    expect(scripts["docs:dev"]).toBe("vitepress dev sub/docs");
    expect(scripts["docs:validate"]).toBe(
      "tf-doc-vault validate --root=sub/docs",
    );
    expect(scripts["docs:import-confluence"]).toBe(
      "tf-doc-vault import-confluence",
    );
  });

  test("the gitignore entries point at the scaffolded folder", () => {
    expect(gitignoreEntries("sub/docs")).toEqual([
      "sub/docs/.vitepress/dist/",
      "sub/docs/.vitepress/cache/",
    ]);
  });

  test("merges the docs scripts into the host package.json", () => {
    const dir = tempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "host", scripts: { build: "tsc" } }, null, 2),
    );

    updatePackageJson(dir, "sub/docs");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toBe("tsc");
    expect(pkg.scripts["docs:dev"]).toBe("vitepress dev sub/docs");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // Re-running the wizard must not clobber a script the host repo has tuned.
  test("leaves an already-present script alone", () => {
    const dir = tempDir();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: docsScripts("sub/docs") }, null, 2) + "\n",
    );
    const before = fs.readFileSync(path.join(dir, "package.json"), "utf-8");

    updatePackageJson(dir, "sub/docs");
    expect(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).toBe(
      before,
    );
    expect(log.mock.calls.flat().join("\n")).toMatch(/already present/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("warns instead of failing when the host has no package.json", () => {
    const dir = tempDir();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    updatePackageJson(dir, "sub/docs");
    expect(warn.mock.calls.flat().join("\n")).toMatch(/package.json not found/);
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("appends the build outputs to the host .gitignore exactly once", () => {
    const dir = tempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/");

    updateGitignore(dir, "sub/docs");
    const first = fs.readFileSync(path.join(dir, ".gitignore"), "utf-8");
    expect(first).toBe(
      "node_modules/\nsub/docs/.vitepress/dist/\nsub/docs/.vitepress/cache/\n",
    );

    updateGitignore(dir, "sub/docs");
    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf-8")).toBe(first);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("creates the .gitignore when the host has none", () => {
    const dir = tempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
    updateGitignore(dir, "docs");
    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf-8")).toBe(
      "docs/.vitepress/dist/\ndocs/.vitepress/cache/\n",
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // The scaffolded folder needs `type: module` of its own; the host repo may be
  // CommonJS while the VitePress config is ESM.
  test("writes a minimal package.json, keeping an existing one", () => {
    const dir = tempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
    writeMinimalPackageJson(dir);
    expect(
      JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8")),
    ).toEqual({ private: true, type: "module" });

    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"kept"}');
    writeMinimalPackageJson(dir);
    expect(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).toBe(
      '{"name":"kept"}',
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // pnpm honors workspace config only at the workspace root, so an embedded
  // scaffold renders blank until the consumer patches the ancestor file.
  test("prints the merge instructions for a parent pnpm workspace", () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    warnIfEmbeddedInWorkspace(
      "/repo/service/tech-docs",
      "/repo/pnpm-workspace.yaml",
    );
    const output = write.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("/repo/pnpm-workspace.yaml");
    expect(output).toContain("service/tech-docs/");
    expect(output).toContain("publicHoistPattern");
  });

  test("stays quiet without a parent workspace", () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    warnIfEmbeddedInWorkspace("/repo/docs", null);
    expect(write).not.toHaveBeenCalled();
  });
});

describe("host pnpm workspace settings", () => {
  const SETTINGS: WorkspaceSettings = {
    publicHoistPattern: ["*mermaid*", "dayjs", "d3-*"],
    allowBuilds: { "@techfides/tf-doc-vault": true, esbuild: true },
  };

  // The rendered block is what a brand-new host file gets, and reproducing the
  // boilerplate byte for byte is the proof that there is one source of truth.
  test("renders the boilerplate file it was read from", () => {
    const shipped = fs.readFileSync(
      path.join(REPO_ROOT, "boilerplate/_pnpm-workspace.yaml"),
      "utf-8",
    );
    expect(renderWorkspaceSettings(boilerplateWorkspaceSettings())).toBe(
      shipped,
    );
  });

  test("quotes only the entries YAML would misread", () => {
    expect(renderWorkspaceSettings(SETTINGS)).toBe(
      `publicHoistPattern:
  - "*mermaid*"
  - dayjs
  - d3-*
allowBuilds:
  "@techfides/tf-doc-vault": true
  esbuild: true
`,
    );
  });

  test("a host without the file gets the whole block", () => {
    const merge = mergeWorkspaceSettings("", SETTINGS);
    expect(merge.content).toBe(renderWorkspaceSettings(SETTINGS));
    expect(merge.added).toEqual([
      "*mermaid*",
      "dayjs",
      "d3-*",
      "@techfides/tf-doc-vault",
      "esbuild",
    ]);
  });

  // The host repo's own workspace configuration has to survive untouched, so the
  // merge only appends and never reorders or rewrites.
  test("a partially populated host file keeps its own content and order", () => {
    const existing = `packages:
  - packages/*
publicHoistPattern:
  - dayjs
  - "@internal/*"
allowBuilds:
  esbuild: true
  sharp: false
`;
    const merge = mergeWorkspaceSettings(existing, SETTINGS);
    expect(merge.content).toBe(`packages:
  - packages/*
publicHoistPattern:
  - dayjs
  - "@internal/*"
  - "*mermaid*"
  - d3-*
allowBuilds:
  esbuild: true
  sharp: false
  "@techfides/tf-doc-vault": true
`);
    expect(merge.added).toEqual([
      "*mermaid*",
      "d3-*",
      "@techfides/tf-doc-vault",
    ]);
  });

  // A quoted entry and a bare one are the same pattern, so the quoted form the
  // boilerplate ships must not be added a second time.
  test("an already complete host file is left exactly as it is", () => {
    const existing = renderWorkspaceSettings(SETTINGS);
    const merge = mergeWorkspaceSettings(existing, SETTINGS);
    expect(merge.added).toEqual([]);
    expect(merge.content).toBe(existing);
  });

  test("running the merge again finds nothing to add", () => {
    const first = mergeWorkspaceSettings("packages:\n  - .\n", SETTINGS);
    const second = mergeWorkspaceSettings(first.content, SETTINGS);
    expect(second.added).toEqual([]);
    expect(second.content).toBe(first.content);
  });

  test("a key with no entries yet is filled in", () => {
    const merge = mergeWorkspaceSettings(
      "publicHoistPattern:\nallowBuilds:\n",
      SETTINGS,
    );
    expect(merge.content).toBe(renderWorkspaceSettings(SETTINGS));
  });

  test("the host's own indentation is followed", () => {
    const merge = mergeWorkspaceSettings(
      "publicHoistPattern:\n    - dayjs\n",
      SETTINGS,
    );
    expect(merge.content).toContain('\n    - "*mermaid*"\n');
  });

  test("a missing trailing newline does not glue two entries together", () => {
    const merge = mergeWorkspaceSettings("publicHoistPattern:\n  - dayjs", {
      publicHoistPattern: ["debug"],
      allowBuilds: {},
    });
    expect(merge.content).toBe("publicHoistPattern:\n  - dayjs\n  - debug\n");
  });

  // Appending list items under a flow-style key would produce invalid YAML, so
  // the merge reports it instead of corrupting the host file.
  test("a flow-style host key is reported for a manual merge", () => {
    const existing = 'publicHoistPattern: ["dayjs"]\n';
    const merge = mergeWorkspaceSettings(existing, SETTINGS);
    expect(merge.manual).toBe(true);
    expect(merge.content).toBe(existing);

    const dir = tempDir();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fs.writeFileSync(path.join(dir, "pnpm-workspace.yaml"), existing);
    updatePnpmWorkspace(dir, SETTINGS);
    expect(
      fs.readFileSync(path.join(dir, "pnpm-workspace.yaml"), "utf-8"),
    ).toBe(existing);
    expect(warn.mock.calls.flat().join("\n")).toMatch(/by hand/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("a comment after the key is not read as an inline value", () => {
    const merge = mergeWorkspaceSettings(
      "publicHoistPattern: # mermaid needs these\n  - dayjs\n",
      SETTINGS,
    );
    expect(merge.manual).toBe(false);
    expect(merge.content).toContain('  - "*mermaid*"');
  });

  test("creates the file when the host repo has none", () => {
    const dir = tempDir();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    updatePnpmWorkspace(dir, SETTINGS);
    expect(
      fs.readFileSync(path.join(dir, "pnpm-workspace.yaml"), "utf-8"),
    ).toBe(renderWorkspaceSettings(SETTINGS));
    expect(log.mock.calls.flat().join("\n")).toMatch(
      /pnpm-workspace\.yaml created \(\+5 entries\)/,
    );

    updatePnpmWorkspace(dir, SETTINGS);
    expect(log.mock.calls.flat().join("\n")).toMatch(/already present/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("host documentation dependencies", () => {
  /** Deliberately unsorted, so the sorting of what gets written is visible. */
  const PEERS: Record<string, string> = {
    vitepress: "^1.6.4",
    "vitepress-plugin-mermaid": "^2.0.17",
    mermaid: "^11.14.0",
    vue: "^3.5.33",
  };

  function hostPkg(dir: string): Record<string, unknown> {
    return JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf-8"),
    ) as Record<string, unknown>;
  }

  test("reports nothing when the host declares every peer", () => {
    expect(missingDependencies(PEERS, { devDependencies: PEERS })).toEqual({});
  });

  test("reports the peers the host is missing, sorted", () => {
    const missing = missingDependencies(PEERS, {
      devDependencies: { vitepress: "^1.6.4", typescript: "^6.0.0" },
    });
    expect(Object.keys(missing)).toEqual([
      "mermaid",
      "vitepress-plugin-mermaid",
      "vue",
    ]);
    expect(missing.mermaid).toBe("^11.14.0");
  });

  test("reports every peer for a host with no dependencies at all", () => {
    expect(missingDependencies(PEERS, {})).toEqual(PEERS);
  });

  // An application repo can legitimately ship vue as a runtime dependency, so
  // the runtime block counts as declared too.
  test("treats a runtime dependency as declared", () => {
    const missing = missingDependencies(PEERS, {
      dependencies: { vue: "^3.4.0" },
    });
    expect(Object.keys(missing)).not.toContain("vue");
  });

  // Downgrading a range the host repo pinned on purpose would break its build.
  test("leaves a different range the host already pins alone", () => {
    const dir = tempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ devDependencies: { vitepress: "1.5.0" } }, null, 2) +
        "\n",
    );

    updateDevDependencies(dir, PEERS);
    expect(hostPkg(dir).devDependencies).toEqual({
      mermaid: "^11.14.0",
      vitepress: "1.5.0",
      "vitepress-plugin-mermaid": "^2.0.17",
      vue: "^3.5.33",
    });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("writes sorted entries and keeps the unrelated fields and the format", () => {
    const dir = tempDir();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify(
        { name: "host", scripts: { build: "tsc" }, devDependencies: {} },
        null,
        2,
      ) + "\n",
    );

    updateDevDependencies(dir, PEERS);
    const written = fs.readFileSync(path.join(dir, "package.json"), "utf-8");
    expect(written).toBe(
      JSON.stringify(
        {
          name: "host",
          scripts: { build: "tsc" },
          devDependencies: {
            mermaid: "^11.14.0",
            vitepress: "^1.6.4",
            "vitepress-plugin-mermaid": "^2.0.17",
            vue: "^3.5.33",
          },
        },
        null,
        2,
      ) + "\n",
    );
    expect(log.mock.calls.flat().join("\n")).toMatch(/\+4 devDependencies/);

    // Re-running the wizard is safe.
    updateDevDependencies(dir, PEERS);
    expect(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).toBe(
      written,
    );
    expect(log.mock.calls.flat().join("\n")).toMatch(/already present/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("warns instead of failing when the host has no package.json", () => {
    const dir = tempDir();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    updateDevDependencies(dir, PEERS);
    expect(warn.mock.calls.flat().join("\n")).toMatch(/package.json not found/);
    expect(fs.existsSync(path.join(dir, "package.json"))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // The ranges must come from this package's own peerDependencies: a hardcoded
  // copy would go stale on the next bump, and that is how vue went missing.
  test("takes the ranges from the package's peerDependencies", () => {
    const declared = (
      JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"),
      ) as { peerDependencies: Record<string, string> }
    ).peerDependencies;

    expect(packagePeerDependencies()).toEqual(declared);
    expect(Object.keys(declared)).toContain("vue");
    expect(missingDependencies(packagePeerDependencies(), {})).toEqual(
      declared,
    );
  });

  test("reads the peers from the package directory it is given", () => {
    const dir = tempDir();
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ peerDependencies: { "made-up": "^0.0.1" } }),
    );
    expect(packagePeerDependencies(dir)).toEqual({ "made-up": "^0.0.1" });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // The generated docs:* scripts call this package's binary and the generated
  // VitePress config imports from it, so a host that only gets the peers has a
  // scaffold that cannot boot.
  test("includes this package itself, at the resolved dependency spec", () => {
    const deps = documentationDependencies({}, tempDir());
    const self = packageName();
    expect(Object.keys(deps)).toEqual(
      expect.arrayContaining([...Object.keys(packagePeerDependencies()), self]),
    );
    expect(deps[self]).toBe(
      JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"))
        .version,
    );
  });

  test("points at a local checkout when the source says so", () => {
    const host = tempDir();
    const deps = documentationDependencies({ dev: true }, host);
    expect(deps[packageName()]).toMatch(/^file:/);
    fs.rmSync(host, { recursive: true, force: true });
  });
});

describe("nextSteps", () => {
  function withInfra(): { cwd: string; targetDir: string } {
    const cwd = tempDir();
    const targetDir = path.join(cwd, "demo_ana");
    fs.mkdirSync(path.join(targetDir, "infra"), { recursive: true });
    return { cwd, targetDir };
  }

  // The epilogue told the reader to cd into the target and then printed the
  // infra path from the cwd again, so copy-pasting landed a level too deep.
  test("paths after the cd are relative to the target", () => {
    const { cwd, targetDir } = withInfra();
    const epilogue = nextSteps({
      manifest: manifest(),
      answers: { name: "demo_ana" },
      targetDir,
      cwd,
      dependency: "0.2.10",
      gitInitialized: false,
    });
    expect(epilogue).toContain("cd demo_ana\n");
    expect(epilogue).toContain("cd infra\n");
    expect(epilogue).not.toContain("cd demo_ana/infra");
    expect(epilogue).toContain("git add .\n");
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  // The host-driven flavour never cds, so its paths stay relative to the cwd.
  test("paths stay relative to the cwd when the host repo drives the scripts", () => {
    const { cwd, targetDir } = withInfra();
    const epilogue = nextSteps({
      manifest: manifest({
        target: { mode: "subfolder", path: "demo_ana" },
        host: {
          packageJsonScripts: true,
          devDependencies: true,
          gitignore: true,
          minimalPackageJson: true,
          pnpmWorkspace: true,
        },
      }),
      answers: {},
      targetDir,
      cwd,
      dependency: "0.2.10",
      gitInitialized: false,
    });
    expect(epilogue).not.toContain("cd demo_ana\n");
    expect(epilogue).toContain("cd demo_ana/infra\n");
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  // The wizard writes the dependencies and the pnpm settings itself, so the
  // epilogue no longer asks the reader to paste either into a file by hand.
  test("the host flavour is not told to edit files by hand", () => {
    const cwd = tempDir();
    const targetDir = path.join(cwd, "sub");
    fs.mkdirSync(targetDir);
    const epilogue = nextSteps({
      manifest: manifest({
        target: { mode: "subfolder", path: "sub" },
        host: {
          packageJsonScripts: true,
          devDependencies: true,
          gitignore: true,
          minimalPackageJson: true,
          pnpmWorkspace: true,
        },
      }),
      answers: {},
      targetDir,
      cwd,
      dependency: "0.2.10",
      gitInitialized: false,
    });
    expect(epilogue).not.toContain("vitepress-plugin-mermaid");
    expect(epilogue).not.toContain("devDependencies");
    expect(epilogue).not.toContain("allowBuilds");
    expect(epilogue).not.toContain("pnpm-workspace.yaml");
    expect(epilogue).toContain("pnpm install && pnpm docs:dev");
    expect(epilogue).toMatch(/1\)[\s\S]*2\)/);
    expect(epilogue).not.toContain("3)");
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  test("the file: hint is relative to the cwd, where it is printed", () => {
    const { cwd, targetDir } = withInfra();
    const epilogue = nextSteps({
      manifest: manifest(),
      answers: { name: "demo_ana" },
      targetDir,
      cwd,
      dependency: "file:../../pkg",
      gitInitialized: true,
    });
    expect(epilogue).toContain(
      `(cd ${path.relative(cwd, REPO_ROOT)} && pnpm install)`,
    );
    expect(epilogue).toContain(originUrl("demo_ana"));
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  test("no infra folder means no deploy block", () => {
    const cwd = tempDir();
    const targetDir = path.join(cwd, "sub");
    fs.mkdirSync(targetDir);
    const epilogue = nextSteps({
      manifest: manifest({ target: { mode: "subfolder", path: "sub" } }),
      answers: {},
      targetDir,
      cwd,
      dependency: "0.2.10",
      gitInitialized: false,
    });
    expect(epilogue).not.toContain("terraform");
    fs.rmSync(cwd, { recursive: true, force: true });
  });
});
