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
// `setupTechDocs` is built by unbuild into dist/setup/{nest,express}.{mjs,cjs}
// and reached through the subpath `@techfides/tf-doc-vault/setup/nest`. A
// re-export here would dangle: tsc excludes src/setup from its emit.
