import fs from "node:fs";
import path from "node:path";
import type { HeadConfig, UserConfig } from "vitepress";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { generateNav, generateSidebar, getVersions } from "../sidebar/index.js";
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

/**
 * Read the bundled logo SVG and return it as a data URL for themeConfig.logo.
 */
function bundledLogoUrl(svgPath: string): string | null {
  try {
    const svg = fs.readFileSync(svgPath, "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
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
  statusPublished: string;
  statusDraft: string;
  statusReview: string;
  statusArchived: string;
  updatedLabel: string;
  authorLabel: string;
  notFoundCode: string;
  notFoundHeading: string;
  notFoundMessage: string;
  notFoundLink: string;
  lightboxClose: string;
  featureCtaText: string;
  dateLocale: string;
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
   * How to load Open Sans.
   * - `"google"` (default): bundled `<link>` tags to fonts.googleapis.com.
   * - `"none"`: skip injection — consumer is responsible (e.g. self-hosted
   *   `@fontsource/open-sans` imported from their own config).
   */
  fonts?: "google" | "none";
}

export interface MakeConfigOptions {
  configDir: string;
  project?: string;
  strings?: Partial<Strings>;
  /** Branding overrides — title, logo, navbar links, footer. */
  branding?: Branding;
  analytics?: UmamiAnalytics;
  editLink?: EditLink;
  head?: HeadConfig[];
  override?: Partial<UserConfig>;
  mermaid?: boolean;
}

const UMAMI_DEFAULT_SRC = "https://cloud.umami.is/script.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../theme/assets");
const DEFAULT_FAVICON = path.join(ASSETS_DIR, "favicon.ico");
const DEFAULT_LOGO_SVG = path.join(ASSETS_DIR, "logo-symbol.svg");

function buildHead(opts: MakeConfigOptions): HeadConfig[] {
  const head: HeadConfig[] = [];

  const favicon = bundledFaviconLink(DEFAULT_FAVICON);
  if (favicon) head.push(favicon);

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
          href: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;700&display=swap",
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
    host = "https://gitlab.com",
  } = editLink;
  const isGitLab = host.includes("gitlab");
  const editPath = isGitLab ? `/-/edit/${branch}` : `/edit/${branch}`;
  return {
    pattern: `${host}/${repo}${editPath}/docs/:path`,
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
  const bundled = bundledLogoUrl(DEFAULT_LOGO_SVG);
  return bundled ? { src: bundled } : undefined;
}

function resolveFooter(branding: Branding | undefined): BrandingFooter | null {
  if (branding?.footer === false) return null;
  if (branding?.footer) return branding.footer;
  return null;
}

export function makeConfig(
  opts: MakeConfigOptions,
): ReturnType<typeof withMermaid> | UserConfig {
  const docsRoot = path.resolve(opts.configDir, "..");
  const folderName = path.basename(docsRoot);
  const base = `/${folderName}/`;

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
    const sectionNav = generateNav(docsRoot, v);
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

  /* If the consumer overrides `base` (e.g. site served at `/` instead of
     `/docs/`), the logo link must follow — otherwise clicking the logo
     sends the user to a 404. */
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
      sidebar: generateSidebar(docsRoot),
      search: { provider: "local" },
      outline: {
        label: strings.searchLabel,
      },
      docFooter: { prev: strings.footerPrev, next: strings.footerNext },
      lastUpdated: { text: strings.lastUpdatedText },
      ...(opts.editLink && { editLink: buildEditLink(opts.editLink) }),
      // Custom theme data — consumed by DocMeta, NotFound, ImageLightbox,
      // BrandFooter via useData().theme.value.tfDocVault.
      tfDocVault: {
        strings,
        footer,
      },
    },
    vite: {
      ssr: {
        noExternal: ["@techfides/tf-doc-vault"],
      },
    },
    ignoreDeadLinks: [/^https?:\/\/localhost/],
    /* Mermaid: `themeVariables` below applies only in light mode.
       vitepress-plugin-mermaid forces theme="dark" when <html> has
       .dark, ignoring our themeVariables — the dark-mode brand colors
       live as CSS overrides in `theme/styles/base.css` (search for
       `.dark .mermaid`). When changing brand colors, both places need
       to be updated. */
    mermaid: {
      theme: "base",
      themeVariables: {
        primaryColor: "#f5f7fa",
        primaryTextColor: "#333333",
        primaryBorderColor: "#0074c8",
        secondaryColor: "#ffffff",
        secondaryTextColor: "#333333",
        secondaryBorderColor: "#7e8890",
        tertiaryColor: "#eeeeee",
        tertiaryTextColor: "#333333",
        tertiaryBorderColor: "#acb2b7",
        lineColor: "#7e8890",
        textColor: "#333333",
        noteBkgColor: "#fef3c7",
        noteTextColor: "#92400e",
        noteBorderColor: "#fde68a",
        edgeLabelBackground: "#ffffff",
      },
      flowchart: {
        curve: "basis",
        useMaxWidth: true,
      },
    },
    ...opts.override,
  };

  const config = defineConfig(baseConfig);
  return opts.mermaid === false ? config : withMermaid(config);
}
