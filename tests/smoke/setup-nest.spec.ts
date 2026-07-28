import { test } from "./fixtures";
import { chromium } from "@playwright/test";
import path from "node:path";

const flavors = [
  { name: "nest-esm", entry: "app.mjs", port: 3003 },
  { name: "nest-cjs", entry: "app.cjs", port: 3004 },
] as const;

for (const flavor of flavors) {
  test(`setup/nest ${flavor.name}: serves docs through basic auth`, async ({
    sandboxes,
    webServer,
    assertCleanRender,
  }) => {
    const url = `http://127.0.0.1:${flavor.port}/tech-docs/`;
    const server = await webServer({
      cmd: "node",
      args: [flavor.entry],
      cwd: path.join(sandboxes.probeRoot, flavor.name),
      readyUrl: url,
      readyAuth: { username: "docs", password: "pw" },
    });

    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({
        httpCredentials: { username: "docs", password: "pw" },
      });
      const page = await ctx.newPage();
      await page.goto(server.url);
      await assertCleanRender(page, {
        expectedStrings: ["SMK", "Technical documentation"],
      });
      await ctx.close();
    } finally {
      await browser.close();
    }
  });
}
