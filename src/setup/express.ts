import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export interface SetupTechDocsOptions {
  /**
   * Base path where the docs are mounted (e.g., "/tech-docs").
   * Used to derive default distDir if not provided.
   * Default: "/tech-docs"
   */
  basePath?: string;
  /** Absolute path to the built VitePress dist directory. Default: `<cwd>/<basePath>/.vitepress/dist`. */
  distDir?: string;
  auth?: {
    /** Basic-auth username. Default: `"docs"`. */
    username?: string;
    password: string;
  };
  /** Custom logger. Default: `console.warn` with the [tech-docs] prefix. */
  logger?: (msg: string) => void;
}

/**
 * Creates an Express router that serves the VitePress dist behind Basic auth.
 * Returns null when the endpoint should be disabled (no password, or dist not built yet).
 */
export async function createTechDocsHandler(
  opts: SetupTechDocsOptions = {},
): Promise<RequestHandler | null> {
  const log = opts.logger ?? ((m: string): void => console.warn(`[tech-docs] ${m}`));

  if (!opts.auth?.password) {
    log("auth.password not set; tech-docs endpoint disabled");
    return null;
  }

  const mountFolder =
    (opts.basePath ?? "/tech-docs").replace(/^\/+/, "");
  const distDir =
    opts.distDir ?? path.resolve(process.cwd(), `${mountFolder}/docs/.vitepress/dist`);

  if (
    !fs.existsSync(distDir) ||
    !fs.existsSync(path.join(distDir, "index.html"))
  ) {
    log(`dist directory not found at ${distDir}; tech-docs endpoint disabled`);
    return null;
  }

  const { default: express } = await import("express");
  const router = express.Router();

  const { username = "docs", password } = opts.auth;
  const expected = Buffer.from(`${username}:${password}`);

  router.use((req, res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Basic ")) {
      const provided = Buffer.from(header.slice(6), "base64");
      if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
        return next();
      }
    }
    res.setHeader("WWW-Authenticate", `Basic realm="Tech Docs", charset="UTF-8"`);
    res.status(401).end("Authentication required");
  });

  // VitePress relies on inline scripts and styles (window.__VP_SITE_DATA__ etc.).
  // Strip any upstream CSP headers (e.g. from helmet) for this sub-path only.
  // The Basic-auth gate above already protects the route.
  router.use((_req, res, next) => {
    res.removeHeader("content-security-policy");
    res.removeHeader("content-security-policy-report-only");
    next();
  });

  router.use(
    express.static(distDir, { extensions: ["html"], index: "index.html" }),
  );

  router.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  return router;
}
