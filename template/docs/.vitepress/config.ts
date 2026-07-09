import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  // nginx serves the site at the domain root, so base must be "/" — the
  // folder-derived default ("/docs/") would 404 every asset on the deployed site.
  override: { base: "/" },
  // Volitelné: branding overrides (siteTitle, logo, navbar links, footer)
  // branding: {
  //   siteTitle: "__PROJECT__",
  //   footer: {
  //     websiteUrl: "https://example.com",
  //     email: "info@example.com",
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
