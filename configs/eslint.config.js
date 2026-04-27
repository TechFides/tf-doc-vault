import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

/**
 * Shared ESLint config for TFSA analysis docs repos.
 * Consumers extend this from their own `eslint.config.js`:
 *
 *   import baseConfig from "@techfides/ana-docs/eslint";
 *   export default baseConfig;
 *
 * Or spread + override:
 *
 *   import baseConfig from "@techfides/ana-docs/eslint";
 *   export default [...baseConfig, { rules: { ... } }];
 */
export default [
  {
    ignores: ["docs/.vitepress/dist/**", "docs/.vitepress/cache/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  prettier,
];
