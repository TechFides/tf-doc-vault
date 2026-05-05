import fs from "node:fs";
import path from "node:path";
import type { HeadConfig, UserConfig } from "vitepress";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { generateNav, generateSidebar, getVersions } from "../sidebar/index.js";
import defaultStrings from "./strings.cs.json" with { type: "json" };

/**
 * Read the bundled favicon and embed it as a data URL `<link rel="icon">` so
 * each consumer repo gets the icon automatically without copying static files.
 * Resolved at build time relative to this compiled file (dist/config/makeConfig.js).
 */
function bundledFaviconLink(): HeadConfig | null {
  try {
    const faviconPath = path.resolve(import.meta.dirname, "../theme/assets/favicon.ico");
    const buf = fs.readFileSync(faviconPath);
    const dataUrl = `data:image/x-icon;base64,${buf.toString("base64")}`;
    return ["link", { rel: "icon", type: "image/x-icon", href: dataUrl }];
  } catch {
    return null;
  }
}

export interface Strings {
  title: string;
  description: string;
  lang: string;
  searchLabel: string;
  footerPrev: string;
  footerNext: string;
  lastUpdatedText: string;
}

export interface UmamiAnalytics {
  provider: "umami";
  websiteId: string;
  domain: string;
  scriptSrc?: string;
}

export interface EditLink {
  /** GitLab/GitHub repo path, e.g. `techfides/tf-analysis/lapa_ana`. */
  repo: string;
  /** Default branch. Defaults to `master`. */
  branch?: string;
  /** Link text in the docs footer. Defaults to "Upravit online". */
  text?: string;
  /** Override host. Defaults to `https://gitlab.com`. */
  host?: string;
}

export interface MakeConfigOptions {
  /**
   * Path to the `.vitepress/` directory. In a consumer config.ts:
   *   `configDir: import.meta.dirname`
   * The `docs/` root is one level up.
   */
  configDir: string;

  /** Project shortname (used only for diagnostics today; reserved for future use). */
  project?: string;

  /** Override base strings (title, description, lang, …). */
  strings?: Partial<Strings>;

  /** Optional Umami analytics tracker. */
  analytics?: UmamiAnalytics;

  /** Optional GitLab/GitHub edit link in docs footer. */
  editLink?: EditLink;

  /** Extra `<head>` tags appended after analytics. */
  head?: HeadConfig[];

  /**
   * Override / extend final UserConfig. Merged shallowly on top of the generated config.
   * Use sparingly — most use-cases should be covered by typed options above.
   */
  override?: Partial<UserConfig>;
}

const UMAMI_DEFAULT_SRC = "https://cloud.umami.is/script.js";

function buildHead(opts: MakeConfigOptions): HeadConfig[] {
  const head: HeadConfig[] = [];

  const favicon = bundledFaviconLink();
  if (favicon) head.push(favicon);

  if (opts.analytics?.provider === "umami") {
    const { websiteId, domain, scriptSrc = UMAMI_DEFAULT_SRC } = opts.analytics;
    head.push([
      "script",
      {
        async: "",
        defer: "",
        "data-website-id": websiteId,
        "data-domains": domain,
        src: scriptSrc,
      },
    ]);
  }

  if (opts.head) head.push(...opts.head);
  return head;
}

function buildEditLink(editLink: EditLink): { pattern: string; text: string } {
  const { repo, branch = "master", text = "Upravit online", host = "https://gitlab.com" } =
    editLink;
  // GitLab uses `/-/edit/<branch>/...`; GitHub uses `/edit/<branch>/...`.
  const isGitLab = host.includes("gitlab");
  const editPath = isGitLab ? `/-/edit/${branch}` : `/edit/${branch}`;
  return {
    pattern: `${host}/${repo}${editPath}/docs/:path`,
    text,
  };
}

/**
 * Build a VitePress UserConfig wrapped in `withMermaid`, derived from the docs/
 * directory layout (`docs/<version>/<section>/<group>/`).
 */
export function makeConfig(opts: MakeConfigOptions): ReturnType<typeof withMermaid> {
  const docsRoot = path.resolve(opts.configDir, "..");
  const versions = getVersions(docsRoot);
  const defaultVersion = versions[0] ?? "v1";
  const strings: Strings = { ...defaultStrings, ...opts.strings };

  const head = buildHead(opts);

  const versionDropdown = (label: string): { text: string; items: { text: string; link: string; activeMatch: string }[] } => ({
    text: label,
    items: versions.map((ver) => ({
      text: ver,
      link: `/${ver}/`,
      activeMatch: `/${ver}/`,
    })),
  });

  const localeFor = (
    v: string
  ): { label: string; lang: string; link: string; themeConfig: { nav: ReturnType<typeof generateNav> } } => ({
    label: v,
    lang: strings.lang,
    link: `/${v}/`,
    themeConfig: {
      nav: versions.length > 1
        ? [...generateNav(docsRoot, v), versionDropdown(v)]
        : generateNav(docsRoot, v),
    },
  });

  const locales: Record<string, ReturnType<typeof localeFor>> = {
    root: localeFor(defaultVersion),
    ...Object.fromEntries(versions.slice(1).map((v) => [v, localeFor(v)])),
  };

  const baseConfig: UserConfig = {
    title: strings.title,
    description: strings.description,
    lang: strings.lang,
    head,
    locales,
    themeConfig: {
      logoLink: "/",
      nav: versions.length > 1
        ? [{ text: "Verze", activeMatch: "^/(v\\d+)/", items: versions.map((ver) => ({ text: ver, link: `/${ver}/` })) }]
        : [],
      sidebar: generateSidebar(docsRoot),
      search: { provider: "local" },
      outline: { label: strings.searchLabel, level: [2, 3] },
      docFooter: { prev: strings.footerPrev, next: strings.footerNext },
      lastUpdated: { text: strings.lastUpdatedText },
      ...(opts.editLink && { editLink: buildEditLink(opts.editLink) }),
    },
    // The shared theme imports .vue / .css files from inside the package; without
    // noExternal vitepress' SSR build hands the raw .css off to Node's ESM loader,
    // which rejects it with ERR_UNKNOWN_FILE_EXTENSION.
    vite: {
      ssr: {
        noExternal: ["@techfides/tf-doc-vault"],
      },
    },
    ...opts.override,
  };

  return withMermaid(defineConfig(baseConfig));
}
