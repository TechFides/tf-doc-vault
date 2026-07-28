import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export interface SetupTechDocsOptions {
  /**
   * Base path where the docs are mounted, and the source of the default
   * `distDir`. Default: `"/tech-docs"`.
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
 * Express router serving the VitePress dist behind Basic auth. Returns null
 * when there is no password or the dist has not been built.
 */
export async function createTechDocsHandler(
  opts: SetupTechDocsOptions = {},
): Promise<RequestHandler | null> {
  const log =
    opts.logger ?? ((m: string): void => console.warn(`[tech-docs] - ${m}`));

  if (!opts.auth?.password) {
    log("auth.password not set; tech-docs endpoint disabled");
    return null;
  }

  const mountFolder = (opts.basePath ?? "/tech-docs").replace(/^\/+/, "");
  const distDir =
    opts.distDir ??
    path.resolve(process.cwd(), `${mountFolder}/docs/.vitepress/dist`);

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
      if (
        provided.length === expected.length &&
        timingSafeEqual(provided, expected)
      ) {
        return next();
      }
    }
    res.setHeader(
      "WWW-Authenticate",
      `Basic realm="Tech Docs", charset="UTF-8"`,
    );
    res.status(401).end("Authentication required");
  });

  // VitePress relies on inline scripts and styles, so strip upstream CSP headers
  // (helmet, for instance) on this sub-path. The Basic-auth gate above guards it.
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

  log(`docs are running at route /${mountFolder}`);

  return router;
}
