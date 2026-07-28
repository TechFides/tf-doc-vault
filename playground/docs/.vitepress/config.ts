import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeConfig, enStrings } from "../../../src/config/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "../../../src");

/**
 * Playground for local theme development.
 *
 * Imports from `src/` directly instead of `@techfides/tf-doc-vault` so Vite
 * treats `.vue` / `.css` files as project sources → full HMR on edits to
 * components and styles without rebuilding the package.
 */
export default makeConfig({
  configDir: import.meta.dirname,
  project: "playground",
  strings: {
    ...enStrings,
    title: "tf-doc-vault playground",
    description: "Local theme dev sandbox",
  },
  branding: {
    siteTitle: "tf-doc-vault",
    navLinks: [
      { text: "GitHub", link: "https://github.com/TechFides/tf-doc-vault" },
    ],
    footer: {
      websiteUrl: "https://techfides.cz",
      email: "info@techfides.cz",
    },
  },
  override: {
    base: "/",
    vite: {
      resolve: {
        alias: [
          {
            find: /^@techfides\/tf-doc-vault\/theme\/styles\/(.*)$/,
            replacement: path.join(srcRoot, "theme/styles/$1"),
          },
          {
            find: "@techfides/tf-doc-vault/theme",
            replacement: path.join(srcRoot, "theme/index.ts"),
          },
          {
            find: "@techfides/tf-doc-vault/config",
            replacement: path.join(srcRoot, "config/index.ts"),
          },
          {
            find: "@techfides/tf-doc-vault/sidebar",
            replacement: path.join(srcRoot, "sidebar/index.ts"),
          },
          {
            find: "@techfides/tf-doc-vault",
            replacement: path.join(srcRoot, "index.ts"),
          },
        ],
      },
      ssr: {
        noExternal: ["@techfides/tf-doc-vault"],
      },
    },
  },
});
