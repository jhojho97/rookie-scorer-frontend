"use client";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { fmtScore, toScore } from "@/lib/format";

/**
 * Headline figure for a scored candidate.
 *
 * The SCORE is the candidate's standing against the held-out cohort, not the
 * model's raw output. The raw value is uncalibrated — a median candidate lands
 * near 18, which on a 0-100 dial reads as a failing grade despite being exactly
 * average — whereas this is well-behaved: 50 is the middle of the field.
 *
 * `showCohort` prints what the score is measured against. Off for the
 * candidate's own report, where the methodology is noise, and on for the
 * reviewer, who needs to know what the number is relative to.
 *
 * Falls back to the raw model output when no reference cohort is available.
 */
export function ScoreGauge({
  prediction,
  baseline,
  percentile,
  cohortN,
  showCohort = true,
}: {
  prediction: number;
  baseline: number;
  percentile?: number | null;
  cohortN?: number;
  showCohort?: boolean;
}) {
  const score = toScore(prediction);
  const base = toScore(baseline);
  const hasRank = typeof percentile === "number";
  const arc = hasRank ? percentile! : score;

  const label = hasRank
    ? `Score ${fmtScore(percentile!)} out of 100${showCohort ? ` against ${cohortN ?? 0} comparable candidates` : ""}. Raw model output ${score}.`
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
            <span className="tnum text-5xl font-semibold tracking-tight">
              {fmtScore(percentile!)}
            </span>
            <span className="text-xs text-muted-foreground">score</span>
            {showCohort && (
              <span className="mt-1 max-w-[7.5rem] text-center text-[11px] leading-tight text-muted-foreground">
                vs {cohortN ?? 0} comparable candidates
              </span>
            )}
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
