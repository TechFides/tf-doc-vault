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

describe("makeConfig base", () => {
  function baseOf(opts: Parameters<typeof makeConfig>[0]): string | undefined {
    const config = makeConfig({ ...opts, mermaid: false }) as unknown as {
      base?: string;
    };
    return config.base;
  }

  function logoLinkOf(
    opts: Parameters<typeof makeConfig>[0],
  ): string | undefined {
    const config = makeConfig({ ...opts, mermaid: false }) as unknown as {
      themeConfig: { logoLink?: string };
    };
    return config.themeConfig.logoLink;
  }

  test("defaults to the docs folder name (tech-docs mount contract)", () => {
    const expected = `/${path.basename(path.dirname(configDir))}/`;
    expect(baseOf({ configDir })).toBe(expected);
  });

  // The ana template serves at "/", so the folder-derived "/docs/" stays overridable.
  test("override.base wins so the ana site can be served at the root", () => {
    expect(baseOf({ configDir, override: { base: "/" } })).toBe("/");
  });

  test("logoLink follows the overridden base", () => {
    expect(logoLinkOf({ configDir, override: { base: "/" } })).toBe("/");
  });
});

describe("makeConfig fonts option", () => {
  function fontHrefs(opts: Parameters<typeof makeConfig>[0]): string[] {
    const config = makeConfig({ ...opts, mermaid: false }) as unknown as {
      head: [string, Record<string, string>][];
    };
    return config.head
      .filter(([tag, attrs]) => tag === "link" && attrs["rel"] === "stylesheet")
      .map(([, attrs]) => attrs["href"] ?? "");
  }

  test("default loads Open Sans and Noto Color Emoji in one request", () => {
    const hrefs = fontHrefs({ configDir });
    expect(hrefs).toHaveLength(1);
    expect(hrefs[0]).toContain("family=Open+Sans");
    expect(hrefs[0]).toContain("family=Noto+Color+Emoji");
  });

  test("fonts: none injects no stylesheet link", () => {
    expect(fontHrefs({ configDir, branding: { fonts: "none" } })).toEqual([]);
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
