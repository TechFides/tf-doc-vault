import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, PORTS } from "./fixtures";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PORT = PORTS.playgroundWidthToggle;

// The landing page is the strict case: the panel rule that caps the doc column at the
// reading measure only matches there (:not(.has-sidebar)), so a layout-* rule that sits
// below it in specificity loses and the widest mode silently renders the narrowest
// column. Sub-pages carry .has-sidebar and never showed it.
test("WidthToggle modes widen the landing-page column, never narrow it", async ({
  page,
  webServer,
}) => {
  const server = await webServer({
    cmd: "pnpm",
    args: [
      "exec",
      "vitepress",
      "dev",
      "playground/docs",
      "--port",
      String(PORT),
      "--host",
      "127.0.0.1",
    ],
    cwd: REPO_ROOT,
    readyUrl: `http://127.0.0.1:${PORT}/`,
    timeoutSec: 60,
  });

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(server.url);
  await page.waitForLoadState("networkidle");

  await expect(page.locator(".brand-hero")).toBeVisible();

  const widthIn = async (mode: "default" | "wide" | "max") => {
    await page.evaluate((m) => {
      const root = document.documentElement;
      root.classList.remove("layout-wide", "layout-max");
      if (m !== "default") root.classList.add(`layout-${m}`);
    }, mode);
    return page
      .locator(".VPDoc .content-container")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width);
  };

  const def = await widthIn("default");
  const wide = await widthIn("wide");
  const max = await widthIn("max");

  expect(wide).toBeGreaterThan(def);
  expect(max).toBeGreaterThan(wide);
});
