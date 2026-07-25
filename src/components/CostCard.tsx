"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Cost } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtTokens, fmtUsd } from "@/lib/format";

const STAGE_COLORS = ["hsl(var(--accent))", "hsl(215 20% 55%)", "hsl(215 14% 72%)"];

export function CostCard({ cost }: { cost: Cost }) {
  const slices = (cost?.breakdown ?? []).map((b) => ({
    name: b.stage,
    value: b.usd,
    tokens: b.input_tokens + b.output_tokens,
    model: b.model,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token cost</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={slices} dataKey="value" innerRadius={30} outerRadius={52} paddingAngle={2}>
                {slices.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const s = payload[0].payload as { name: string; value: number; tokens: number; model: string };
                  return (
                    <div className="rounded-md border border-border bg-card p-2 text-xs shadow-md">
                      <div className="font-medium capitalize">{s.name}</div>
                      <div className="text-muted-foreground">
                        {fmtUsd(s.value)} · {fmtTokens(s.tokens)} tok
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Estimated API cost</span>
            <span className="tnum text-lg font-semibold">{fmtUsd(cost?.usd ?? 0)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total tokens</span>
            <span className="tnum text-sm">{fmtTokens(cost?.total_tokens ?? 0)}</span>
          </div>
          <div className="space-y-1 border-t border-border pt-2">
            {(cost?.breakdown ?? []).map((b, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">
                  {b.stage} <span className="opacity-60">· {b.model}</span>
                </span>
                <span className="tnum">{fmtUsd(b.usd)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
