import { useData } from "vitepress";
import { computed, type ComputedRef } from "vue";
import type { Strings } from "../../config/makeConfig.js";

interface ThemeWithStrings {
  docVault?: { strings?: Partial<Strings> };
}

const FALLBACKS: Record<keyof Strings, string> = {
  title: "Documentation",
  description: "",
  lang: "en-US",
  searchLabel: "On this page",
  footerPrev: "Previous",
  footerNext: "Next",
  lastUpdatedText: "Last updated",
  statusPublished: "Published",
  statusDraft: "Draft",
  statusReview: "In review",
  statusArchived: "Archived",
  updatedLabel: "Updated",
  authorLabel: "",
  notFoundCode: "404",
  notFoundHeading: "Page not found",
  notFoundMessage: "The page you're looking for doesn't exist.",
  notFoundLink: "Back to home",
  lightboxClose: "Close",
  featureCtaText: "Open",
  dateLocale: "en-US",
};

export function useStrings(): ComputedRef<Strings> {
  const { theme } = useData();
  return computed(() => {
    const overrides =
      (theme.value as ThemeWithStrings).docVault?.strings ?? {};
    return { ...FALLBACKS, ...overrides } as Strings;
  });
}
