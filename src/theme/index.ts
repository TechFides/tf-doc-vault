import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { h, Fragment, type VNode } from "vue";
import DocMeta from "./components/DocMeta.vue";
import PrintLayout from "./components/PrintLayout.vue";
import ImageLightbox from "./components/ImageLightbox.vue";
import WidthToggle from "./components/WidthToggle.vue";
import BrandHero from "./components/BrandHero.vue";
import FeatureCards from "./components/FeatureCards.vue";
import BrandFooter from "./components/BrandFooter.vue";
import "./styles/print.css";
import "./styles/base.css";

export interface CreateThemeOptions {
  /**
   * Show the WidthToggle button in the navbar (cycles content width:
   * default → wide → max). Default: false.
   */
  widthToggle?: boolean;
}

export function createTheme(options: CreateThemeOptions = {}): Theme {
  const { widthToggle = false } = options;

  return {
    extends: DefaultTheme,
    Layout(): VNode {
      const slots: Record<string, () => VNode> = {
        "doc-before": (): VNode =>
          h("div", { class: "doc-meta-wrapper" }, [h(DocMeta)]),
        "layout-bottom": (): VNode =>
          h(Fragment, null, [h(ImageLightbox), h(BrandFooter)]),
      };
      if (widthToggle) {
        slots["nav-bar-content-after"] = (): VNode => h(WidthToggle);
      }
      return h(DefaultTheme.Layout, null, slots);
    },
    enhanceApp({ app }): void {
      app.component("PrintLayout", PrintLayout);
      app.component("BrandHero", BrandHero);
      app.component("FeatureCards", FeatureCards);
    },
  };
}

export { DocMeta, ImageLightbox, PrintLayout, WidthToggle, BrandHero, FeatureCards, BrandFooter };
export { useScrollSpy } from "./composables/useScrollSpy.js";
