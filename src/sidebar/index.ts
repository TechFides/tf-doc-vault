import fs from "node:fs";
import path from "node:path";
import type { DefaultTheme } from "vitepress";

const IGNORE = new Set([".vitepress", "node_modules", "public"]);

/** Extract the `title` field from a file's YAML frontmatter, fallback to filename. */
function extractTitle(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const body = match?.[1];
  if (body) {
    const titleLine = body
      .split("\n")
      .find((l: string) => l.startsWith("title:"));
    if (titleLine) return titleLine.replace(/^title:\s*/, "").trim();
  }
  return path.basename(filePath, ".md");
}

function mdFilesIn(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f: string) => f.endsWith(".md"))
    .sort((a: string, b: string) => {
      if (a === "index.md") return -1;
      if (b === "index.md") return 1;
      return a.localeCompare(b, "cs");
    });
}

function subDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (e: fs.Dirent) =>
        e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."),
    )
    .map((e: fs.Dirent) => e.name)
    .sort((a: string, b: string) => a.localeCompare(b, "cs"));
}

/** Top-level directories in `docs/` — each is a documentation version. */
export function getVersions(docsRoot: string): string[] {
  return subDirs(docsRoot);
}

/** Top-level dirs in `docs/<version>/` → navbar items. */
export function generateNav(
  docsRoot: string,
  version: string,
): DefaultTheme.NavItem[] {
  const versionRoot = path.join(docsRoot, version);
  const sections = subDirs(versionRoot);

  if (sections.length > 0) {
    return sections.map((section): DefaultTheme.NavItemWithLink => {
      const indexPath = path.join(versionRoot, section, "index.md");
      return {
        text: fs.existsSync(indexPath)
          ? extractTitle(indexPath)
          : section.charAt(0).toUpperCase() + section.slice(1),
        link: `/${version}/${section}/`,
      };
    });
  }

  return mdFilesIn(versionRoot)
    .filter((f) => f !== "index.md")
    .map(
      (f): DefaultTheme.NavItemWithLink => ({
        text: extractTitle(path.join(versionRoot, f)),
        link: `/${version}/${f.replace(/\.md$/, "")}`,
      }),
    );
}

/**
 * Recursively build sidebar items for a directory.
 * Files become leaf items; subdirectories become collapsible groups
 * linked to their index.md (if present).
 */
function buildSidebarItems(
  dir: string,
  urlBase: string,
): DefaultTheme.SidebarItem[] {
  const items: DefaultTheme.SidebarItem[] = [];

  for (const f of mdFilesIn(dir)) {
    if (f === "index.md") continue;
    items.push({
      text: extractTitle(path.join(dir, f)),
      link: `${urlBase}${f.replace(/\.md$/, "")}`,
    });
  }

  for (const sub of subDirs(dir)) {
    const subDir = path.join(dir, sub);
    const indexPath = path.join(subDir, "index.md");
    const subBase = `${urlBase}${sub}/`;
    items.push({
      text: fs.existsSync(indexPath) ? extractTitle(indexPath) : sub,
      link: fs.existsSync(indexPath) ? subBase : undefined,
      collapsed: true,
      items: buildSidebarItems(subDir, subBase),
    });
  }

  return items;
}

export function generateSidebar(docsRoot: string): DefaultTheme.SidebarMulti {
  const sidebar: DefaultTheme.SidebarMulti = {};

  for (const version of getVersions(docsRoot)) {
    const versionRoot = path.join(docsRoot, version);
    const versionBase = `/${version}/`;
    const sections = subDirs(versionRoot);

    if (sections.length > 1) {
      for (const section of sections) {
        const sectionBase = `${versionBase}${section}/`;
        const sectionDir = path.join(versionRoot, section);
        sidebar[sectionBase] = buildSidebarItems(sectionDir, sectionBase);
      }

      const rootItems: DefaultTheme.SidebarItem[] = [];
      const rootIndex = path.join(versionRoot, "index.md");
      if (fs.existsSync(rootIndex)) {
        rootItems.push({ text: extractTitle(rootIndex), link: versionBase });
      }
      if (rootItems.length > 0) sidebar[versionBase] = rootItems;
      continue;
    }

    const items: DefaultTheme.SidebarItem[] = [];
    const indexPath = path.join(versionRoot, "index.md");
    if (fs.existsSync(indexPath)) {
      items.push({ text: extractTitle(indexPath), link: versionBase });
    }
    items.push(...buildSidebarItems(versionRoot, versionBase));
    sidebar[versionBase] = items;
  }

  return sidebar;
}
