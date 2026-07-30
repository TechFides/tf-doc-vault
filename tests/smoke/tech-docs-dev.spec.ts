import { test } from "./fixtures";

// The hoist patterns reach a host repo only through the wizard's merge. Without
// them the dev server starts and the build succeeds, while the page hydrates
// blank with "dayjs.min.js does not provide an export named 'default'".
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
