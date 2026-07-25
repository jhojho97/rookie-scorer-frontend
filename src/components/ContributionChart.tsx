"use client";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopFactor } from "@/types";
import { fmtContribution } from "@/lib/format";

const SET_LABEL: Record<string, string> = {
  C: "CV (structured)",
  D: "External metrics",
  E: "Paper text",
};

/**
 * Horizontal SHAP contribution chart (waterfall-style): green bars push the
 * score up, red bars pull it down. Sorted by magnitude, hover shows detail.
 */
export function ContributionChart({ factors }: { factors: TopFactor[] }) {
  const data = [...factors]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)
    .map((f) => ({ ...f, name: f.label }));

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No contribution factors returned.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={168}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const f = payload[0].payload as TopFactor;
            return (
              <div className="rounded-md border border-border bg-card p-3 text-xs shadow-md">
                <div className="font-medium">{f.label}</div>
                <div className={f.contribution >= 0 ? "text-positive" : "text-negative"}>
                  {fmtContribution(f.contribution)} · {f.direction}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {f.value != null && <>value: {String(f.value)} · </>}
                  {SET_LABEL[f.set] ?? f.set}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="contribution" radius={4} isAnimationActive>
          {data.map((f, i) => (
            <Cell key={i} fill={f.contribution >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
