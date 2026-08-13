import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "./fixtures";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const PORT = 5176;

const FOLDER_CLASS = ".text.default-emoji-folder";
const FILE_CLASS = ".text.default-emoji-file";
const FOLDER = `.VPSidebarItem ${FOLDER_CLASS}`;
const FILE = `.VPSidebarItem ${FILE_CLASS}`;
const ACTIVE = `.VPSidebarItem.is-active > .item ${FOLDER_CLASS}, .VPSidebarItem.is-active > .item ${FILE_CLASS}`;

function markerOf(page: import("@playwright/test").Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      return { content: s.content, image: s.backgroundImage, width: s.width };
    });
}

/**
 * Where each label's first glyph actually starts. A Range over the text node rather
 * than the element box, because the marker lives in the element's padding and the box
 * would not show whether the text lines up.
 *
 * Depth is the count of collapsible ancestors, not the `level-N` class: VitePress
 * wraps consecutive top-level pages in a non-collapsible level-0 item, so those pages
 * are level-1 while sitting at the same visual depth as a level-0 group.
 */
function labelStarts(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const rows = [
      ...document.querySelectorAll(".VPSidebar .VPSidebarItem > .item .text"),
    ];
    return rows.map((t) => {
      const item = t.closest(".VPSidebarItem");
      const textNode = [...t.childNodes].find(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
      );
      let x: number | null = null;
      if (textNode) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        x = Math.round(range.getBoundingClientRect().x * 10) / 10;
      }
      let depth = 0;
      let group = item?.parentElement?.closest(".VPSidebarItem.collapsible");
      const parent =
        group?.querySelector(":scope > .item .text")?.textContent?.trim() ?? "";
      while (group) {
        depth += 1;
        group = group.parentElement?.closest(".VPSidebarItem.collapsible");
      }
      return {
        label: t.textContent?.trim() ?? "",
        depth,
        parent,
        kind: t.className.includes("folder")
          ? "square"
          : t.className.includes("file")
            ? "dot"
            : "emoji",
        x,
      };
    });
  });
}

test("sidebar markers share one slot so labels align, and follow the theme", async ({
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

  // Two levels deep, so the tree is expanded and one level holds all three marker
  // kinds at once: a leaf, a group, and a page whose title starts with an emoji.
  await page.goto(`${server.url}v1/config/003-nested-group/003-deeper/`);
  await page.waitForLoadState("networkidle");

  // SidebarDefaultEmoji tags the labels on mount, so the classes appear a tick
  // after hydration.
  await expect(page.locator(FOLDER).first()).toBeAttached();

  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  // The alignment this whole slot exists for: within one nesting level, a square, a
  // dot and an author's emoji must all leave the label starting at the same x. While
  // the marker sat in the text flow they differed by up to 14px.
  const rows = await labelStarts(page);
  const siblings = rows.filter(
    (r) => r.parent === "Nested group" && r.x !== null,
  );
  const kinds = new Set(siblings.map((r) => r.kind));
  expect(kinds).toContain("emoji");
  expect(kinds.size).toBeGreaterThan(1);
  expect(new Set(siblings.map((r) => r.x)).size).toBe(1);

  // One indent step per level of nesting, the same step at every depth. VitePress
  // gave a level-1 group's children 24px and a level-0 group's children none.
  const depths = [...new Set(rows.map((r) => r.depth))].sort((a, b) => a - b);
  expect(depths.length).toBeGreaterThan(2);
  const perDepth = depths.map(
    (d) => rows.find((r) => r.depth === d && r.x !== null)?.x ?? 0,
  );
  const steps = perDepth.slice(1).map((x, i) => x - (perDepth[i] ?? 0));
  expect(new Set(steps).size).toBe(1);

  const folderLight = await markerOf(page, FOLDER);
  const fileLight = await markerOf(page, FILE);

  // `content: "" / ""` is the accessible name, blanked so a screen reader does not
  // announce a marker before every label. Chromium drops the whole declaration if it
  // fails to parse, and then no box is generated, so asserting the exact computed
  // value guards the a11y fix and the marker rendering at once.
  expect(folderLight.content).toBe('"" / ""');
  expect(fileLight.content).toBe('"" / ""');

  // Both slots are the same width; the marker inside is a centred background, which
  // is what lets one slot hold shapes of different sizes without moving the label.
  expect(folderLight.width).toBe(fileLight.width);

  // Drawn, not written: the emoji these replaced carried U+FE0F and were painted by
  // the emoji font, which `color` cannot reach. A group is a square, a page a dot.
  expect(folderLight.image).not.toBe("none");
  expect(fileLight.image).not.toBe("none");
  expect(folderLight.image).not.toBe(fileLight.image);

  // The whole point of dropping the emoji: the marker follows the theme. The active
  // entry takes the accent, and the accent differs between the two modes.
  const activeLight = await markerOf(page, ACTIVE);
  expect(activeLight.image).not.toBe(folderLight.image);
  expect(activeLight.image).not.toBe(fileLight.image);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const activeDark = await markerOf(page, ACTIVE);
  expect(activeDark.image).not.toBe(activeLight.image);

  const authored = page
    .locator(".VPSidebar .VPSidebarItem > .item .text")
    .filter({ hasText: "Custom icon" })
    .first();
  await expect(authored).not.toHaveClass(/default-emoji-/);
  // The emoji is hoisted into the slot, and marked decorative there so the link
  // reads "Custom icon" rather than the glyph's name plus the label.
  await expect(authored.locator(".tf-sb-marker")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});
