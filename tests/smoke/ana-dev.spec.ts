import { test } from "./fixtures";

// vitepress dev exercises Vite's CJS pre-bundling path, where a regression in
// publicHoistPattern (mermaid / dayjs / debug / cytoscape) shows up: the page
// hydrates blank and the console logs "does not provide an export named
// 'default'".
test("vitepress dev server hydrates ana scaffold without errors", async ({
  page,
  sandboxes,
  webServer,
  assertCleanRender,
}) => {
  const server = await webServer({
    cmd: "pnpm",
    args: ["docs:dev", "--port", "5174", "--host", "127.0.0.1"],
    cwd: sandboxes.anaDir,
    // base is pinned to "/" in the ana template, so dev serves at "/".
    readyUrl: "http://127.0.0.1:5174/",
    timeoutSec: 60,
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["ana_test", "Byznys specifikace"],
  });
});
