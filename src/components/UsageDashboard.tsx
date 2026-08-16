"use client";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUsage } from "@/hooks/useUsage";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/cn";

/**
 * How much of the monthly scoring limit is used.
 *
 * Deliberately proportional, with no dollar or token totals. Those absolutes
 * told the user nothing they could act on — they don't pay the API bill — and
 * two of them openly contradicted each other: the browser's own ledger
 * accumulates forever, while the enforced server counter is in-memory and
 * resets whenever the instance restarts, so the panel could show $0.28 spent
 * beside $0.02 of the limit consumed. The bar answers the only question that
 * matters here: how close am I to being cut off?
 *
 * The percentage comes from the SERVER when reachable — that is the figure
 * that actually blocks work, counts every device, and cannot be cleared by
 * wiping site data.
 */
export function UsageDashboard({ compact = false }: { compact?: boolean }) {
  const { month, server } = useUsage();
  const quota = server?.cap_usd ?? publicEnv.monthlyQuotaUsd;
  const pct = quota > 0 ? Math.min((month.usd / quota) * 100, 100) : 0;
  const over = quota > 0 && month.usd >= quota;
  const near = !over && pct >= 80;
  // Round up, so any usage at all reads as at least 1% rather than "0% used".
  const shown = pct > 0 && pct < 1 ? 1 : Math.round(pct);

  return (
    <Card>
      <CardContent className={cn("space-y-2", compact ? "p-4" : "p-5")}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">Monthly limit</span>
          <span className="tnum text-xs text-muted-foreground">{shown}% used</span>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={shown}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Monthly scoring limit used"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              over ? "bg-negative" : near ? "bg-warning" : "bg-accent",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {over && (
          <div className="flex items-start gap-2 rounded-md bg-negative/10 px-3 py-2 text-xs text-negative">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Monthly limit reached — scoring is paused until it resets.</span>
          </div>
        )}
        {near && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>You&apos;re close to your monthly limit.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
