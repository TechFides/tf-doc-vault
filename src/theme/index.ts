import DefaultTheme from "vitepress/theme";
import { useData, type Theme } from "vitepress";
import { h, Fragment, type VNode } from "vue";
import DocMeta from "./components/DocMeta.vue";
import DocPageTitle from "./components/DocPageTitle.vue";
import PrintLayout from "./components/PrintLayout.vue";
import ImageLightbox from "./components/ImageLightbox.vue";
import WidthToggle from "./components/WidthToggle.vue";
import BrandHero from "./components/BrandHero.vue";
import FeatureCards from "./components/FeatureCards.vue";
import BrandFooter from "./components/BrandFooter.vue";
import NotFound from "./components/NotFound.vue";
import { i18n, resolveLocale } from "./i18n/index.js";
import "./styles/print.css";
import "./styles/base.css";

export interface CreateThemeOptions {
  /** Show the WidthToggle button in the navbar. Default: false. */
  widthToggle?: boolean;
  /**
   * Allow mounting BrandFooter. Default: true. The footer only renders when
   * `branding.footer` is configured in makeConfig, so leaving this on is
   * harmless — set it to `false` to force the footer off regardless.
   */
  brandFooter?: boolean;
}

export function createTheme(options: CreateThemeOptions = {}): Theme {
  const { widthToggle = false, brandFooter = true } = options;

  return {
    extends: DefaultTheme,
    Layout(): VNode {
      // Only mount BrandFooter when a footer is actually configured, so a fresh
      // scaffold with no `branding.footer` doesn't leave an empty node on every
      // page.
      const { theme } = useData();
      const footerConfigured = !!(
        theme.value as { docVault?: { footer?: unknown } }
      ).docVault?.footer;
      const showFooter = brandFooter && footerConfigured;

      const slots: Record<string, () => VNode> = {
        "doc-before": (): VNode =>
          h("div", { class: "doc-meta-wrapper" }, [
            h(DocMeta),
            h(DocPageTitle),
          ]),
        "layout-bottom": (): VNode =>
          h(
            Fragment,
            null,
            showFooter
              ? [h(ImageLightbox), h(BrandFooter)]
              : [h(ImageLightbox)],
          ),
        "not-found": (): VNode => h(NotFound),
      };
      if (widthToggle) {
        slots["nav-bar-content-after"] = (): VNode => h(WidthToggle);
      }
      return h(DefaultTheme.Layout, null, slots);
    },
    enhanceApp({ app, siteData }): void {
      app.use(i18n);
      i18n.global.locale.value = resolveLocale(siteData.value.lang);
      app.component("PrintLayout", PrintLayout);
      app.component("BrandHero", BrandHero);
      app.component("FeatureCards", FeatureCards);
    },
  };
}

export {
  DocMeta,
  DocPageTitle,
  ImageLightbox,
  PrintLayout,
  WidthToggle,
  BrandHero,
  FeatureCards,
  BrandFooter,
  NotFound,
};
export { useScrollSpy } from "./composables/useScrollSpy.js";
export { i18n } from "./i18n/index.js";
export * as icons from "./icons/index.js";
