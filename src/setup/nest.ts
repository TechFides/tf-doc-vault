import { createTechDocsHandler, type SetupTechDocsOptions } from "./express.js";

/**
 * Minimal structural interface — avoids importing INestApplication from
 * @nestjs/common so consumers are never affected by version mismatches.
 * Any real INestApplication satisfies this structurally.
 */
interface NestApp {
  getHttpAdapter(): { use(path: string, handler: unknown): void };
}

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
  app: NestApp,
  opts?: SetupTechDocsOptions,
): Promise<void>;
export async function setupTechDocs(
  basePath: string,
  app: NestApp,
  opts?: SetupTechDocsOptions,
): Promise<void>;
export async function setupTechDocs(
  pathOrApp: string | NestApp,
  appOrOpts?: NestApp | SetupTechDocsOptions,
  maybeOpts?: SetupTechDocsOptions,
): Promise<void> {
  let app: NestApp;
  let basePath: string;
  let opts: SetupTechDocsOptions;

  if (typeof pathOrApp === "string") {
    basePath = pathOrApp.startsWith("/") ? pathOrApp : `/${pathOrApp}`;
    app = appOrOpts as NestApp;
    opts = maybeOpts ?? {};
  } else {
    basePath = "/tech-docs";
    app = pathOrApp;
    opts = (appOrOpts as SetupTechDocsOptions) ?? {};
  }

  // Ensure basePath is passed to createTechDocsHandler to correctly derive distDir
  opts.basePath = opts.basePath ?? basePath;

  const handler = await createTechDocsHandler(opts);
  if (!handler) return;

  app.getHttpAdapter().use(basePath, handler);
}
