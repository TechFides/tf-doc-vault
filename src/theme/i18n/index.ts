import { createI18n } from "vue-i18n";
import cs from "./cs.json" with { type: "json" };
import en from "./en.json" with { type: "json" };

// vue-i18n's esm-bundler build reads these as bare globals, expecting the host
// bundler to define them. VitePress externalizes vue-i18n for SSR, so define
// never reaches it and the bare references throw. Set sane defaults on
// globalThis before createI18n runs (member access, so Vite's define won't
// rewrite these assignments). Member reads in vue-i18n resolve to them.
const flags = globalThis as Record<string, unknown>;
flags.__VUE_I18N_FULL_INSTALL__ ??= true;
flags.__VUE_I18N_LEGACY_API__ ??= false;
flags.__INTLIFY_JIT_COMPILATION__ ??= true;
flags.__INTLIFY_DROP_MESSAGE_COMPILER__ ??= false;
flags.__INTLIFY_PROD_DEVTOOLS__ ??= false;
flags.__VUE_I18N_PROD_DEVTOOLS__ ??= false;
flags.__VUE_PROD_DEVTOOLS__ ??= false;

export type ThemeLocale = "cs" | "en";

/** Map a VitePress `site.lang` (e.g. "cs-CZ", "en-US") to a bundled locale. */
export function resolveLocale(lang: string | undefined): ThemeLocale {
  return lang && /^en/i.test(lang) ? "en" : "cs";
}

/**
 * Theme-wide i18n for built-in component strings (DocMeta, NotFound,
 * ImageLightbox, FeatureCards). Czech is the default; English is the fallback.
 * Consumers override copy with `i18n.global.mergeLocaleMessage(locale, {...})`.
 */
export const i18n = createI18n({
  legacy: false,
  locale: "cs",
  fallbackLocale: "en",
  messages: { cs, en },
});
