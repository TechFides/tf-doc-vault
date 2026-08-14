import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const SMOKE_ROOT = process.env.SMOKE_ROOT ?? path.join(os.tmpdir(), "tf-smoke");

interface Sandboxes {
  tgz: string;
  techDocsHostDir: string;
  techDocsDir: string;
  anaDir: string;
  offersRepoDir: string;
  secondOfferDir: string;
}

function loadSandboxes(): Sandboxes {
  const p = path.join(SMOKE_ROOT, "sandboxes.json");
  if (!fs.existsSync(p)) {
    throw new Error(
      `sandboxes.json not found at ${p}. global-setup probably failed.`,
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Sandboxes;
}

export interface WebServerOptions {
  cmd: string;
  args: string[];
  cwd: string;
  readyUrl: string;
  /** Max seconds to wait for readyUrl to respond 2xx. Default 30. */
  timeoutSec?: number;
  /** Inherit stdio (useful for debugging). Default false (captured). */
  inheritStdio?: boolean;
}

export interface WebServer {
  url: string;
  proc: ChildProcess;
  logs: () => string;
}

function probe(url: string): Promise<number> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(0);
    });
  });
}

async function waitForReady(opts: WebServerOptions): Promise<void> {
  const timeoutMs = (opts.timeoutSec ?? 30) * 1000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const code = await probe(opts.readyUrl);
    if (code >= 200 && code < 500) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Server at ${opts.readyUrl} did not become ready in ${opts.timeoutSec ?? 30}s`,
  );
}

export interface Fixtures {
  sandboxes: Sandboxes;
  webServer: (opts: WebServerOptions) => Promise<WebServer>;
  assertCleanRender: (
    page: Page,
    opts: {
      expectedStrings?: string[];
      minBodyChars?: number;
      maxResponseStatus?: number;
    },
  ) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  sandboxes: async ({}, use) => {
    await use(loadSandboxes());
  },

  webServer: async ({}, use) => {
    const servers: WebServer[] = [];
    const spawnServer = async (opts: WebServerOptions): Promise<WebServer> => {
      const logChunks: string[] = [];
      const proc = spawn(opts.cmd, opts.args, {
        cwd: opts.cwd,
        env: { ...process.env, LEFTHOOK: "0" },
        stdio: opts.inheritStdio ? "inherit" : ["ignore", "pipe", "pipe"],
      });
      if (!opts.inheritStdio) {
        proc.stdout?.on("data", (c) => logChunks.push(c.toString()));
        proc.stderr?.on("data", (c) => logChunks.push(c.toString()));
      }
      const server: WebServer = {
        url: opts.readyUrl,
        proc,
        logs: () => logChunks.join(""),
      };
      try {
        await waitForReady(opts);
      } catch (err) {
        const logs = logChunks.join("");
        proc.kill("SIGTERM");
        throw new Error(
          `${(err as Error).message}\n--- server logs ---\n${logs.slice(-4000)}`,
        );
      }
      servers.push(server);
      return server;
    };

    await use(spawnServer);

    // Teardown: kill every server the test spawned.
    for (const s of servers) {
      s.proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 100));
      if (!s.proc.killed) s.proc.kill("SIGKILL");
    }
  },

  assertCleanRender: async ({}, use) => {
    await use(async (page, opts) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const badResponses: { url: string; status: number }[] = [];
      const maxStatus = opts.maxResponseStatus ?? 399;

      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("response", (res) => {
        if (res.status() > maxStatus) {
          badResponses.push({ url: res.url(), status: res.status() });
        }
      });

      // page.goto already happened in the test; just wait for the network to settle.
      await page.waitForLoadState("networkidle");

      const bodyText = await page.evaluate(() => document.body.innerText);
      const minChars = opts.minBodyChars ?? 100;

      const failures: string[] = [];
      if (bodyText.length < minChars) {
        failures.push(
          `body too short (${bodyText.length} chars, expected ≥ ${minChars}): blank page after hydration?`,
        );
      }
      for (const s of opts.expectedStrings ?? []) {
        if (!bodyText.includes(s)) {
          failures.push(
            `expected text not found in body: ${JSON.stringify(s)}`,
          );
        }
      }
      if (pageErrors.length > 0) {
        failures.push(
          `${pageErrors.length} uncaught page error(s):\n  - ${pageErrors.join("\n  - ")}`,
        );
      }
      if (consoleErrors.length > 0) {
        failures.push(
          `${consoleErrors.length} console error(s):\n  - ${consoleErrors.join("\n  - ")}`,
        );
      }
      if (badResponses.length > 0) {
        failures.push(
          `${badResponses.length} response(s) with status > ${maxStatus}:\n  - ${badResponses
            .map((r) => `${r.status} ${r.url}`)
            .join("\n  - ")}`,
        );
      }

      if (failures.length > 0) {
        throw new Error(`assertCleanRender failed:\n${failures.join("\n\n")}`);
      }
    });
  },
});

export { expect };
