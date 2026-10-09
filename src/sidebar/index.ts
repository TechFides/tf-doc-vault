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

/** `null` is the unversioned layout: `docs/` takes the place of `docs/<version>/`. */
type Version = string | null;

/** Written into `docs/` by `tf-doc-vault print`, so only the unversioned layout meets it. */
const PRINT_PAGE = "print.md";

function versionDir(docsRoot: string, version: Version): string {
  return version === null ? docsRoot : path.join(docsRoot, version);
}

function versionBase(version: Version): string {
  return version === null ? "/" : `/${version}/`;
}

function rootPages(versionRoot: string, version: Version): string[] {
  const pages = mdFilesIn(versionRoot);
  return version === null ? pages.filter((f) => f !== PRINT_PAGE) : pages;
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

/** Top-level dirs in `docs/<version>/`, or in `docs/` for `null`, become navbar items. */
export function generateNav(
  docsRoot: string,
  version: Version,
): DefaultTheme.NavItem[] {
  const versionRoot = versionDir(docsRoot, version);
  const base = versionBase(version);
  const sections = subDirs(versionRoot);

  if (sections.length > 0) {
    return sections.map((section): DefaultTheme.NavItemWithLink => {
      const indexPath = path.join(versionRoot, section, "index.md");
      return {
        text: fs.existsSync(indexPath)
          ? readTitle(indexPath)
          : section.charAt(0).toUpperCase() + section.slice(1),
        link: `${base}${section}/`,
      };
    });
  }

  return rootPages(versionRoot, version).map(
    (f): DefaultTheme.NavItemWithLink => ({
      text: readTitle(path.join(versionRoot, f)),
      link: `${base}${f.replace(/\.md$/, "")}`,
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
  skip?: string,
): DefaultTheme.SidebarItem[] {
  const entries = sortSiblings(
    dir,
    siblingEntries(dir).filter((e) => e.name !== skip),
  );

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

/** `versioned: false` reads the pages from `docs/` itself, under `/`. */
export function generateSidebar(
  docsRoot: string,
  opts: { unified?: boolean; versioned?: boolean } = {},
): DefaultTheme.SidebarMulti {
  const sidebar: DefaultTheme.SidebarMulti = {};
  const versions: Version[] =
    opts.versioned === false ? [null] : getVersions(docsRoot);

  for (const version of versions) {
    const versionRoot = versionDir(docsRoot, version);
    const base = versionBase(version);
    const sections = subDirs(versionRoot);

    if (!opts.unified && sections.length > 1) {
      for (const section of sections) {
        const sectionBase = `${base}${section}/`;
        const sectionDir = path.join(versionRoot, section);
        sidebar[sectionBase] = buildSidebarItems(sectionDir, sectionBase);
      }

      const rootItems: DefaultTheme.SidebarItem[] = [];
      const rootIndex = path.join(versionRoot, "index.md");
      if (fs.existsSync(rootIndex)) {
        rootItems.push({ text: readTitle(rootIndex), link: base });
      }
      for (const file of rootPages(versionRoot, version)) {
        rootItems.push({
          text: readTitle(path.join(versionRoot, file)),
          link: `${base}${file.replace(/\.md$/, "")}`,
        });
      }
      if (rootItems.length > 0) sidebar[base] = rootItems;
      continue;
    }

    const items: DefaultTheme.SidebarItem[] = [];
    const indexPath = path.join(versionRoot, "index.md");
    if (fs.existsSync(indexPath)) {
      items.push({ text: readTitle(indexPath), link: base });
    }
    items.push(
      ...buildSidebarItems(
        versionRoot,
        base,
        version === null ? PRINT_PAGE : undefined,
      ),
    );
    sidebar[base] = items;
  }

  return sidebar;
}
