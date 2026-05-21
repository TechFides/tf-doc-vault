import { test } from "./fixtures";

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
      "docs",
      "--port",
      "4173",
      "--host",
      "127.0.0.1",
    ],
    cwd: sandboxes.techDocsDir,
    readyUrl: "http://127.0.0.1:4173/tech-docs/",
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["SMK", "Technická dokumentace"],
  });
});
