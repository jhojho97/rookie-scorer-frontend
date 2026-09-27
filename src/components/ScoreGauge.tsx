"use client";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { toScore } from "@/lib/format";
import { DEFAULT_TARGET, targetInfo } from "@/lib/targets";

/**
 * Headline figure for a scored candidate.
 *
 * The score is the model's probability of the candidate reaching the chosen
 * target, shown 0-100. The placement against the 2018 reference candidates
 * (`percentile`) is still returned by the API but deliberately not shown: next
 * to the probability it could contradict the rank order in mixed batches. (Product decision: the probability is shown
 * as the model gives it. Training weights the rare top researchers heavily, so
 * it runs above the real rates -- a typical candidate is ~22 at the top-5%
 * target. That is recorded here for maintainers, not shown to users.)
 */
export function ScoreGauge({
  prediction,
  target = DEFAULT_TARGET,
}: {
  prediction: number;
  baseline?: number;
  percentile?: number | null;
  cohortN?: number;
  showCohort?: boolean;
  target?: string;
}) {
  const score = toScore(prediction);
  const t = targetInfo(target);

  const label = `Score ${score} out of 100: the model's probability of reaching the top ${t.pct}%.`;

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-[240px]" role="img" aria-label={label}>
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ name: "score", value: score, fill: "hsl(var(--accent))" }]}
            startAngle={220}
            endAngle={-40}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={12} />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="tnum text-5xl font-semibold tracking-tight">{score}</span>
          <span className="mt-1 text-xs text-muted-foreground">probability score</span>
        </div>
      </div>

    </div>
  );
}
