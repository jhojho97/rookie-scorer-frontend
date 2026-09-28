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
 * Both are kept out of the ranked tables, their rank numbers and the export, and are
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
 * Scored candidates split by whether a job-market paper was used.
 *
 * A CV-only score averages two models (C, D) and a with-paper score three
 * (C, D, E), so the two sit on different scales: removing the paper moves a
 * held-out 2018 candidate's score by a median of +4.5 points at the top 5%
 * target and -2.5 at the top 30%. Ranked in one list, that shift would decide
 * places, so each group is ranked only against itself. Results saved before
 * `paper_used` existed count as with-paper.
 */
export function paperGroups(scored: PredictionResult[]) {
  const withPaper: PredictionResult[] = [];
  const cvOnly: PredictionResult[] = [];
  for (const r of scored) (r.paper_used === false ? cvOnly : withPaper).push(r);
  return { withPaper, cvOnly };
}

/**
 * The number candidates are ranked on: the score shown, which is the model's
 * probability of reaching the chosen target (0-1, displayed 0-100). Only
 * compare it within one paperGroups() group.
 */
export const rankValue = (r: PredictionResult) =>
  typeof r.prediction === "number" ? r.prediction : -1;

/**
 * Position among the candidates passed in (one paperGroups() group), best first.
 * Competition style: ties share a rank (1, 2, 2, 4).
 */
export function rankScored(scored: PredictionResult[]): Map<PredictionResult, number> {
  const order = [...scored].sort((a, b) => rankValue(b) - rankValue(a));
  const map = new Map<PredictionResult, number>();
  order.forEach((r, i) => {
    const prev = order[i - 1];
    map.set(r, prev && rankValue(prev) === rankValue(r) ? map.get(prev)! : i + 1);
  });
  return map;
}
