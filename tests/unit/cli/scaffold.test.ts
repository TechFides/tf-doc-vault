import { describe, test, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyCopyPlan,
  boilerplateName,
  boilerplateWorkspaceSettings,
  consumerName,
  parseTemplateManifest,
  placeholderValues,
  resolveCopyPlan,
  scanTemplates,
  type TemplateManifest,
} from "../../../src/cli/scaffold.js";
import { SetupError } from "../../../src/cli/utils.js";

const MANIFEST = `---
name: demo
label: Demo template
target:
  mode: subfolder
  path: sub
base: /demo/
sectionNav: false
fields: [project, repo]
defaults:
  repo: org/__PROJECT_DASHED__
exclude:
  - dropped.txt
renames:
  nested/config.ts: nested/config.mts
host:
  packageJsonScripts: true
  devDependencies: true
  gitignore: false
  minimalPackageJson: false
  pnpmWorkspace: false
git:
  init: false
lockfile: false
workspaceWarning: false
---

Prose body of the manifest.
`;

let root: string;
let boilerplate: string;
let templates: string;

function fixtureManifest(source = MANIFEST): TemplateManifest {
  return parseTemplateManifest(
    source,
    "demo",
    path.join(templates, "demo"),
    boilerplate,
  );
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-test-"));
  boilerplate = path.join(root, "boilerplate");
  templates = path.join(root, "templates");

  write(path.join(boilerplate, "shared.md"), "from the boilerplate\n");
  write(path.join(boilerplate, "dropped.txt"), "excluded\n");
  write(path.join(boilerplate, "_gitignore"), "dist/\n");
  write(path.join(boilerplate, "nested/config.ts"), "export default {};\n");

  write(path.join(templates, "demo/_template.md"), MANIFEST);
  write(path.join(templates, "demo/shared.md"), "from the template\n");
  write(path.join(templates, "demo/docs/index.md"), "# Index\n");
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("manifest parsing", () => {
  test("reads the frontmatter and keeps the body as the description", () => {
    const manifest = fixtureManifest();
    expect(manifest.name).toBe("demo");
    expect(manifest.label).toBe("Demo template");
    expect(manifest.target).toEqual({ mode: "subfolder", path: "sub" });
    expect(manifest.base).toBe("/demo/");
    expect(manifest.sectionNav).toBe(false);
    expect(manifest.fields).toEqual(["project", "repo"]);
    expect(manifest.defaults).toEqual({ repo: "org/__PROJECT_DASHED__" });
    expect(manifest.exclude).toEqual(["dropped.txt"]);
    expect(manifest.renames).toEqual({
      "nested/config.ts": "nested/config.mts",
    });
    expect(manifest.host).toEqual({
      packageJsonScripts: true,
      devDependencies: true,
      gitignore: false,
      minimalPackageJson: false,
      pnpmWorkspace: false,
    });
    expect(manifest.git).toEqual({ init: false });
    expect(manifest.description).toBe("Prose body of the manifest.");
  });

  // An unknown key is a typo in a config nobody reads back, so it fails loudly.
  test("rejects an unknown key", () => {
    expect(() => fixtureManifest(MANIFEST.replace("base:", "bass:"))).toThrow(
      /unknown key "bass"/,
    );
  });

  test("rejects an unknown nested key", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("  init: false", "  innit: false")),
    ).toThrow(/unknown key "git.innit"/);
  });

  test("rejects a path that is not in the boilerplate", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("- dropped.txt", "- ghost.txt")),
    ).toThrow(/"exclude" lists "ghost.txt", which is not in the boilerplate/);
  });

  // copyDir filters excluded names only at the root of each source.
  test("rejects a nested exclude path", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("- dropped.txt", "- nested/config.ts")),
    ).toThrow(/top-level boilerplate entries only/);
  });

  test("rejects a name that disagrees with the folder", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("name: demo", "name: other")),
    ).toThrow(/"name" is "other" but the folder is "demo"/);
  });

  test("rejects subfolder mode without a path", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("  path: sub\n", "")),
    ).toThrow(/needs "target.path"/);
  });

  test("rejects a missing required key", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("lockfile: false\n", "")),
    ).toThrow(/missing key "lockfile"/);
  });

  // Required, so a template never touches the host repo by omission.
  test("rejects a missing host key", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("  devDependencies: true\n", "")),
    ).toThrow(/"host.devDependencies" must be true or false/);
  });

  test("rejects a file without frontmatter", () => {
    expect(() => fixtureManifest("Just prose.\n")).toThrow(
      /missing YAML frontmatter block/,
    );
  });

  // A manifest problem is the maintainer's to fix, so it reaches them as a
  // message rather than as a stack trace.
  test("raises the CLI error type, prefixed with the offending file", () => {
    expect(() => fixtureManifest("Just prose.\n")).toThrow(SetupError);
    expect(() => fixtureManifest("Just prose.\n")).toThrow(
      /^demo\/_template\.md: /,
    );
  });
});

describe("fields and defaults validation", () => {
  // Unvalidated, a typo here scaffolds successfully with every placeholder empty.
  test("rejects a field the catalog does not know", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("[project, repo]", "[project, servr]")),
    ).toThrow(/"fields" lists "servr", which is not a wizard field/);
  });

  test("names the known fields so the typo is easy to spot", () => {
    expect(() =>
      fixtureManifest(MANIFEST.replace("[project, repo]", "[analitycs]")),
    ).toThrow(/Known fields: .*\banalytics\b/);
  });

  test("rejects a default for a field that is not in fields", () => {
    expect(() =>
      fixtureManifest(
        MANIFEST.replace("  repo: org/__PROJECT_DASHED__", "  server: nginx"),
      ),
    ).toThrow(/"defaults.server" is not listed in "fields"/);
  });

  // `--source=totally-bogus` is rejected, so the manifest route must be too.
  test("rejects a default that fails its field's option list", () => {
    expect(() =>
      fixtureManifest(
        MANIFEST.replace("[project, repo]", "[project, repo, source]").replace(
          "  repo: org/__PROJECT_DASHED__",
          "  source: totally-bogus",
        ),
      ),
    ).toThrow(/"defaults.source" is invalid: Use npm \| git \| file\./);
  });

  test("rejects a default that fails its field's validator", () => {
    expect(() =>
      fixtureManifest(
        MANIFEST.replace("[project, repo]", "[name, repo]").replace(
          "  repo: org/__PROJECT_DASHED__",
          "  name: Not A Name",
        ),
      ),
    ).toThrow(/"defaults.name" is invalid: Use lowercase letters/);
  });

  test("rejects a scalar of the wrong shape for its field type", () => {
    expect(() =>
      fixtureManifest(
        MANIFEST.replace("[project, repo]", "[project, git]").replace(
          "  repo: org/__PROJECT_DASHED__",
          "  git: yesplease",
        ),
      ),
    ).toThrow(/"defaults.git" must be true or false/);
  });

  // Fields resolve in catalog order, not in the order "fields" lists them.
  test("rejects a placeholder no field resolved before it fills", () => {
    expect(() =>
      fixtureManifest(
        MANIFEST.replace(
          "  repo: org/__PROJECT_DASHED__",
          "  repo: org/__GCP_PROJECT__",
        ),
      ),
    ).toThrow(
      /"defaults.repo" uses __GCP_PROJECT__, which no field resolved before "repo" fills/,
    );
  });

  test("accepts a placeholder an earlier field fills", () => {
    expect(fixtureManifest().defaults.repo).toBe("org/__PROJECT_DASHED__");
  });
});

describe("boilerplateWorkspaceSettings", () => {
  // The wizard merges these into a host repo, so a copy in the code goes stale.
  test("reads the hoist patterns and build approvals the boilerplate ships", () => {
    const settings = boilerplateWorkspaceSettings();
    expect(settings.publicHoistPattern).toContain("*mermaid*");
    expect(settings.publicHoistPattern).toContain("dayjs");
    expect(settings.allowBuilds).toEqual({
      "@techfides/tf-doc-vault": true,
      esbuild: true,
    });
  });

  // The real file quotes the patterns YAML would read as an alias or an
  // indicator, so both forms have to come back as the same value.
  test("reads the boilerplate directory it is given, unquoting entries", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-ws-"));
    write(
      path.join(dir, "_pnpm-workspace.yaml"),
      'publicHoistPattern:\n  - "@scope/*"\n  - plain\nallowBuilds:\n  "@a/b": true\n',
    );
    expect(boilerplateWorkspaceSettings(dir)).toEqual({
      publicHoistPattern: ["@scope/*", "plain"],
      allowBuilds: { "@a/b": true },
    });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("a file without the two keys is a CLI error", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-ws-"));
    write(path.join(dir, "_pnpm-workspace.yaml"), "packages:\n  - docs\n");
    expect(() => boilerplateWorkspaceSettings(dir)).toThrow(SetupError);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("placeholderValues", () => {
  // One map feeds both the interpolated defaults and the file contents, so the
  // precedence between two fields filling the same placeholder is defined once.
  test("the last catalog field the template asks about wins", () => {
    expect(
      placeholderValues(["name", "project"], {
        name: "from_name",
        project: "from_project",
      }),
    ).toEqual({
      __PROJECT__: "from_project",
      __PROJECT_DASHED__: "from-project",
    });
  });

  test("a field outside the template contributes nothing", () => {
    expect(
      placeholderValues(["name"], { name: "kept", project: "ignored" }),
    ).toEqual({ __PROJECT__: "kept", __PROJECT_DASHED__: "kept" });
  });

  test("an unanswered field leaves its placeholders out", () => {
    expect(placeholderValues(["name", "repo"], { name: "demo" })).toEqual({
      __PROJECT__: "demo",
      __PROJECT_DASHED__: "demo",
    });
  });

  // `sectionNav: __SECTION_NAV__` in the generated config is a TypeScript
  // literal, so a confirm answer has to land as `true` / `false`.
  test("a confirm answer lands as a boolean literal", () => {
    expect(
      placeholderValues(["section-nav"], { "section-nav": false }),
    ).toEqual({ __SECTION_NAV__: "false" });
    expect(placeholderValues(["section-nav"], { "section-nav": true })).toEqual(
      {
        __SECTION_NAV__: "true",
      },
    );
  });
});

describe("scanTemplates", () => {
  test("reads the fixture folder as its own source of truth", () => {
    const scan = scanTemplates({
      templatesDir: templates,
      boilerplateDir: boilerplate,
    });
    expect(scan.templates.map((t) => t.name)).toEqual(["demo"]);
    expect(scan.unavailable).toEqual([]);
  });

  test("discovers the templates shipped with the package, sorted", () => {
    const names = scanTemplates().templates.map((t) => t.name);
    expect(names).toEqual([...names].sort());
    expect(names.length).toBeGreaterThan(0);
  });

  // An eager parse of every folder lets one bad manifest take the whole command
  // down, `--help` included.
  test("reports a broken folder as unavailable and keeps the rest usable", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-broken-"));
    fs.mkdirSync(path.join(dir, "nameless"));
    write(path.join(dir, "wrecked/_template.md"), "no frontmatter here\n");
    write(path.join(dir, "demo/_template.md"), MANIFEST);
    write(path.join(dir, "demo/docs/index.md"), "# Index\n");

    const scan = scanTemplates({
      templatesDir: dir,
      boilerplateDir: boilerplate,
    });
    expect(scan.templates.map((t) => t.name)).toEqual(["demo"]);
    expect(scan.unavailable.map((entry) => entry.name)).toEqual([
      "nameless",
      "wrecked",
    ]);
    expect(scan.unavailable[0]?.reason).toMatch(/missing manifest file/);
    expect(scan.unavailable[1]?.reason).toMatch(/missing YAML frontmatter/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("an unreadable templates directory yields an empty scan", () => {
    expect(
      scanTemplates({
        templatesDir: path.join(root, "does-not-exist"),
        boilerplateDir: boilerplate,
      }),
    ).toEqual({ templates: [], unavailable: [] });
  });
});

describe("resolveCopyPlan", () => {
  test("puts the boilerplate first so the template can override it", () => {
    const manifest = fixtureManifest();
    const plan = resolveCopyPlan(
      manifest,
      {},
      { cwd: root, boilerplateDir: boilerplate },
    );
    expect(plan.sources).toEqual([boilerplate, manifest.dir]);
  });

  test("always excludes the manifest, on top of what the template drops", () => {
    const plan = resolveCopyPlan(
      fixtureManifest(),
      {},
      { cwd: root, boilerplateDir: boilerplate },
    );
    expect(plan.exclude).toEqual(["_template.md", "dropped.txt"]);
  });

  test("subfolder mode targets the manifest path, ignoring any name", () => {
    const plan = resolveCopyPlan(
      fixtureManifest(),
      { name: "unused" },
      { cwd: root, boilerplateDir: boilerplate },
    );
    expect(plan.target).toBe(path.join(root, "sub"));
  });

  test("new-folder mode targets the project name and needs one", () => {
    const manifest = fixtureManifest(
      MANIFEST.replace(
        "  mode: subfolder\n  path: sub\n",
        "  mode: new-folder\n",
      ),
    );
    expect(
      resolveCopyPlan(
        manifest,
        { name: "proj" },
        { cwd: root, boilerplateDir: boilerplate },
      ).target,
    ).toBe(path.join(root, "proj"));
    expect(() =>
      resolveCopyPlan(manifest, {}, { cwd: root, boilerplateDir: boilerplate }),
    ).toThrow(SetupError);
    expect(() =>
      resolveCopyPlan(manifest, {}, { cwd: root, boilerplateDir: boilerplate }),
    ).toThrow(/needs a project name/);
  });
});

describe("scaffold renames", () => {
  // `npm pack` strips these names, hence the underscore-prefixed sources.
  test("restores the names the package cannot ship", () => {
    expect(consumerName("_gitignore")).toBe(".gitignore");
    expect(consumerName("_npmrc")).toBe(".npmrc");
    expect(consumerName("_pnpm-workspace.yaml")).toBe("pnpm-workspace.yaml");
    expect(consumerName("Dockerfile")).toBe("Dockerfile");
  });

  // `sync` resolves a baseline through the inverse, so an entry present in one
  // direction only leaves that file without a baseline.
  test("the inverse covers exactly the same entries", () => {
    for (const source of ["_gitignore", "_npmrc", "_pnpm-workspace.yaml"]) {
      expect(boilerplateName(consumerName(source))).toBe(source);
    }
    expect(boilerplateName("Dockerfile")).toBe("Dockerfile");
    expect(boilerplateName("docker/nginx.conf")).toBe("docker/nginx.conf");
  });
});

describe("applyCopyPlan", () => {
  function planInto(dir: string): ReturnType<typeof resolveCopyPlan> {
    return resolveCopyPlan(
      fixtureManifest(),
      {},
      { cwd: dir, boilerplateDir: boilerplate },
    );
  }

  test("lets the later source win and honours excludes and renames", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-out-"));
    const plan = planInto(cwd);
    applyCopyPlan(plan);

    expect(fs.readFileSync(path.join(plan.target, "shared.md"), "utf-8")).toBe(
      "from the template\n",
    );
    expect(fs.existsSync(path.join(plan.target, "_template.md"))).toBe(false);
    expect(fs.existsSync(path.join(plan.target, "dropped.txt"))).toBe(false);
    expect(fs.existsSync(path.join(plan.target, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(plan.target, "nested/config.mts"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(plan.target, "nested/config.ts"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(plan.target, "docs/index.md"))).toBe(true);
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  // The consumer's own edits win, and only the final copy feeds the counters, so
  // an overlap between two sources never counts as a skipped consumer file.
  test("keeps existing files and counts them as skipped", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-out-"));
    const plan = planInto(cwd);
    write(path.join(plan.target, "shared.md"), "edited by the consumer\n");

    const result = applyCopyPlan(plan);
    expect(fs.readFileSync(path.join(plan.target, "shared.md"), "utf-8")).toBe(
      "edited by the consumer\n",
    );
    expect(result.skipped).toBe(1);
    expect(result.copied).toBe(3);
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  test("a rename whose source was excluded is a CLI error", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-out-"));
    const plan = planInto(cwd);
    plan.renames = { "dropped.txt": "kept.txt" };
    expect(() => applyCopyPlan(plan)).toThrow(SetupError);
    fs.rmSync(cwd, { recursive: true, force: true });
  });
});
