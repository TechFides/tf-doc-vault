import { defineBuildConfig } from "unbuild";

/**
 * Dual ESM + CJS build for the two NestJS/Express tech-docs entry points.
 * Everything else in the package (theme/, config/, sidebar/, scripts/) is built
 * by tsc + scripts/build.mjs because it ships .vue/.css that consumer Vite has
 * to compile at build time — bundling those through rollup would break SFC
 * handling.
 *
 * tsc has src/setup/** excluded in tsconfig.json so unbuild owns these outputs
 * cleanly. `clean: false` so unbuild doesn't wipe tsc's earlier contribution
 * to dist/.
 */
export default defineBuildConfig({
  entries: ["src/setup/express", "src/setup/nest"],
  outDir: "dist",
  declaration: true,
  sourcemap: true,
  clean: false,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
  externals: ["express", "@nestjs/common"],
});
