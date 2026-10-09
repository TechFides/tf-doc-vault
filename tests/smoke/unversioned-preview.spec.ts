import path from "node:path";
import { expect } from "@playwright/test";
import { test, PORTS } from "./fixtures";

test("an unversioned site is served from / and hydrates cleanly", async ({
  page,
  sandboxes,
  webServer,
  assertCleanRender,
}) => {
  const server = await webServer({
    cmd: path.join(
      sandboxes.unversionedDir,
      "node_modules",
      ".bin",
      "vitepress",
    ),
    args: [
      "preview",
      "docs",
      "--port",
      String(PORTS.unversionedPreview),
      "--host",
      "127.0.0.1",
    ],
    cwd: sandboxes.unversionedDir,
    readyUrl: `http://127.0.0.1:${PORTS.unversionedPreview}/`,
  });

  await page.goto(`${server.url}byznys-specifikace/`);
  await assertCleanRender(page, { expectedStrings: ["Byznys specifikace"] });

  const links = await page
    .locator(".VPSidebar a, .VPNav a")
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
  expect(links.some((href) => href.startsWith("/byznys-specifikace/"))).toBe(
    true,
  );
  expect(links.filter((href) => href.includes("/v1/"))).toEqual([]);
  // Read as versioned, every section would be a version behind a "Verze" menu.
  await expect(page.locator(".VPNav")).not.toContainText("Verze");
});
