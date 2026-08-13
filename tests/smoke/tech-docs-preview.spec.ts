import { test, PORTS } from "./fixtures";

// The host repo owns the node_modules, so preview runs from there.
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
      String(PORTS.techDocsPreview),
      "--host",
      "127.0.0.1",
    ],
    cwd: sandboxes.techDocsHostDir,
    readyUrl: `http://127.0.0.1:${PORTS.techDocsPreview}/tech-docs/`,
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["SMK", "Technical documentation"],
  });
});
