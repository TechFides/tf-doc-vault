import { describe, test, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BOILERPLATE_DIR,
  applyCopyPlan,
  consumerName,
  listTemplates,
  parseTemplateManifest,
  resolveCopyPlan,
  type TemplateManifest,
} from "../../../src/cli/scaffold.js";

const MANIFEST = `---
name: demo
label: Demo template
target:
  mode: subfolder
  path: sub
base: /demo/
sectionNav: false
fields: [project, deploy-files]
defaults:
  deploy-files: false
exclude:
  - dropped.txt
deployFiles:
  - deploy.txt
renames:
  nested/config.ts: nested/config.mts
host:
  packageJsonScripts: true
  gitignore: false
  minimalPackageJson: false
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
  write(path.join(boilerplate, "deploy.txt"), "deploy\n");
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
    expect(manifest.fields).toEqual(["project", "deploy-files"]);
    expect(manifest.defaults).toEqual({ "deploy-files": false });
    expect(manifest.exclude).toEqual(["dropped.txt"]);
    expect(manifest.deployFiles).toEqual(["deploy.txt"]);
    expect(manifest.renames).toEqual({
      "nested/config.ts": "nested/config.mts",
    });
    expect(manifest.host).toEqual({
      packageJsonScripts: true,
      gitignore: false,
      minimalPackageJson: false,
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

  test("rejects a file without frontmatter", () => {
    expect(() => fixtureManifest("Just prose.\n")).toThrow(
      /missing YAML frontmatter block/,
    );
  });
});

describe("listTemplates", () => {
  test("discovers the templates shipped with the package", () => {
    const names = listTemplates().map((t) => t.name);
    expect(names).toEqual([...names].sort());
    expect(names.length).toBeGreaterThan(0);
    for (const manifest of listTemplates()) {
      expect(manifest.label).not.toBe("");
      expect(manifest.dir.endsWith(manifest.name)).toBe(true);
    }
  });

  test("reads the fixture folder as its own source of truth", () => {
    const found = listTemplates({
      templatesDir: templates,
      boilerplateDir: boilerplate,
    });
    expect(found.map((t) => t.name)).toEqual(["demo"]);
  });

  test("fails on a template folder without a manifest", () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-bare-"));
    fs.mkdirSync(path.join(bare, "nameless"));
    expect(() =>
      listTemplates({ templatesDir: bare, boilerplateDir: boilerplate }),
    ).toThrow(/missing manifest file/);
    fs.rmSync(bare, { recursive: true, force: true });
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

  test("always excludes the manifest, plus the deploy files when not wanted", () => {
    const manifest = fixtureManifest();
    const without = resolveCopyPlan(
      manifest,
      {},
      { cwd: root, boilerplateDir: boilerplate },
    );
    expect(without.exclude).toEqual([
      "_template.md",
      "dropped.txt",
      "deploy.txt",
    ]);

    const with_ = resolveCopyPlan(
      manifest,
      { "deploy-files": true },
      { cwd: root, boilerplateDir: boilerplate },
    );
    expect(with_.exclude).toEqual(["_template.md", "dropped.txt"]);
  });

  test("fills the base and sectionNav placeholders from the manifest", () => {
    const plan = resolveCopyPlan(
      fixtureManifest(),
      {},
      { cwd: root, boilerplateDir: boilerplate },
    );
    expect(plan.placeholders).toEqual({
      __DOCS_BASE__: "/demo/",
      __SECTION_NAV__: "false",
    });
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
    ).toThrow(/needs a project name/);
  });
});

describe("consumerName", () => {
  // `npm pack` strips these dotfiles, hence the underscore-prefixed sources.
  test("restores the dotfile names the package cannot ship", () => {
    expect(consumerName("_gitignore")).toBe(".gitignore");
    expect(consumerName("_npmrc")).toBe(".npmrc");
    expect(consumerName("_pnpm-workspace.yaml")).toBe("pnpm-workspace.yaml");
    expect(consumerName("Dockerfile")).toBe("Dockerfile");
  });
});

describe("applyCopyPlan", () => {
  function planInto(
    dir: string,
    answers = {},
  ): ReturnType<typeof resolveCopyPlan> {
    const plan = resolveCopyPlan(fixtureManifest(), answers, {
      cwd: dir,
      boilerplateDir: boilerplate,
    });
    return plan;
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
    expect(fs.existsSync(path.join(plan.target, "deploy.txt"))).toBe(false);
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

  test("copies the deploy files once the answer asks for them", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-out-"));
    const plan = planInto(cwd, { "deploy-files": true });
    applyCopyPlan(plan);
    expect(fs.existsSync(path.join(plan.target, "deploy.txt"))).toBe(true);
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
});

describe("shipped boilerplate", () => {
  test("every template resolves its copy plan against it", () => {
    for (const manifest of listTemplates()) {
      const plan = resolveCopyPlan(manifest, { name: "probe" }, { cwd: root });
      expect(plan.sources[0]).toBe(BOILERPLATE_DIR);
      for (const entry of [...manifest.exclude, ...manifest.deployFiles]) {
        expect(fs.existsSync(path.join(BOILERPLATE_DIR, entry))).toBe(true);
      }
      for (const from of Object.keys(manifest.renames)) {
        expect(fs.existsSync(path.join(BOILERPLATE_DIR, from))).toBe(true);
      }
    }
  });
});
