"use client";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { fmtPercentile, toScore } from "@/lib/format";

/**
 * Headline figure for a scored candidate.
 *
 * Shows the PERCENTILE, not the raw model output. The raw score is an
 * uncalibrated ranking value — a median candidate scores about 18, which on a
 * 0-100 dial reads as a failing grade despite being exactly average. The
 * ordering is the trustworthy part, so rank is what gets the large type and
 * what fills the arc (where 0-100 genuinely means something). The raw score
 * stays visible underneath as supporting detail.
 *
 * Falls back to the raw score when no reference cohort is available.
 */
export function ScoreGauge({
  prediction,
  baseline,
  percentile,
  cohortN,
}: {
  prediction: number;
  baseline: number;
  percentile?: number | null;
  cohortN?: number;
}) {
  const score = toScore(prediction);
  const base = toScore(baseline);
  const hasRank = typeof percentile === "number";
  const arc = hasRank ? percentile! : score;

  const label = hasRank
    ? `${fmtPercentile(percentile!)} percentile of ${cohortN ?? 0} comparable candidates. Raw model score ${score}.`
    : `Model score ${score} out of 100. Cohort baseline ${base}.`;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]" role="img" aria-label={label}>
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ name: "score", value: arc, fill: "hsl(var(--accent))" }]}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={12} />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        {hasRank ? (
          <>
            <span className="tnum text-4xl font-semibold tracking-tight">
              {fmtPercentile(percentile!)}
            </span>
            <span className="text-xs text-muted-foreground">percentile</span>
            <span className="mt-1 max-w-[7.5rem] text-center text-[11px] leading-tight text-muted-foreground">
              of {cohortN ?? 0} comparable candidates
            </span>
          </>
        ) : (
          <>
            <span className="tnum text-5xl font-semibold tracking-tight">{score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
            <span className="mt-1 text-[11px] text-muted-foreground">baseline {base}</span>
          </>
        )}
      </div>
    </div>
  );
}
