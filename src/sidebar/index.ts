import fs from "node:fs";
import path from "node:path";
import type { DefaultTheme } from "vitepress";
import { readTitle } from "../shared/frontmatter.js";
import {
  pageEntries,
  siblingEntries,
  sortSiblings,
  subDirEntries,
} from "../shared/ordering.js";

function mdFilesIn(dir: string): string[] {
  return sortSiblings(dir, pageEntries(dir)).map((e) => e.name);
}

function subDirs(dir: string): string[] {
  return sortSiblings(dir, subDirEntries(dir)).map((e) => e.name);
}

/** Each top-level directory in `docs/` is a documentation version. */
export function getVersions(docsRoot: string): string[] {
  // Alphabetical on purpose: v1, v2, v3 is already chronological, so versions
  // are the one level `order` does not govern.
  return subDirEntries(docsRoot)
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "cs"));
}

/** Top-level dirs in `docs/<version>/` become navbar items. */
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
          ? readTitle(indexPath)
          : section.charAt(0).toUpperCase() + section.slice(1),
        link: `/${version}/${section}/`,
      };
    });
  }

  return mdFilesIn(versionRoot).map(
    (f): DefaultTheme.NavItemWithLink => ({
      text: readTitle(path.join(versionRoot, f)),
      link: `/${version}/${f.replace(/\.md$/, "")}`,
    }),
  );
}

/**
 * Files become leaf items; subdirectories become collapsed groups linked to
 * their index.md when one exists.
 */
function buildSidebarItems(
  dir: string,
  urlBase: string,
): DefaultTheme.SidebarItem[] {
  const entries = sortSiblings(dir, siblingEntries(dir));

  return entries.map((e: fs.Dirent): DefaultTheme.SidebarItem => {
    if (e.isDirectory()) {
      const subDir = path.join(dir, e.name);
      const indexPath = path.join(subDir, "index.md");
      const subBase = `${urlBase}${e.name}/`;
      return {
        text: fs.existsSync(indexPath) ? readTitle(indexPath) : e.name,
        link: fs.existsSync(indexPath) ? subBase : undefined,
        collapsed: true,
        items: buildSidebarItems(subDir, subBase),
      };
    }
    return {
      text: readTitle(path.join(dir, e.name)),
      link: `${urlBase}${e.name.replace(/\.md$/, "")}`,
    };
  });
}

export function generateSidebar(
  docsRoot: string,
  opts: { unified?: boolean } = {},
): DefaultTheme.SidebarMulti {
  const sidebar: DefaultTheme.SidebarMulti = {};

  for (const version of getVersions(docsRoot)) {
    const versionRoot = path.join(docsRoot, version);
    const versionBase = `/${version}/`;
    const sections = subDirs(versionRoot);

    if (!opts.unified && sections.length > 1) {
      for (const section of sections) {
        const sectionBase = `${versionBase}${section}/`;
        const sectionDir = path.join(versionRoot, section);
        sidebar[sectionBase] = buildSidebarItems(sectionDir, sectionBase);
      }

      const rootItems: DefaultTheme.SidebarItem[] = [];
      const rootIndex = path.join(versionRoot, "index.md");
      if (fs.existsSync(rootIndex)) {
        rootItems.push({ text: readTitle(rootIndex), link: versionBase });
      }
      for (const file of mdFilesIn(versionRoot)) {
        rootItems.push({
          text: readTitle(path.join(versionRoot, file)),
          link: `${versionBase}${file.replace(/\.md$/, "")}`,
        });
      }
      if (rootItems.length > 0) sidebar[versionBase] = rootItems;
      continue;
    }

    const items: DefaultTheme.SidebarItem[] = [];
    const indexPath = path.join(versionRoot, "index.md");
    if (fs.existsSync(indexPath)) {
      items.push({ text: readTitle(indexPath), link: versionBase });
    }
    items.push(...buildSidebarItems(versionRoot, versionBase));
    sidebar[versionBase] = items;
  }

  return sidebar;
}
