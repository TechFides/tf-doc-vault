import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  // Docs žijí v docs/ uvnitř tech-docs/; base musí odpovídat NestJS mount pointu.
  override: { base: "/tech-docs/" },
  // Volitelné: Umami analytics
  // analytics: {
  //   provider: "umami",
  //   websiteId: "00000000-0000-0000-0000-000000000000",
  //   domain: "docs-web.example.com",
  // },
  //
  // Volitelné: Edit link na GitHubu
  // editLink: {
  //   repo: "__REPO__",
  //   branch: "master",
  //   host: "https://github.com",
  // },
});
