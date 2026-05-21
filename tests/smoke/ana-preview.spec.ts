import { test } from "./fixtures";

test("vitepress preview serves ana scaffold cleanly", async ({
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
      "4174",
      "--host",
      "127.0.0.1",
    ],
    cwd: sandboxes.anaDir,
    readyUrl: "http://127.0.0.1:4174/docs/",
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["ana_test", "Byznys specifikace"],
  });
});
