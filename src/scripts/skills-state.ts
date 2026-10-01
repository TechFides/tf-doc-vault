export type SkillSet = "fallback" | "library";

/** In both the bundled and the library set, so it says nothing about which one is installed. */
const SHARED_NAMES = new Set(["docs-learn-from-session"]);

export function classify(installed: string[], boilerplate: string[]): SkillSet {
  const bundledOnly = boilerplate.filter((name) => !SHARED_NAMES.has(name));
  return installed.some((name) => bundledOnly.includes(name))
    ? "fallback"
    : "library";
}

/** Same file set, same bytes. */
export function isPristine(
  onDisk: Map<string, Buffer>,
  packaged: Map<string, Buffer>,
): boolean {
  if (onDisk.size !== packaged.size) return false;
  for (const [rel, bytes] of packaged) {
    const local = onDisk.get(rel);
    if (!local || !local.equals(bytes)) return false;
  }
  return true;
}

/** `text` is `template` with every `__PLACEHOLDER__` filled by one token. */
export function matchesTemplate(text: string, template: string): boolean {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = "^" + escaped.replace(/__[A-Z0-9_]+__/g, "[^\\s*`]+") + "$";
  return new RegExp(pattern).test(text);
}

export interface CheckSummary {
  behind: number;
  needForce: boolean;
}

const CLI = "npx --yes @techfides/tf-skills-manager@latest";

export function adviceFor(check: CheckSummary, target: string): string | null {
  if (check.behind <= 0) return null;
  const force = check.needForce
    ? " (some have local edits; update --force replaces them)"
    : "";
  return `${check.behind} documentation skill(s) behind the library${force}: run ${CLI} update --target ${target}`;
}

export function switchAdvice(target: string, bundle: string): string {
  return `You have access to the TechFides skills library. Switch with: ${CLI} install --bundle ${bundle} --target ${target} --force`;
}

export function unmanagedAdvice(target: string, bundle: string): string {
  return `These documentation skills are not managed by tf-skills. To switch to the library set (replaces local edits): ${CLI} install --bundle ${bundle} --target ${target} --force`;
}
