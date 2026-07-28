import { createTechDocsHandler, type SetupTechDocsOptions } from "./express.js";

/**
 * Structural stand-in for INestApplication, so a @nestjs/common version
 * mismatch cannot reach consumers. Any real INestApplication satisfies it.
 */
interface NestApp {
  getHttpAdapter(): { use(path: string, handler: unknown): void };
}

/**
 * Mount technical documentation alongside the API, mirroring the shape of
 * `SwaggerModule.setup(path, app, document)`.
 *
 * @example
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

  opts.basePath = opts.basePath ?? basePath;

  const handler = await createTechDocsHandler(opts);
  if (!handler) return;

  app.getHttpAdapter().use(basePath, handler);
}
