// Named .mjs, not .cjs or .js: wagoid/commitlint-github-action looks for
// commitlint.config.mjs by default, and a config it cannot find is silently
// replaced by its own bundled one, whose parser rejects the `type!:` breaking
// marker.
export default { extends: ["@commitlint/config-conventional"] };
