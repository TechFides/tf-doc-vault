import { describe, test, expect, beforeAll, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(REPO_ROOT, "dist/scripts/build-print-page.js");

let workdirs: string[] = [];

beforeAll(() => {
  if (!fs.existsSync(SCRIPT)) {
    throw new Error(
      `${SCRIPT} not found. Run \`pnpm build\` before \`pnpm test:unit\`.`,
    );
  }
});

/** docs/ is hardcoded relative to the cwd, so each test needs its own temp tree. */
function runPrint(files: Record<string, string>): string {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"));
  workdirs.push(workdir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(workdir, "docs", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const r = spawnSync("node", [SCRIPT], { cwd: workdir, encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`build-print-page exited ${r.status}: ${r.stderr}`);
  }
  return fs.readFileSync(path.join(workdir, "docs", "print.md"), "utf-8");
}

afterEach(() => {
  for (const dir of workdirs) fs.rmSync(dir, { recursive: true, force: true });
  workdirs = [];
});

function page(title: string, order: number, body: string): string {
  return `---\ntitle: ${title}\norder: ${order}\n---\n\n${body}\n`;
}

describe("build-print-page", () => {
  test("emits pages in order, not alphabetically", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/skupina/index.md": page("Skupina", 1, "skupina"),
      "v1/sekce/skupina/zeta.md": page("Zeta", 1, "obsah zeta"),
      "v1/sekce/skupina/alfa.md": page("Alfa", 2, "obsah alfa"),
    });

    expect(out).toContain("obsah zeta");
    expect(out).toContain("obsah alfa");
    expect(out.indexOf("obsah zeta")).toBeLessThan(out.indexOf("obsah alfa"));
  });

  test("sections and groups follow order from their index.md", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/zeta/index.md": page("Zeta", 1, "z"),
      "v1/zeta/g/index.md": page("G", 1, "g"),
      "v1/zeta/g/p.md": page("P", 1, "ze zety"),
      "v1/alfa/index.md": page("Alfa", 2, "a"),
      "v1/alfa/g/index.md": page("G", 1, "g"),
      "v1/alfa/g/p.md": page("P", 1, "z alfy"),
    });

    expect(out).toContain("ze zety");
    expect(out).toContain("z alfy");
    expect(out.indexOf("ze zety")).toBeLessThan(out.indexOf("z alfy"));
  });

  test("names a section once in the contents when a subgroup splits its pages", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/prvni.md": page("První", 1, "obsah prvni"),
      "v1/sekce/skupina/index.md": page("Skupina", 2, "skupina"),
      "v1/sekce/skupina/list.md": page("List", 1, "obsah list"),
      "v1/sekce/treti.md": page("Třetí", 3, "obsah treti"),
    });

    const contents = out.slice(out.indexOf("## Obsah"), out.indexOf("<div"));
    expect(contents).toContain("**Sekce**");
    expect(contents).toContain("**Skupina**");
    expect(contents.match(/\*\*Sekce\*\*/g)).toHaveLength(1);

    expect(contents.indexOf("První")).toBeLessThan(
      contents.indexOf("**Skupina**"),
    );
    expect(contents.indexOf("**Skupina**")).toBeLessThan(
      contents.indexOf("Třetí"),
    );
  });

  test("collects a page nested three levels below a section", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/skupina/index.md": page("Skupina", 1, "skupina"),
      "v1/sekce/skupina/hluboko.md": page("Hluboko", 1, "obsah hluboko"),
    });

    expect(out).toContain("obsah hluboko");
  });

  test("a group whose index.md has no title falls back to the folder name", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/skupina/index.md": "---\norder: 1\n---\n\nbez titulku\n",
      "v1/sekce/skupina/list.md": page("List", 1, "obsah listu"),
    });

    expect(out).toContain("**skupina**");
    expect(out).not.toContain("**index**");
  });
});

describe("internal links", () => {
  const out = (): string =>
    runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/alfa.md": page(
        "Alfa",
        1,
        [
          "[no extension](./beta)",
          "[with extension](./beta.md)",
          "[root absolute](/v1/sekce/beta)",
          "[with anchor](./beta#nadpis)",
          "[a group index](./skupina/)",
          "[an asset](/diagram.svg)",
          "[a bare parent](../)",
          "![an image](./picture.png)",
        ].join("\n\n"),
      ),
      "v1/sekce/beta.md": page("Beta", 2, "cíl"),
      "v1/sekce/skupina/index.md": page("Skupina", 3, "skupina"),
      "v1/sekce/skupina/list.md": page("List", 1, "list"),
    });

  test("rewrites every form of a link to an emitted page into one anchor", () => {
    const printed = out();

    expect(printed).toContain("[no extension](#v1-sekce-beta)");
    expect(printed).toContain("[with extension](#v1-sekce-beta)");
    expect(printed).toContain("[root absolute](#v1-sekce-beta)");
    expect(printed).toContain("[with anchor](#v1-sekce-beta)");
  });

  test("drops the link but keeps the text when the target is not emitted", () => {
    const printed = out();

    expect(printed).toContain("a group index");
    expect(printed).not.toContain("(./skupina/)");
    expect(printed).toContain("a bare parent");
    expect(printed).not.toContain("(../)");
  });

  test("leaves assets and images alone", () => {
    const printed = out();

    expect(printed).toContain("[an asset](/diagram.svg)");
    expect(printed).toContain("![an image](./picture.png)");
  });
});
