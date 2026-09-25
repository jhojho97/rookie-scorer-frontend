import type { PredictionResult } from "@/types";

/**
 * Which batch results belong in the ranking, and which must be set apart.
 *
 * Two kinds of result carry no usable score:
 *  - a failed scoring (status "error"), which has no number at all, and
 *  - a CV that could not be read (extraction_ok false). This one DOES come back
 *    with a number, which is the danger: with nothing extracted, the CV features
 *    are all defaults and there is no institution to look up, so the score is
 *    computed from an almost empty profile. Ranked beside real candidates it
 *    reads as "this person is weak" when the truth is "we could not see them".
 *
 * Both are kept out of the ranked table, its rank numbers and the CSV, and are
 * listed separately with the reason, so nobody is compared on a number that
 * does not describe them and nobody silently drops out of the batch either.
 */

export type FlagKind = "failed" | "unreadable";

export interface FlaggedResult {
  result: PredictionResult;
  kind: FlagKind;
  /** What went wrong, from the backend when it said. */
  reason: string;
  /** What the recruiter can do about it. */
  action: string;
}

export function flagOf(r: PredictionResult): FlaggedResult | null {
  if (r.status === "error" || typeof r.prediction !== "number") {
    return {
      result: r,
      kind: "failed",
      reason: r.reason?.trim() || "Scoring did not complete.",
      action: "Check the files open correctly, then score this candidate again.",
    };
  }
  if (r.extraction_ok === false) {
    const problems = (r.extraction_problems ?? []).filter(Boolean).join(" ");
    return {
      result: r,
      kind: "unreadable",
      reason: problems || "No readable text was found in the CV.",
      action: "Upload a text-based PDF or DOCX rather than a scan, then score again.",
    };
  }
  return null;
}

export function splitResults(results: PredictionResult[]) {
  const scored: PredictionResult[] = [];
  const flagged: FlaggedResult[] = [];
  for (const r of results) {
    const f = flagOf(r);
    if (f) flagged.push(f);
    else scored.push(r);
  }
  return { scored, flagged };
}

/**
 * Position within the batch among SCORED candidates only, best first.
 * Competition style: ties share a rank (1, 2, 2, 4).
 */
export function rankScored(scored: PredictionResult[]): Map<PredictionResult, number> {
  const order = [...scored].sort((a, b) => b.prediction - a.prediction);
  const map = new Map<PredictionResult, number>();
  order.forEach((r, i) => {
    const prev = order[i - 1];
    map.set(r, prev && prev.prediction === r.prediction ? map.get(prev)! : i + 1);
  });
  return map;
}
