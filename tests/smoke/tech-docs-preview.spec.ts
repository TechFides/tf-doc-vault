import { test } from "./fixtures";

// The host repo owns the scripts and the node_modules, so preview runs from
// there with the scaffolded folder as the VitePress root.
test("vitepress preview serves tech-docs cleanly", async ({
  page,
  sandboxes,
  webServer,
  assertCleanRender,
}) => {
  const server = await webServer({
    cmd: "pnpm",
    args: [
      "exec",
      "vitepress",
      "preview",
      "tech-docs/docs",
      "--port",
      "4173",
      "--host",
      "127.0.0.1",
    ],
    cwd: sandboxes.techDocsHostDir,
    readyUrl: "http://127.0.0.1:4173/tech-docs/",
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["SMK", "Technical documentation"],
  });
});
