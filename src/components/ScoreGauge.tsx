"use client";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { toScore } from "@/lib/format";

/**
 * Radial gauge for the 0..100 research-productivity score, with the baseline
 * marked for context. Accent for the score arc; muted track.
 */
export function ScoreGauge({ prediction, baseline }: { prediction: number; baseline: number }) {
  const score = toScore(prediction);
  const base = toScore(baseline);
  const data = [{ name: "score", value: score, fill: "hsl(var(--accent))" }];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]">
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={12} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-5xl font-semibold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
        <span className="mt-1 text-[11px] text-muted-foreground">baseline {base}</span>
      </div>
    </div>
  );
}
