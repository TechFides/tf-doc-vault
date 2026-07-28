import { describe, test, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BOILERPLATE_DIR,
  applyCopyPlan,
  consumerName,
  resolveCopyPlan,
  resolveDependencyValue,
  scanTemplates,
  type Answer,
  type TemplateManifest,
} from "../../../src/cli/scaffold.js";
import {
  dependencyFlags,
  resolveAnswers,
  resolvePlaceholders,
  type PromptFn,
} from "../../../src/cli/setup.js";
import {
  BINARY_EXTENSIONS,
  replacePlaceholders,
} from "../../../src/cli/utils.js";

const PLACEHOLDER = /__[A-Z0-9_]+__/g;

/** Empty on purpose: the consumer fills these into their own CI variables. */
const INTENTIONALLY_EMPTY = ["__BASIC_AUTH_USER__", "__BASIC_AUTH_PASS__"];

/**
 * Values for the fields no catalog default covers. A new field without a default
 * makes resolveAnswers report it as missing, which is the signal to add it here
 * rather than to loosen the test.
 */
const PROBE_NAME = "probe_proj";
const PROBE_FLAGS: Record<string, string | boolean> = { "service-id": "PRB" };

const NO_PROMPTS: PromptFn = (request) => {
  throw new Error(`prompted for "${request.key}" without a TTY`);
};

const scan = scanTemplates();
const sandboxes: string[] = [];

afterAll(() => {
  for (const dir of sandboxes) fs.rmSync(dir, { recursive: true, force: true });
});

interface Scaffold {
  target: string;
  /** Every placeholder the wizard hands to replacePlaceholders. */
  placeholders: Record<string, string>;
}

/** Runs the same chain as the wizard, minus the prompts and the post-steps. */
async function scaffold(manifest: TemplateManifest): Promise<Scaffold> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "shipped-"));
  sandboxes.push(cwd);

  const { answers } = await resolveAnswers(
    manifest,
    { projectName: PROBE_NAME, flags: PROBE_FLAGS },
    NO_PROMPTS,
    { cwd, interactive: false },
  );
  const plan = resolveCopyPlan(manifest, answers, { cwd });
  applyCopyPlan(plan);

  const dependency = resolveDependencyValue(
    dependencyFlags(manifest, answers, PROBE_FLAGS),
    plan.target,
  );
  return {
    target: plan.target,
    placeholders: resolvePlaceholders(manifest, answers, {
      __VITEPRESS_COMMON_DEP__: dependency,
      __DATE__: new Date().toISOString().slice(0, 10),
    }),
  };
}

/** Placeholder tokens the copied files ask to have filled, with their files. */
function tokensIn(dir: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      for (const token of fs.readFileSync(full, "utf-8").match(PLACEHOLDER) ??
        []) {
        found.set(token, [
          ...(found.get(token) ?? []),
          path.relative(dir, full),
        ]);
      }
    }
  };
  walk(dir);
  return found;
}

function* walkRelative(dir: string, prefix = ""): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      yield* walkRelative(path.join(dir, entry.name), rel);
      continue;
    }
    yield rel;
  }
}

test("the package ships usable templates only", () => {
  expect(scan.unavailable).toEqual([]);
  expect(scan.templates.length).toBeGreaterThan(0);
});

// The guard that a template renders completely: it fails when a template's files
// need a placeholder nothing fills, when a field is wired to a placeholder it
// never sets, and when a value the files need resolves empty.
describe.each(
  scan.templates.map((manifest) => [manifest.name, manifest] as const),
)("template %s", (_name, manifest) => {
  test("every placeholder its files use is one the wizard can fill", async () => {
    const { target, placeholders } = await scaffold(manifest);
    const needed = tokensIn(target);
    expect(needed.size).toBeGreaterThan(0);

    for (const [token, files] of needed) {
      expect(
        Object.keys(placeholders),
        `${token} is used in ${files.join(", ")} but nothing fills it`,
      ).toContain(token);
    }
  });

  test("no value its files need resolves empty", async () => {
    const { target, placeholders } = await scaffold(manifest);
    for (const [token, files] of tokensIn(target)) {
      if (INTENTIONALLY_EMPTY.includes(token)) continue;
      expect(
        placeholders[token],
        `${token} resolves empty in ${files.join(", ")}`,
      ).not.toBe("");
    }
  });

  test("the rendered scaffold keeps no placeholder literal", async () => {
    const { target, placeholders } = await scaffold(manifest);
    replacePlaceholders(target, placeholders);
    expect([...tokensIn(target).keys()]).toEqual([]);
  });

  test("produces a VitePress project with the template's own content", async () => {
    const { target } = await scaffold(manifest);
    const entries = new Set(walkRelative(target));
    // The renames map is applied while staging, so the config file lands under
    // whichever name the manifest asked for.
    const config =
      manifest.renames["docs/.vitepress/config.ts"] ??
      "docs/.vitepress/config.ts";
    expect(entries).toContain(config);
    expect(entries).toContain("docs/index.md");
    expect(entries).toContain("docs/v1/index.md");
    expect([...entries].filter((rel) => rel.endsWith("_template.md"))).toEqual(
      [],
    );
  });

  // The boilerplate is the first copy source, so everything it ships that the
  // manifest does not exclude has to arrive, and nothing else may.
  test("carries exactly the boilerplate entries the manifest keeps", async () => {
    const { target } = await scaffold(manifest);
    for (const entry of fs.readdirSync(BOILERPLATE_DIR)) {
      const landed = consumerName(entry);
      const present = fs.existsSync(path.join(target, landed));
      expect(present, `${landed} in the ${manifest.name} scaffold`).toBe(
        !manifest.exclude.includes(entry),
      );
    }
  });
});
