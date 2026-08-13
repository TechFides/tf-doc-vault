import fs from "node:fs";
import path from "node:path";
import type { HeadConfig, UserConfig } from "vitepress";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { taskLists } from "./taskLists.js";
import { tableWrapper } from "./tableWrapper.js";
import { generateNav, generateSidebar, getVersions } from "../sidebar/index.js";
import { LOGO_SHAPES, LOGO_VIEW_BOX } from "../theme/icons/logoSymbol.js";
import defaultStrings from "./strings.cs.json" with { type: "json" };

function bundledFaviconLink(faviconPath: string): HeadConfig | null {
  try {
    const buf = fs.readFileSync(faviconPath);
    const dataUrl = `data:image/x-icon;base64,${buf.toString("base64")}`;
    return ["link", { rel: "icon", type: "image/x-icon", href: dataUrl }];
  } catch {
    return null;
  }
}

// Mirrors --brand-primary in theme/styles/base.css. The navbar logo renders as
// an <img>, which cannot inherit currentColor, so the data URL bakes a fill.
const LOGO_FILL = "#0074c8";

function bundledLogoUrl(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEW_BOX}" ` +
    `fill="${LOGO_FILL}">${LOGO_SHAPES}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Site-level copy consumed directly by VitePress config. Built-in component
 * labels (status badges, 404, lightbox, feature CTA) live in the theme's
 * vue-i18n catalogs; override those via `i18n.global.mergeLocaleMessage`.
 */
export interface Strings {
  title: string;
  description: string;
  lang: string;
  searchLabel: string;
  footerPrev: string;
  footerNext: string;
}

export interface UmamiAnalytics {
  provider: "umami";
  websiteId: string;
  domain: string;
  scriptSrc?: string;
}

export interface EditLink {
  /** GitHub/GitLab repo path, e.g. `TechFides/tf-sales-private-offers`. */
  repo: string;
  /** Default branch. Defaults to `master`. */
  branch?: string;
  /** Link text in the docs footer. Defaults to "Upravit online". */
  text?: string;
  /** Override host. Defaults to `https://github.com`. */
  host?: string;
  /**
   * Path prefix between the repo root and this docs folder, e.g. `offer-a`
   * when this site lives inside a monorepo subfolder rather than at the
   * repo's root. Omit for a standalone repo.
   */
  path?: string;
}

export interface BrandingFooter {
  /** Public site URL shown as the first link. */
  websiteUrl?: string;
  /** Display label for the website link. Defaults to the host name of websiteUrl. */
  websiteLabel?: string;
  /** Contact email shown as the second link. */
  email?: string;
  /** Postal address shown as plain text after the email. */
  address?: string;
}

export interface BrandingNavLink {
  text: string;
  link: string;
}

export interface Branding {
  /**
   * Override the navbar site title. Defaults to the resolved `strings.title`.
   * Set to an empty string to hide.
   */
  siteTitle?: string;
  /**
   * Override the logo. Either an absolute URL/data URL, an object accepted by
   * VitePress' `themeConfig.logo`, or `false` to disable the bundled default.
   */
  logo?: string | { src: string; alt?: string } | false;
  /**
   * Extra nav links appended to the right end of the navbar (e.g. company
   * website). Empty array disables the default consumer-supplied link.
   */
  navLinks?: BrandingNavLink[];
  /** Footer content. Pass `false` to hide BrandFooter. */
  footer?: BrandingFooter | false;
  /**
   * Favicon. A URL/path (e.g. `/favicon.svg`) overrides the bundled default;
   * `false` injects no favicon at all. Omit to keep the bundled default.
   */
  favicon?: string | false;
  /**
   * How to load Inter (headings), IBM Plex Sans (body) and Noto Color Emoji.
   * - `"google"` (default): bundled `<link>` tags to fonts.googleapis.com.
   * - `"none"`: skip injection; the consumer self-hosts, e.g. with
   *   `@fontsource/inter` imported from their own config. Emoji then
   *   fall back to the reader's OS font and stop being platform-neutral.
   */
  fonts?: "google" | "none";
}

export interface MakeConfigOptions {
  configDir: string;
  project?: string;
  strings?: Partial<Strings>;
  branding?: Branding;
  analytics?: UmamiAnalytics;
  editLink?: EditLink;
  head?: HeadConfig[];
  sectionNav?: boolean;
  override?: Partial<UserConfig>;
  mermaid?: boolean;
}

const UMAMI_DEFAULT_SRC = "https://cloud.umami.is/script.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../theme/assets");
const DEFAULT_FAVICON = path.join(ASSETS_DIR, "favicon.ico");

function buildHead(opts: MakeConfigOptions): HeadConfig[] {
  const head: HeadConfig[] = [];

  const { favicon } = opts.branding ?? {};
  if (typeof favicon === "string") {
    head.push(["link", { rel: "icon", href: favicon }]);
  } else if (favicon !== false) {
    const bundled = bundledFaviconLink(DEFAULT_FAVICON);
    if (bundled) head.push(bundled);
  }

  if ((opts.branding?.fonts ?? "google") === "google") {
    head.push(
      ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
      [
        "link",
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
      ],
      [
        "link",
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Noto+Color+Emoji&display=swap",
        },
      ],
    );
  }

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
  const {
    repo,
    branch = "master",
    text = "Upravit online",
    host = "https://github.com",
    path: subPath,
  } = editLink;
  const isGitLab = host.includes("gitlab");
  const editPath = isGitLab ? `/-/edit/${branch}` : `/edit/${branch}`;
  const prefix = subPath ? `/${subPath.replace(/^\/+|\/+$/g, "")}` : "";
  return {
    pattern: `${host}/${repo}${editPath}${prefix}/docs/:path`,
    text,
  };
}

function resolveLogo(
  branding: Branding | undefined,
): { src: string; alt?: string } | undefined {
  if (branding?.logo === false) {
    return undefined;
  }
  if (typeof branding?.logo === "string") {
    return { src: branding.logo };
  }
  if (branding?.logo && typeof branding.logo === "object") {
    return branding.logo;
  }
  return { src: bundledLogoUrl() };
}

function resolveFooter(branding: Branding | undefined): BrandingFooter | null {
  if (branding?.footer === false) return null;
  if (branding?.footer) return branding.footer;
  return null;
}

// Mirrors VitePress' own config resolution: .vitepress/config.{js,ts,mjs,mts}
function findConfigFile(configDir: string): string | undefined {
  const layouts: ReadonlyArray<readonly [string, RegExp]> = [
    [configDir, /^config\.m?[jt]s$/],
    [path.join(configDir, "config"), /^index\.m?[jt]s$/],
  ];
  for (const [dir, pattern] of layouts) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const match = entries.find((f) => pattern.test(f));
    if (match) return path.join(dir, match);
  }
  return undefined;
}

interface DevServerLike {
  watcher: { on: (event: string, listener: (file: string) => void) => unknown };
}

/* Sidebar and nav are generated when the config is evaluated. On a .md add or
   delete VitePress refreshes its page list but does not re-run the user config,
   so the sidebar goes stale. Touching the config file triggers VitePress' own
   config reload, which re-runs makeConfig. */
function dynamicNavReload(
  docsRoot: string,
  configFile: string | undefined,
): { name: string; configureServer: (server: DevServerLike) => void } {
  return {
    name: "tf-doc-vault:dynamic-nav-reload",
    configureServer(server: DevServerLike): void {
      if (!configFile) return;
      const onChange = (file: string): void => {
        if (file.endsWith(".md") && file.startsWith(docsRoot)) {
          const now = new Date();
          fs.utimesSync(configFile, now, now);
        }
      };
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
    },
  };
}

export function makeConfig(
  opts: MakeConfigOptions,
): ReturnType<typeof withMermaid> | UserConfig {
  const docsRoot = path.resolve(opts.configDir, "..");
  const folderName = path.basename(docsRoot);
  const base = `/${folderName}/`;

  const configFile = findConfigFile(opts.configDir);

  const versions = getVersions(docsRoot);
  const defaultVersion = versions[0] ?? "v1";
  const strings: Strings = { ...defaultStrings, ...opts.strings };

  const head = buildHead(opts);
  const logo = resolveLogo(opts.branding);
  const footer = resolveFooter(opts.branding);
  const navLinks = opts.branding?.navLinks ?? [];
  const siteTitle = opts.branding?.siteTitle ?? strings.title;

  const versionDropdown = (
    label: string,
  ): {
    text: string;
    items: { text: string; link: string; activeMatch: string }[];
  } => ({
    text: label,
    items: versions.map((ver) => ({
      text: ver,
      link: `/${ver}/`,
      activeMatch: `${base}${ver}/`.replace(/\/+/g, "/"),
    })),
  });

  const localeFor = (
    v: string,
  ): {
    label: string;
    lang: string;
    link: string;
    themeConfig: { nav: ReturnType<typeof generateNav> };
  } => {
    const sectionNav =
      opts.sectionNav === false ? [] : generateNav(docsRoot, v);
    const showSections = sectionNav.length > 1;
    return {
      label: v,
      lang: strings.lang,
      link: `/${v}/`,
      themeConfig: {
        nav: [
          ...(showSections ? sectionNav : []),
          ...(versions.length > 1 ? [versionDropdown(v)] : []),
          ...navLinks,
        ],
      },
    };
  };

  const locales: Record<string, ReturnType<typeof localeFor>> = {
    root: localeFor(defaultVersion),
    ...Object.fromEntries(versions.slice(1).map((v) => [v, localeFor(v)])),
  };

  /* When the consumer overrides `base` (site served at `/` instead of
     `/docs/`), the logo link has to follow it or the logo lands on a 404. */
  const effectiveBase =
    typeof opts.override?.base === "string" ? opts.override.base : base;

  const topLevelNav =
    versions.length > 1
      ? [
          {
            text: "Verze",
            activeMatch: `^${base}(v\\d+)/`.replace(/\/+/g, "/"),
            items: versions.map((ver) => ({ text: ver, link: `/${ver}/` })),
          },
          ...navLinks,
        ]
      : [...navLinks];

  const { vite: overrideVite, ...restOverride } = opts.override ?? {};

  const baseConfig: UserConfig = {
    base,
    title: strings.title,
    description: strings.description,
    lang: strings.lang,
    head,
    locales,
    themeConfig: {
      ...(logo && { logo }),
      siteTitle,
      logoLink: effectiveBase,
      nav: topLevelNav,
      sidebar: generateSidebar(docsRoot, {
        unified: opts.sectionNav === false,
      }),
      search: { provider: "local" },
      outline: {
        label: strings.searchLabel,
      },
      docFooter: { prev: strings.footerPrev, next: strings.footerNext },
      /* No `lastUpdated`: VitePress resolves the footer switch as
         `userConfig.lastUpdated ?? !!themeConfig.lastUpdated`, so a label-only
         entry would duplicate the date DocMeta already renders. */
      ...(opts.editLink && { editLink: buildEditLink(opts.editLink) }),
      // BrandFooter reads this via useData().theme.value.docVault. Component
      // copy lives in vue-i18n.
      docVault: {
        footer,
      },
    },
    // markdown-it has no GFM task lists, so the Confluence importer's checkboxes
    // would render as literal `[x]`. tableWrapper adds the scroll container.
    markdown: {
      config(md) {
        taskLists(md);
        tableWrapper(md);
      },
    },
    vite: {
      ssr: {
        noExternal: ["@techfides/tf-doc-vault"],
      },
      plugins: [dynamicNavReload(docsRoot, configFile)],
      ...overrideVite,
    },
    ignoreDeadLinks: [/^https?:\/\/localhost/],
    /* Mermaid colors come from CSS (`.mermaid` and `.dark .mermaid` in
       theme/styles/base.css) off the --brand-* tokens, so overriding a token
       recolors diagrams in both modes.
       `themeVariables` stays unset: vitepress-plugin-mermaid forces
       theme="dark" under <html>.dark and would ignore it. */
    mermaid: {
      theme: "base",
      /* Mermaid writes its own `#mermaid-N { font-family: ... }` into the SVG,
         an ID selector CSS cannot outrank, so the emoji font has to be set
         here. "IBM Plex Sans" must stay ahead of it: Noto carries `0`-`9` for
         keycaps and would otherwise render digits as emoji. */
      fontFamily:
        '"IBM Plex Sans", "Inter", system-ui, "Noto Color Emoji", sans-serif',
      flowchart: {
        curve: "basis",
        useMaxWidth: true,
        subGraphTitleMargin: { top: 8, bottom: 4 },
      },
    },
    ...restOverride,
  };

  const config = defineConfig(baseConfig);
  return opts.mermaid === false ? config : withMermaid(config);
}
