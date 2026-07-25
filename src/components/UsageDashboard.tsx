"use client";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUsage } from "@/hooks/useUsage";
import { publicEnv } from "@/lib/env";
import { fmtTokens, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Today's + this-month's spend with a configurable monthly-quota warning. */
export function UsageDashboard({ compact = false }: { compact?: boolean }) {
  const { today, month } = useUsage();
  const quota = publicEnv.monthlyQuotaUsd;
  const pct = quota > 0 ? Math.min((month.usd / quota) * 100, 100) : 0;
  const over = month.usd > quota;

  const Stat = ({ label, usd, tokens }: { label: string; usd: number; tokens: number }) => (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tnum text-xl font-semibold">{fmtUsd(usd)}</div>
      <div className="tnum text-xs text-muted-foreground">{fmtTokens(tokens)} tokens</div>
    </div>
  );

  return (
    <Card>
      <CardContent className={cn("space-y-3", compact ? "p-4" : "p-5")}>
        <div className="flex items-start justify-between gap-6">
          <Stat label="Today's usage" usd={today.usd} tokens={today.tokens} />
          {!compact && <Stat label="This month" usd={month.usd} tokens={month.tokens} />}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Monthly quota</span>
            <span className="tnum">
              {fmtUsd(month.usd)} / {fmtUsd(quota)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", over ? "bg-negative" : "bg-accent")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {over && (
          <div className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            You've exceeded your monthly quota of {fmtUsd(quota)}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
