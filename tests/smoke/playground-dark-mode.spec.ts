import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, PORTS } from "./fixtures";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PORT = PORTS.playgroundDarkMode;

test("dark-mode navbar chrome paints over VitePress internals", async ({
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

  await page.goto(server.url);
  await page.waitForLoadState("networkidle");

  // VitePress animates the navbar background-color, so measuring right after
  // the dark-mode toggle would read an intermediate color.
  await page.addStyleTag({
    content:
      "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });

  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });

  const expected = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--vp-c-bg")
      .trim(),
  );
  expect(expected).not.toBe("");

  const navBg = await page
    .locator(".VPNavBar")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);

  function toRgb(hexColor: string): string {
    const match = /^#([0-9a-f]{6})$/i.exec(hexColor);
    if (!match || !match[1]) return hexColor;
    const hex = match[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  expect(navBg).toBe(toRgb(expected));
});
