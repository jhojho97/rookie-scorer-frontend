"use client";
import type { Cost } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtTokens, fmtUsd } from "@/lib/format";

/** Per-scoring token cost, shown as plain numbers (no chart). */
export function CostCard({ cost }: { cost: Cost }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token cost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
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
      </CardContent>
    </Card>
  );
}
