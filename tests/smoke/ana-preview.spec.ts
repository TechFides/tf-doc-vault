import { test, PORTS } from "./fixtures";

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
      String(PORTS.anaPreview),
      "--host",
      "127.0.0.1",
    ],
    cwd: sandboxes.anaDir,
    // The ana template pins base to "/" (served at the domain root by nginx),
    // so vitepress preview serves at "/", not "/docs/".
    readyUrl: `http://127.0.0.1:${PORTS.anaPreview}/`,
  });

  await page.goto(server.url);
  await assertCleanRender(page, {
    expectedStrings: ["ana_test", "Byznys specifikace"],
  });
});
