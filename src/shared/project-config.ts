import fs from "node:fs";
import path from "node:path";
import { readText } from "./text-file.js";

export const PROJECT_CONFIG_FILE = "tf-doc-vault.json";
const KNOWN_KEYS = ["pdf", "versioned"];

/** A missing file is the documented opt-out; one that does not parse is a typo and throws. */
export function readProjectConfig(
  projectRoot: string,
): Record<string, unknown> {
  const file = path.join(projectRoot, PROJECT_CONFIG_FILE);
  if (!fs.existsSync(file)) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(readText(file));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${PROJECT_CONFIG_FILE} could not be read: ${reason}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `${PROJECT_CONFIG_FILE} could not be read: expected a JSON object`,
    );
  }
  for (const key of Object.keys(parsed)) {
    if (KNOWN_KEYS.includes(key)) continue;
    console.warn(
      `⚠ ${PROJECT_CONFIG_FILE}: unknown key "${key}" (expected one of: ${KNOWN_KEYS.join(", ")})`,
    );
  }
  return parsed as Record<string, unknown>;
}

/** Read from the docs root's parent, the project root `makeConfig` and the CLI scripts share. */
export function isVersioned(docsRoot: string): boolean {
  const value = readProjectConfig(path.dirname(docsRoot))["versioned"];
  if (value === undefined) return true;
  if (typeof value !== "boolean") {
    throw new Error(
      `${PROJECT_CONFIG_FILE}: "versioned" must be true or false, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}
