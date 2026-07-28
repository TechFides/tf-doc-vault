import { defineBuildConfig } from "unbuild";

/**
 * Dual ESM + CJS build for the two tech-docs entry points. The rest of the
 * package goes through tsc + scripts/build.mjs because it ships .vue/.css that
 * the consumer's Vite compiles at build time; running those through rollup
 * would break SFC handling. tsconfig.json excludes src/setup/**, so unbuild
 * owns these outputs, and `clean: false` keeps tsc's earlier work in dist/.
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
