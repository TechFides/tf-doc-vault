import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { h, type VNode } from "vue";
import DocMeta from "./components/DocMeta.vue";
import PrintLayout from "./components/PrintLayout.vue";
import ImageLightbox from "./components/ImageLightbox.vue";
import WidthToggle from "./components/WidthToggle.vue";
import "./styles/print.css";
import "./styles/base.css";

export interface CreateThemeOptions {
  /**
   * Show the WidthToggle button in the navbar (cycles content width:
   * default → wide → max). Default: false.
   */
  widthToggle?: boolean;
}

/**
 * Build a VitePress theme that extends DefaultTheme with TFSA's
 * shared slot components: DocMeta header, ImageLightbox, optional WidthToggle,
 * and PrintLayout (registered globally for the generated /print page).
 */
export function createTheme(options: CreateThemeOptions = {}): Theme {
  const { widthToggle = false } = options;

  return {
    extends: DefaultTheme,
    Layout(): VNode {
      const slots: Record<string, () => VNode> = {
        "doc-before": (): VNode =>
          h("div", { class: "doc-meta-wrapper" }, [h(DocMeta)]),
        "layout-bottom": (): VNode => h(ImageLightbox),
      };
      if (widthToggle) {
        slots["nav-bar-content-after"] = (): VNode => h(WidthToggle);
      }
      return h(DefaultTheme.Layout, null, slots);
    },
    enhanceApp({ app }): void {
      app.component("PrintLayout", PrintLayout);
    },
  };
}

export { DocMeta, ImageLightbox, PrintLayout, WidthToggle };
export { useScrollSpy } from "./composables/useScrollSpy.js";
