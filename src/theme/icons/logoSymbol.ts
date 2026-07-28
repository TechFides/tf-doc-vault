/**
 * Single source of truth for the logo-symbol geometry. `LogoSymbol.vue` renders
 * it with `currentColor`; `makeConfig` bakes a brand-colored data URL, because
 * `themeConfig.logo` becomes an `<img>` that cannot inherit `currentColor`.
 */
export const LOGO_VIEW_BOX = "173 108 89 103";

export const LOGO_SHAPES =
  '<rect x="178.1" y="113" width="79.2" height="10.2"/>' +
  '<polygon points="178.1,134.6 178.1,144.8 203.8,144.8 203.8,197.4 214,206 214,144.8 214,134.6 203.8,134.6"/>' +
  '<rect x="221.4" y="134.6" width="35.9" height="10.2"/>' +
  '<rect x="221.4" y="157.7" width="26.4" height="10.2"/>';
