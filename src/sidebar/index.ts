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
    const titleLine = body.split("\n").find((l: string) => l.startsWith("title:"));
    if (titleLine) return titleLine.replace(/^title:\s*/, "").trim();
  }
  return path.basename(filePath, ".md");
}

/**
 * Replicate VitePress heading slug algorithm.
 * @see https://github.com/vuejs/vitepress/blob/main/src/shared/shared.ts
 */
function slugify(text: string): string {
  let slug = text
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (/^\d/.test(slug)) {
    slug = `_${slug}`;
  }

  return slug;
}

interface Heading {
  text: string;
  anchor: string;
  children: { text: string; anchor: string }[];
}

function extractHeadings(filePath: string): Heading[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const body = content.replace(/^---\s*\n[\s\S]*?\n---/, "");
  const headings: Heading[] = [];
  const regex = /^(#{2,3}) (.+)$/gm;
  let m;
  while ((m = regex.exec(body)) !== null) {
    const level = m[1]!.length;
    const text = m[2]!.trim();
    const anchor = slugify(text);
    if (level === 2) {
      headings.push({ text, anchor, children: [] });
    } else if (level === 3 && headings.length > 0) {
      headings[headings.length - 1]!.children.push({ text, anchor });
    }
  }
  return headings;
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
    .filter((e: fs.Dirent) => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."))
    .map((e: fs.Dirent) => e.name)
    .sort((a: string, b: string) => a.localeCompare(b, "cs"));
}

/** Top-level directories in `docs/` — each is a documentation version. */
export function getVersions(docsRoot: string): string[] {
  return subDirs(docsRoot);
}

/** Top-level dirs in `docs/<version>/` → navbar items. */
export function generateNav(docsRoot: string, version: string): DefaultTheme.NavItem[] {
  const versionRoot = path.join(docsRoot, version);
  const sections = subDirs(versionRoot);

  if (sections.length > 0) {
    return sections.map((section): DefaultTheme.NavItemWithLink => {
      const sectionDir = path.join(versionRoot, section);
      const indexPath = path.join(sectionDir, "index.md");
      const text = fs.existsSync(indexPath)
        ? extractTitle(indexPath)
        : section.charAt(0).toUpperCase() + section.slice(1);

      const groups = subDirs(sectionDir);
      const firstGroup = groups[0];
      let link = `/${version}/${section}/`;
      if (fs.existsSync(indexPath)) {
        link = `/${version}/${section}/`;
      } else if (firstGroup) {
        const groupDir = path.join(sectionDir, firstGroup);
        const files = mdFilesIn(groupDir).filter((f) => f !== "index.md");
        const firstFile = files[0];
        if (firstFile)
          link = `/${version}/${section}/${firstGroup}/${firstFile.replace(/\.md$/, "")}`;
      }

      return { text, link };
    });
  }

  return mdFilesIn(versionRoot)
    .filter((f) => f !== "index.md")
    .map(
      (f): DefaultTheme.NavItemWithLink => ({
        text: extractTitle(path.join(versionRoot, f)),
        link: `/${version}/${f.replace(/\.md$/, "")}`,
      })
    );
}

/**
 * Sidebar config:
 *   docs/<version>/xxxx/         → navbar item, sidebar key "/<version>/xxxx/"
 *   docs/<version>/xxxx/yyyy/    → collapsible group in left sidebar
 *   docs/<version>/xxxx/yyyy/zzzz.md → item inside the group
 */
export function generateSidebar(docsRoot: string): DefaultTheme.SidebarMulti {
  const sidebar: DefaultTheme.SidebarMulti = {};

  for (const version of getVersions(docsRoot)) {
    const versionRoot = path.join(docsRoot, version);
    const sections = subDirs(versionRoot);

    if (sections.length > 0) {
      for (const section of sections) {
        const sectionDir = path.join(versionRoot, section);
        const groups: DefaultTheme.SidebarItem[] = [];

        for (const group of subDirs(sectionDir)) {
          const groupDir = path.join(sectionDir, group);
          const indexPath = path.join(groupDir, "index.md");

          const groupText = fs.existsSync(indexPath)
            ? extractTitle(indexPath)
            : group.charAt(0).toUpperCase() + group.slice(1);

          const items: DefaultTheme.SidebarItem[] = mdFilesIn(groupDir)
            .filter((f: string) => f !== "index.md")
            .map((f: string) => ({
              text: extractTitle(path.join(groupDir, f)),
              link: `/${version}/${section}/${group}/${f.replace(/\.md$/, "")}`,
            }));

          groups.push({ text: groupText, collapsed: false, items });
        }

        sidebar[`/${version}/${section}/`] = groups;
      }
    } else {
      const files = mdFilesIn(versionRoot).filter((f) => f !== "index.md");
      const sidebarItems: DefaultTheme.SidebarItem[] = files.map((f) => {
        const filePath = path.join(versionRoot, f);
        const slug = f.replace(/\.md$/, "");
        const link = `/${version}/${slug}`;
        const headings = extractHeadings(filePath);

        if (headings.length > 0) {
          return {
            text: extractTitle(filePath),
            link,
            collapsed: true,
            items: headings.map((h) => {
              const h2Item: DefaultTheme.SidebarItem = {
                text: h.text,
                link: `${link}#${h.anchor}`,
              };
              if (h.children.length > 0) {
                h2Item.collapsed = true;
                h2Item.items = h.children.map((h3) => ({
                  text: h3.text,
                  link: `${link}#${h3.anchor}`,
                }));
              }
              return h2Item;
            }),
          };
        }

        return { text: extractTitle(filePath), link };
      });

      for (const f of files) {
        const slug = f.replace(/\.md$/, "");
        sidebar[`/${version}/${slug}`] = sidebarItems;
      }
      sidebar[`/${version}/`] = sidebarItems;
    }
  }

  return sidebar;
}
