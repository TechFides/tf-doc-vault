import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  override: { base: "/tech-docs/" },
  sectionNav: false,
  // Optional: Umami analytics
  // analytics: {
  //   provider: "umami",
  //   websiteId: "00000000-0000-0000-0000-000000000000",
  //   domain: "docs-web.example.com",
  // },
  //
  // Optional: GitHub edit link
  // editLink: {
  //   repo: "__REPO__",
  //   branch: "master",
  //   host: "https://github.com",
  // },
});
