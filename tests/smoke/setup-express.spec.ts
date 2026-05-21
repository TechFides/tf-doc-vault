import { test, expect } from "./fixtures";
import { chromium } from "@playwright/test";
import path from "node:path";

const flavors = [
  { name: "express-esm", entry: "app.mjs", port: 3001 },
  { name: "express-cjs", entry: "app.cjs", port: 3002 },
] as const;

for (const flavor of flavors) {
  test(`setup/express ${flavor.name} — serves docs through basic auth`, async ({
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

    // (1) Without credentials → 401 from the route and its subresources.
    const browser = await chromium.launch();
    try {
      const noAuthContext = await browser.newContext();
      const noAuthPage = await noAuthContext.newPage();
      const noAuthResponse = await noAuthPage.goto(url).catch(() => null);
      expect(noAuthResponse?.status()).toBe(401);
      await noAuthContext.close();

      // (2) With credentials → full render, every asset 2xx.
      const authContext = await browser.newContext({
        httpCredentials: { username: "docs", password: "pw" },
      });
      const page = await authContext.newPage();
      await page.goto(server.url);
      await assertCleanRender(page, {
        expectedStrings: ["SMK", "Technická dokumentace"],
      });
      await authContext.close();
    } finally {
      await browser.close();
    }
  });
}
