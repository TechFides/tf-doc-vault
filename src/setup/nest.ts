import type { INestApplication } from "@nestjs/common";
import { createTechDocsHandler, type SetupTechDocsOptions } from "./express.js";

/**
 * Mount technical documentation alongside the API.
 * Mirrors the shape of `SwaggerModule.setup(path, app, document)`.
 *
 * @example
 *   // In main.ts bootstrap():
 *   await setupTechDocs("tech-docs", app, {
 *     auth: { password: process.env.TECH_DOCS_PASSWORD },
 *   });
 */
export async function setupTechDocs(
  app: INestApplication,
  opts?: SetupTechDocsOptions,
): Promise<void>;
export async function setupTechDocs(
  basePath: string,
  app: INestApplication,
  opts?: SetupTechDocsOptions,
): Promise<void>;
export async function setupTechDocs(
  pathOrApp: string | INestApplication,
  appOrOpts?: INestApplication | SetupTechDocsOptions,
  maybeOpts?: SetupTechDocsOptions,
): Promise<void> {
  let app: INestApplication;
  let basePath: string;
  let opts: SetupTechDocsOptions;

  if (typeof pathOrApp === "string") {
    basePath = pathOrApp.startsWith("/") ? pathOrApp : `/${pathOrApp}`;
    app = appOrOpts as INestApplication;
    opts = maybeOpts ?? {};
  } else {
    basePath = '/tech-docs';
    app = pathOrApp;
    opts = (appOrOpts as SetupTechDocsOptions) ?? {};
  }

  const handler = await createTechDocsHandler(opts);
  if (!handler) return;

  app.getHttpAdapter().use(basePath, handler);
}
