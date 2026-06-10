import { makeConfig } from "@techfides/tf-doc-vault/config";

export default makeConfig({
  configDir: import.meta.dirname,
  project: "__PROJECT__",
  override: { base: "/tech-docs/" },
  // Tech-docs mívají hodně sekcí — odkazy v horní navigaci přetékají a sidebar
  // je zobrazuje tak jako tak. Pro zobrazení sekcí nahoře řádek smaž.
  sectionNav: false,
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
