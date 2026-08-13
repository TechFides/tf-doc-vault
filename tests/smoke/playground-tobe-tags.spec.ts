import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "./fixtures";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PORT = 5177;

test("TO-BE tag colours reach content inside the block form", async ({
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

  await page.goto(`${server.url}v1/components/007-tobe-tags`);
  await page.waitForLoadState("networkidle");

  // The theme transitions `color`: without this, a colour read after the
  // dark-mode toggle is an intermediate value and every assertion below passes
  // vacuously.
  await page.addStyleTag({
    content:
      "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });

  const expected = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-tobe-add")
      .trim(),
  );
  expect(expected).not.toBe("");

  const addBlock = page.locator("div.tf-tobe-add").first();
  await expect(addBlock).toBeVisible();

  const headingColor = await addBlock
    .locator("h3")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(headingColor).toBe("rgb(255, 86, 48)");

  const ticketLink = addBlock.locator("a").first();
  await expect(ticketLink).toHaveAttribute(
    "href",
    "https://example.atlassian.net/browse/DOC-9700",
  );
  // `.dark .vp-doc a` is a separate selector from `.vp-doc a`, so both modes
  // need asserting.
  const linkColorOf = async (): Promise<string> =>
    ticketLink.evaluate((el) => getComputedStyle(el).color);
  expect(await linkColorOf()).toBe("rgb(255, 86, 48)");

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect(await linkColorOf()).toBe("rgb(255, 86, 48)");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  const delDecoration = await page
    .locator("div.tf-tobe-del")
    .first()
    .evaluate((el) => getComputedStyle(el).textDecorationLine);
  expect(delDecoration).toContain("line-through");

  const unpaired = page.getByText("this opener is never closed");
  await expect(unpaired).toBeVisible();
  expect(await unpaired.evaluate((el) => el.closest(".tf-tobe") !== null)).toBe(
    false,
  );
});
