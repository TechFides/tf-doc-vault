import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  // Volitelné: branding overrides (siteTitle, logo, navbar links, footer)
  // branding: {
  //   siteTitle: "__PROJECT__",
  //   footer: {
  //     websiteUrl: "https://techfides.cz",
  //     email: "info@techfides.cz",
  //   },
  // },
  //
  // Volitelné: Umami analytics
  // analytics: {
  //   provider: "umami",
  //   websiteId: "00000000-0000-0000-0000-000000000000",
  //   domain: "docs-web.example.com",
  // },
  //
  // Volitelné: Edit link na GitLabu
  // editLink: {
  //   repo: "techfides/tf-analysis/__PROJECT__",
  //   branch: "master",
  // },
});
