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

interface RunOptions {
  /** Written to the project root rather than under docs/, e.g. tf-doc-vault.json. */
  rootFiles?: Record<string, string>;
  args?: string[];
}

/** docs/ is hardcoded relative to the cwd, so each test needs its own temp tree. */
function runPrint(
  files: Record<string, string>,
  options: RunOptions = {},
): string {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "print-"));
  workdirs.push(workdir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(workdir, "docs", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  for (const [rel, content] of Object.entries(options.rootFiles ?? {})) {
    const full = path.join(workdir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const r = spawnSync("node", [SCRIPT, ...(options.args ?? [])], {
    cwd: workdir,
    encoding: "utf-8",
  });
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

    const tocStart = out.indexOf('<div class="tf-print-toc">');
    const contents = out.slice(tocStart, out.indexOf("</div>", tocStart));
    expect(contents).toContain(">Sekce<");
    expect(contents).toContain(">Skupina<");
    expect(contents.match(/>Sekce</g)).toHaveLength(1);

    expect(contents.indexOf(">První<")).toBeLessThan(
      contents.indexOf(">Skupina<"),
    );
    expect(contents.indexOf(">Skupina<")).toBeLessThan(
      contents.indexOf(">Třetí<"),
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

  test("names a group that has no index.md and keeps its pages one level in", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/list.md": page("List", 1, "obsah listu"),
    });

    const toc = out.slice(
      out.indexOf('<div class="tf-print-toc">'),
      out.indexOf("</div>", out.indexOf('<div class="tf-print-toc">')),
    );
    expect(toc).toContain("tf-toc-label--group");
    expect(toc).toContain(">sekce<");
    expect(toc).toContain("  - [");
    expect(toc).not.toContain("    - [");
  });

  test("indents the first contents row no further than a nested list", () => {
    const out = runPrint({
      "v1/alfa/beta/list.md": page("List", 1, "obsah listu"),
    });

    const rows = out
      .slice(out.indexOf('<div class="tf-print-toc">'))
      .split("\n")
      .filter((line) => line.trimStart().startsWith("- "));
    // Four spaces with no list open above it is an indented code block.
    expect(rows[0]).toBe(rows[0]!.trimStart());
  });

  test("a group whose index.md has no title falls back to the folder name", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/skupina/index.md": "---\norder: 1\n---\n\nbez titulku\n",
      "v1/sekce/skupina/list.md": page("List", 1, "obsah listu"),
    });

    expect(out).toContain(">skupina<");
    expect(out).not.toContain(">index<");
  });

  test("includes a page sitting directly under the version directory", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/rovnou.md": page("Rovnou", 1, "obsah rovnou"),
      "v1/sekce/index.md": page("Sekce", 2, "obsah sekce"),
    });

    expect(out).toContain("obsah rovnou");
    expect(out).toContain("obsah sekce");
  });

  test("a page title takes the heading level its depth implies", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/list.md": page("List", 1, "list"),
      "v1/sekce/skupina/index.md": page("Skupina", 2, "skupina"),
      "v1/sekce/skupina/hloubka.md": page("Hloubka", 1, "hloubka"),
    });

    expect(out).toContain(
      '<h1 class="tf-page-title tf-page-title--d0">Sekce</h1>',
    );
    expect(out).toContain(
      '<h2 class="tf-page-title tf-page-title--d1">List</h2>',
    );
    expect(out).toContain(
      '<h3 class="tf-page-title tf-page-title--d2">Hloubka</h3>',
    );
  });

  test("pushes a page's own headings below every page-title level", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "## Nadpis\n\n### Podnadpis"),
    });

    expect(out).toContain("#### Nadpis");
    expect(out).toContain("##### Podnadpis");
  });

  test("keeps a page's own h1 below the page title of a nested page", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      "v1/sekce/skupina/index.md": page("Skupina", 1, "skupina"),
      "v1/sekce/skupina/list.md": page("List", 1, "# Vlastní H1"),
    });

    expect(out).toContain(
      '<h3 class="tf-page-title tf-page-title--d2">List</h3>',
    );
    expect(out).toContain("#### Vlastní H1");
  });

  test("leaves a heading inside a fenced block alone", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page("Sekce", 1, "```\n## uvnitr kodu\n```"),
    });

    expect(out).toContain("## uvnitr kodu");
  });

  test("binds a figure caption to the image below it", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page(
        "Sekce",
        1,
        "**Obrázek 1** – popisek.\n\nuvodni odstavec\n\n![alt](/a.svg)",
      ),
    });

    const figure = out.slice(
      out.indexOf('<figure class="tf-figure">'),
      out.indexOf("</figure>"),
    );
    expect(figure).toContain("![alt](/a.svg)");
    expect(figure).toContain("**Obrázek 1** – popisek.");
    // The paragraph introducing the figure stays above it.
    expect(out.indexOf("uvodni odstavec")).toBeLessThan(out.indexOf("<figure"));
  });

  test("leaves a caption inside a fenced block alone", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page(
        "Sekce",
        1,
        "```markdown\n**Obrázek 1** – popisek.\n![alt](/a.svg)\n```",
      ),
    });

    expect(out).not.toContain("<figure");
    expect(out).toContain("**Obrázek 1** – popisek.\n![alt](/a.svg)");
  });

  test("leaves a caption in place when no image follows it", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page(
        "Sekce",
        1,
        "**Obrázek 1** – popisek.\n\n## Jiny nadpis\n\n![alt](/a.svg)",
      ),
    });

    expect(out).not.toContain("<figure");
    expect(out).toContain("**Obrázek 1** – popisek.");
  });

  test("drops a hand-written contents section", () => {
    const out = runPrint({
      "v1/index.md": page("Verze", 1, "root"),
      "v1/sekce/index.md": page(
        "Sekce",
        1,
        "uvod\n\n## Obsah\n\n- rucni odkaz\n\n## Cil\n\ncil sekce",
      ),
    });

    expect(out).not.toContain("rucni odkaz");
    expect(out).toContain("uvod");
    expect(out).toContain("cil sekce");
  });

  test("prints page numbers in the contents when given a map", () => {
    const out = runPrint(
      {
        "v1/index.md": page("Verze", 1, "root"),
        "v1/sekce/index.md": page("Sekce", 1, "sekce"),
      },
      {
        rootFiles: { "pagemap.json": JSON.stringify({ "v1-sekce-index": 7 }) },
        args: ["--pages=pagemap.json"],
      },
    );

    expect(out).toContain('<span class="tf-toc-page">7</span>');
    expect(out).toContain('<span class="tf-toc-leader"></span>');
  });
});

describe("cover page", () => {
  const docs = {
    "v1/index.md": page("Verze", 1, "root"),
    "v1/sekce/index.md": page("Sekce", 1, "sekce"),
  };

  test("is left out when the project declares no branding", () => {
    const out = runPrint(docs);

    expect(out).not.toContain("tf-cover");
    expect(out).toContain("Dokumentační portál");
  });

  test("is emitted from tf-doc-vault.json, with optional rows left off", () => {
    const out = runPrint(docs, {
      rootFiles: {
        "tf-doc-vault.json": JSON.stringify({
          pdf: {
            cover: {
              title: "Nabídka",
              eyebrow: "Pro Acme",
              recipient: "Acme",
              vendor: "TechFides",
            },
          },
        }),
      },
    });

    expect(out).toContain('<div class="tf-cover">');
    expect(out).toContain('<h1 class="tf-cover__title">Nabídka</h1>');
    expect(out).toContain("<dt>Pro</dt><dd>Acme</dd>");
    expect(out).not.toContain("<dt>Platnost</dt>");
    expect(out).toContain("title: Nabídka – Pro Acme");
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
