import { test, expect } from "./fixtures";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import type { AddressInfo } from "node:net";

// The Docker image serves the built dist at the domain ROOT, not under a base
// prefix, so a base↔nginx mismatch 404s every asset. `vitepress preview`/`dev`
// auto-serve under the configured base and can't catch it; this reproduces the
// nginx layout directly.

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".map": "application/json; charset=utf-8",
};

/** Minimal nginx-equivalent static server: root = distDir, try_files at "/". */
function serveDistAtRoot(distDir: string): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]!);
    const rel = urlPath.replace(/^\/+/, "");
    const base = path.join(distDir, rel);
    // try_files $uri $uri.html $uri/ =404
    const candidates = [base, `${base}.html`, path.join(base, "index.html")];
    const file = candidates.find(
      (c) => fs.existsSync(c) && fs.statSync(c).isFile(),
    );
    if (!file) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    res.setHeader(
      "content-type",
      MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    );
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server)),
  );
}

test("built ana dist renders cleanly when served at the domain root", async ({
  page,
  sandboxes,
  assertCleanRender,
}) => {
  const distDir = path.join(sandboxes.anaDir, "docs", ".vitepress", "dist");
  expect(fs.existsSync(distDir), `dist not found at ${distDir}`).toBe(true);

  // Assets load before page.goto resolves, so the listener has to be attached
  // beforehand; assertCleanRender attaches its own later and misses them.
  const badResponses: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`);
  });

  const server = await serveDistAtRoot(distDir);
  try {
    const { port } = server.address() as AddressInfo;
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForLoadState("networkidle");

    expect(
      badResponses,
      `requests failed; the built base does not match the root serving layout:\n${badResponses.join("\n")}`,
    ).toEqual([]);

    await assertCleanRender(page, {
      expectedStrings: ["ana_test", "Byznys specifikace"],
    });
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
