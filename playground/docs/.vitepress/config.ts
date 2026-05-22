import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeConfig } from "../../../src/config/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "../../../src");

/**
 * Playground for local theme development.
 *
 * Imports from `src/` directly instead of `@techfides/tf-doc-vault` so Vite
 * treats `.vue` / `.css` files as project sources → full HMR on edits to
 * components and styles without rebuilding the package.
 *
 * The Vite alias below makes any `@techfides/tf-doc-vault/*` import inside
 * the theme resolve to local source, so internal `src/` imports continue to
 * work the same way they would in a published consumer.
 */
export default makeConfig({
  configDir: import.meta.dirname,
  project: "playground",
  strings: {
    title: "tf-doc-vault — playground",
    description: "Local theme dev sandbox",
    lang: "en-US",
    searchLabel: "On this page",
    footerPrev: "Previous",
    footerNext: "Next",
    lastUpdatedText: "Last updated",
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
      // Source files use NodeNext-style `.js` extensions on relative imports
      // (because tsc compiles to dist/). Vite resolves these to the matching
      // .ts file automatically, but SSR needs the package to be bundled, not
      // treated as an external npm dep (since we're pointing it at local src).
      ssr: {
        noExternal: ["@techfides/tf-doc-vault"],
      },
    },
  },
});
