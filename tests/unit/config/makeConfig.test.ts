import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeConfig } from "../../../src/config/makeConfig.js";

let docsRoot: string;
let configDir: string;

interface NavItem {
  text: string;
  link?: string;
}

interface LocaleShape {
  themeConfig: { nav: NavItem[] };
}

/** Read the generated multi-sidebar off a built config. */
function sidebarOf(
  opts: Parameters<typeof makeConfig>[0],
): Record<string, unknown[]> {
  const config = makeConfig({ ...opts, mermaid: false }) as unknown as {
    themeConfig: { sidebar: Record<string, unknown[]> };
  };
  return config.themeConfig.sidebar;
}

function write(rel: string, body: string): void {
  const full = path.join(docsRoot, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function fm(title: string): string {
  return ["---", `title: ${title}`, "---", "", ""].join("\n");
}

/** Build a config with `mermaid: false` so the plain UserConfig comes back. */
function rootNav(opts: Parameters<typeof makeConfig>[0]): NavItem[] {
  const config = makeConfig({ ...opts, mermaid: false }) as unknown as {
    locales: Record<string, LocaleShape>;
  };
  return config.locales["root"]!.themeConfig.nav;
}

beforeEach(() => {
  docsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "makeconfig-"));
  configDir = path.join(docsRoot, ".vitepress");
  fs.mkdirSync(configDir);
  write("v1/architektura/index.md", fm("Architektura"));
  write("v1/integrace/index.md", fm("Integrace"));
});

afterEach(() => {
  fs.rmSync(docsRoot, { recursive: true, force: true });
});

describe("makeConfig sectionNav option", () => {
  test("section links are in the navbar by default", () => {
    const nav = rootNav({ configDir });
    expect(nav).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Architektura" }),
        expect.objectContaining({ text: "Integrace" }),
      ]),
    );
  });

  test("sectionNav: false omits the auto-generated section links", () => {
    const nav = rootNav({ configDir, sectionNav: false });
    expect(nav).toEqual([]);
  });

  test("sectionNav: false keeps branding.navLinks", () => {
    const navLinks = [{ text: "Web", link: "https://flexifin.cz" }];
    const nav = rootNav({
      configDir,
      sectionNav: false,
      branding: { navLinks },
    });
    expect(nav).toEqual(navLinks);
  });

  test("default (ana-docs) keeps a focused sidebar per section", () => {
    // beforeEach writes two sections (architektura, integrace), no flat pages.
    expect(Object.keys(sidebarOf({ configDir })).sort()).toEqual([
      "/v1/architektura/",
      "/v1/integrace/",
    ]);
  });

  test("sectionNav: false (tech-docs) unifies the sections into one /v1/ sidebar", () => {
    expect(Object.keys(sidebarOf({ configDir, sectionNav: false }))).toEqual([
      "/v1/",
    ]);
  });
});

describe("makeConfig markdown options", () => {
  test("registers a markdown config hook (GFM task lists)", () => {
    const config = makeConfig({ configDir, mermaid: false }) as unknown as {
      markdown?: { config?: unknown };
    };
    expect(typeof config.markdown?.config).toBe("function");
  });
});
