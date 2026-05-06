export { makeConfig } from "./config/makeConfig.js";
export type {
  MakeConfigOptions,
  Strings,
  UmamiAnalytics,
  EditLink,
} from "./config/makeConfig.js";
export { createTheme } from "./theme/index.js";
export type { CreateThemeOptions } from "./theme/index.js";
export { generateNav, generateSidebar, getVersions } from "./sidebar/index.js";
// `setupTechDocs` and `SetupTechDocsOptions` are intentionally NOT re-exported
// here — they're built by unbuild into dist/setup/{nest,express}.{mjs,cjs} and
// consumed via the explicit subpath: `@techfides/tf-doc-vault/setup/nest`.
// Re-exporting from this root index.ts would break because tsc no longer emits
// dist/setup/*.js (excluded in tsconfig.json) and an `export ... from` would
// dangle.
