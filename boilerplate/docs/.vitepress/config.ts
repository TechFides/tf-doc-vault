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
  // Optional: put an "Edit this page" link at the bottom of every page, going
  // to the Markdown source in the repository. `repo` is the path part of the
  // repository URL, so https://github.com/acme/srvc-foo means "acme/srvc-foo".
  // GitHub is the default host; a GitLab repo needs the `host` line instead.
  // editLink: {
  //   repo: "__REPO__",
  //   branch: "main",
  //   // host: "https://gitlab.com",
  //   // path: "__REPO_SUBDIR__", // only needed inside a monorepo
  // },
});
