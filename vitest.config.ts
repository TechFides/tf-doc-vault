import { defineConfig } from "vitest/config";

export default defineConfig({
  // `boilerplate/tsconfig.json` extends "@techfides/tf-doc-vault/tsconfig", which
  // only resolves once this package is installed as a dependency of itself (true
  // for a scaffolded consumer, never true in this repo's own node_modules).
  // esbuild's own tsconfig discovery would otherwise fail transforming
  // boilerplate/middleware.ts for its direct unit test; this repo's tests don't
  // rely on any other tsconfig-only esbuild behavior (no paths, no decorators).
  esbuild: { tsconfigRaw: {} },
  test: {
    include: ["tests/unit/**/*.test.{ts,mts,mjs}"],
    environment: "node",
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      // `json-summary` + `json` are what davelosert/vitest-coverage-report-action
      // reads to post the PR comment in CI. `text` is the stdout table,
      // `html` is the interactive local + artifact report.
      reporter: ["text", "html", "json-summary", "json"],
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/index.ts", // public-API re-export barrel (no logic)
        "src/theme/**", // Vue components need a browser runner, not node Vitest
        "src/cli/tf-doc-vault.ts", // process-spawn router, covered by the smoke suite
        "src/cli/logger.ts", // console I/O
      ],
    },
  },
});
