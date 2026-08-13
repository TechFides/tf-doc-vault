import DefaultTheme from "vitepress/theme";
import { useData, type Theme } from "vitepress";
import { h, Fragment, type VNode } from "vue";
import DocMeta from "./components/DocMeta.vue";
import DocPageTitle from "./components/DocPageTitle.vue";
import PrintLayout from "./components/PrintLayout.vue";
import ImageLightbox from "./components/ImageLightbox.vue";
import TableEnhancer from "./components/TableEnhancer.vue";
import WidthToggle from "./components/WidthToggle.vue";
import BrandHero from "./components/BrandHero.vue";
import FeatureCards from "./components/FeatureCards.vue";
import Spotlight from "./components/Spotlight.vue";
import AuthorCard from "./components/AuthorCard.vue";
import StepCard from "./components/StepCard.vue";
import ReferenceCard from "./components/ReferenceCard.vue";
import Timeline from "./components/Timeline.vue";
import TimelineItem from "./components/TimelineItem.vue";
import BrandFooter from "./components/BrandFooter.vue";
import NotFound from "./components/NotFound.vue";
import PageBackdrop from "./components/PageBackdrop.vue";
import { i18n, resolveLocale } from "./i18n/index.js";
import SidebarDefaultEmoji from "./components/SidebarDefaultEmoji.vue";
// Import order is the cascade order: tokens define, base maps and overrides
// VitePress, patterns are last so an author-facing class wins over chrome.
import "./styles/print.css";
import "./styles/tokens.css";
import "./styles/icons.css";
import "./styles/backdrop.css";
import "./styles/base.css";
import "./styles/patterns.css";

export interface CreateThemeOptions {
  /** Show the WidthToggle button in the navbar. Default: false. */
  widthToggle?: boolean;
  /**
   * Allow mounting BrandFooter. Default: true. The footer only renders when
   * `branding.footer` is configured in makeConfig; set this to `false` to force
   * it off regardless.
   */
  brandFooter?: boolean;
  /**
   * Mount PageBackdrop, the nebula and star field behind the site. Default: true.
   * The star field is dark-mode only; tune either half with
   * `--tf-nebula-opacity` and `--tf-stars-opacity`.
   */
  backdrop?: boolean;
}

export function createTheme(options: CreateThemeOptions = {}): Theme {
  const { widthToggle = false, brandFooter = true, backdrop = true } = options;

  return {
    extends: DefaultTheme,
    Layout(): VNode {
      // Mount BrandFooter only when a footer is configured, so a fresh scaffold
      // doesn't carry an empty node on every page.
      const { theme } = useData();
      const footerConfigured = !!(
        theme.value as { docVault?: { footer?: unknown } }
      ).docVault?.footer;
      const showFooter = brandFooter && footerConfigured;

      const slots: Record<string, () => VNode> = {
        // layout-top, so the backdrop mounts once per layout rather than per route:
        // remounting would restart the star cycles on every navigation.
        "layout-top": (): VNode =>
          backdrop ? h(PageBackdrop) : h(Fragment, null, []),
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
              ? [
                  h(SidebarDefaultEmoji),
                  h(ImageLightbox),
                  h(TableEnhancer),
                  h(BrandFooter),
                ]
              : [h(SidebarDefaultEmoji), h(ImageLightbox), h(TableEnhancer)],
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
      app.component("Spotlight", Spotlight);
      app.component("AuthorCard", AuthorCard);
      app.component("StepCard", StepCard);
      app.component("ReferenceCard", ReferenceCard);
      app.component("Timeline", Timeline);
      app.component("TimelineItem", TimelineItem);
    },
  };
}

export {
  DocMeta,
  DocPageTitle,
  ImageLightbox,
  TableEnhancer,
  PrintLayout,
  WidthToggle,
  BrandHero,
  FeatureCards,
  Spotlight,
  AuthorCard,
  StepCard,
  ReferenceCard,
  Timeline,
  TimelineItem,
  BrandFooter,
  NotFound,
  PageBackdrop,
};
export { useScrollSpy } from "./composables/useScrollSpy.js";
export { i18n } from "./i18n/index.js";
export * as icons from "./icons/index.js";
