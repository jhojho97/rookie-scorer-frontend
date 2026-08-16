"use client";
import type { PredictionResult } from "@/types";
import { toScore } from "@/lib/format";

const SET_NAME: Record<string, string> = {
  C: "CV",
  D: "External metrics",
  E: "Paper text",
};

/**
 * How far apart the three per-set models are on this candidate.
 *
 * The score is the average of three independent models (structured CV, external
 * metrics, paper text). When they agree, the average is a summary; when they
 * disagree sharply, the same average hides a real conflict. Showing the spread
 * is the honest minimum for a single headline number.
 *
 * This is model DISAGREEMENT, not a confidence interval. It says nothing about
 * error against ground truth, and the copy below must never imply that it does.
 */
export function ComponentSpread({ result }: { result: PredictionResult }) {
  const entries = Object.entries(result.set_predictions ?? {}).filter(
    ([, v]) => typeof v === "number",
  ) as [string, number][];
  if (entries.length < 2) return null;

  const scores = entries.map(([, v]) => toScore(v));
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const wide = hi - lo >= 15;

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          Model components
        </span>
        <span className="tnum text-xs">
          {lo}–{hi}
        </span>
      </div>
      <ul className="space-y-1">
        {entries.map(([set, v]) => (
          <li key={set} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 text-muted-foreground">{SET_NAME[set] ?? set}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(Math.max(toScore(v), 0), 100)}%` }}
              />
            </div>
            <span className="tnum w-7 text-right">{toScore(v)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {wide
          ? "These three models disagree substantially here, so treat the single score with extra caution."
          : "The three models broadly agree here."}{" "}
        This range shows how much they differ — it is not a confidence interval and does not
        measure accuracy.
      </p>
    </div>
  );
}
