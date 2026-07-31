import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "./fixtures";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PORT = 5176;

const FOLDER = ".VPSidebarItem .text.default-emoji-folder";
const FILE = ".VPSidebarItem .text.default-emoji-file";

function markerOf(page: import("@playwright/test").Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el, "::before").content);
}

test("sidebar markers swap glyphs in dark mode and stay out of the a11y tree", async ({
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

  await page.goto(`${server.url}v1/config/003-nested-group/`);
  await page.waitForLoadState("networkidle");

  // SidebarDefaultEmoji tags the labels on mount, so the classes appear a tick
  // after hydration.
  await expect(page.locator(FOLDER).first()).toBeAttached();

  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  // The `/ ""` is the accessible name: Chromium drops the whole declaration if
  // it does not parse, so asserting the full computed value guards both the
  // glyph and the a11y fix.
  expect(await markerOf(page, FOLDER)).toBe('"◼️ " / ""');
  expect(await markerOf(page, FILE)).toBe('"▪️ " / ""');

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect(await markerOf(page, FOLDER)).toBe('"◻️ " / ""');
  expect(await markerOf(page, FILE)).toBe('"▫️ " / ""');

  const authored = page
    .locator(".VPSidebar .VPSidebarItem > .item .text")
    .filter({ hasText: "Custom icon" })
    .first();
  await expect(authored).not.toHaveClass(/default-emoji-/);
});
