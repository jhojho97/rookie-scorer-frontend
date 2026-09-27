import type { PredictionResult, TargetResult } from "@/types";

/**
 * The research-productivity levels a result can be viewed at. Each is a
 * separate model and a separate ranking: a candidate can reasonably score 90
 * against one and 70 against another.
 *
 * The labels are the dataset's own definitions (Ke & Long, Table 7):
 * citation-weighted top-journal publications over the five years after
 * graduating, cut at the top 5/10/20/30% of the cohort.
 */
export const TARGETS = [
  { key: "pub_w_top_5pct", short: "Top 5%", pct: 5 },
  { key: "pub_w_top_10pct", short: "Top 10%", pct: 10 },
  { key: "pub_w_top_20pct", short: "Top 20%", pct: 20 },
  { key: "pub_w_top_30pct", short: "Top 30%", pct: 30 },
] as const;

export type TargetKey = (typeof TARGETS)[number]["key"];
export const DEFAULT_TARGET: TargetKey = "pub_w_top_5pct";

export const targetInfo = (key: string) => TARGETS.find((t) => t.key === key) ?? TARGETS[0];

/** One line saying what the score measures at a target, for the report and the PDF. */
export const describeTarget = (key: string) =>
  `The model's probability, out of 100, of the candidate reaching the top ${targetInfo(key).pct}% ` +
  `of their cohort by citation-weighted top-journal publications in the five years after graduating.`;

/**
 * A result as seen through one target.
 *
 * The API keeps its top-level fields as the default (5%) target's result and
 * adds a `targets` map with every target. Results without that map -- older
 * saved batches, or a server that has not been updated -- only have the
 * default target, and asking for another returns null.
 */
export function forTarget(r: PredictionResult, key: TargetKey): PredictionResult | null {
  if (r.status === "error") return r; // a failed scoring has nothing per target
  const t: TargetResult | undefined = r.targets?.[key];
  if (t) return { ...r, ...t, target: key };
  return key === ((r.target as TargetKey) ?? DEFAULT_TARGET) ? r : null;
}

/** Targets every scored result in the set can be viewed at, in display order. */
export function availableTargets(results: PredictionResult[]): TargetKey[] {
  const scored = results.filter((r) => r.status !== "error");
  if (!scored.length) return [DEFAULT_TARGET];
  return TARGETS.map((t) => t.key).filter((k) => scored.every((r) => forTarget(r, k) !== null));
}

/** The chosen target, or the default when the choice is not available here. */
export function resolveTarget(choice: TargetKey, available: TargetKey[]): TargetKey {
  return available.includes(choice) ? choice : available[0] ?? DEFAULT_TARGET;
}
