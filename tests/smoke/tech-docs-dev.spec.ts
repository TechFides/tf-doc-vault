import { test } from "./fixtures";

// The scaffold into a host repo excludes the boilerplate's pnpm-workspace.yaml,
// so the hoist patterns reach the host only through the wizard's merge. Without
// them the dev server still starts and the build still succeeds, while the page
// hydrates blank with "dayjs.min.js does not provide an export named 'default'".
test("pnpm docs:dev hydrates the tech-docs scaffold without errors", async ({
  page,
  sandboxes,
  webServer,
  assertCleanRender,
}) => {
  const server = await webServer({
    cmd: "pnpm",
    args: ["docs:dev", "--port", "5175", "--host", "127.0.0.1"],
    cwd: sandboxes.techDocsHostDir,
    readyUrl: "http://127.0.0.1:5175/tech-docs/",
    timeoutSec: 60,
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["SMK", "Technical documentation"],
  });
});
