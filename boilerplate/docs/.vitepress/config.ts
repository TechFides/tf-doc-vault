import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  // base has to match the path the site is served from; the folder-derived
  // default ("/docs/") would 404 every asset once deployed.
  override: { base: "__DOCS_BASE__" },
  sectionNav: __SECTION_NAV__,
  // Optional: branding overrides (siteTitle, logo, navbar links, footer)
  // branding: {
  //   siteTitle: "__PROJECT__",
  //   footer: {
  //     websiteUrl: "https://example.com",
  //     email: "info@example.com",
  //   },
  // },
  //
  // Optional: Umami analytics
  // analytics: {
  //   provider: "umami",
  //   websiteId: "00000000-0000-0000-0000-000000000000",
  //   domain: "docs-web.example.com",
  // },
  //
  // Optional: edit link. GitLab is the default host, so a GitHub repo needs the
  // `host` line as well.
  // editLink: {
  //   repo: "__REPO__",
  //   branch: "master",
  //   // host: "https://github.com",
  // },
});
