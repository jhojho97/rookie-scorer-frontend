"use client";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUsage } from "@/hooks/useUsage";
import { publicEnv } from "@/lib/env";
import { fmtTokens, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Spend for the signed-in user.
 *
 * The month figure and the quota come from the SERVER when it is reachable —
 * that is the number that actually blocks further scoring, counts every device,
 * and cannot be reset by clearing site data. The local ledger is a fallback and
 * powers "today", which the server does not track.
 */
export function UsageDashboard({ compact = false }: { compact?: boolean }) {
  const { today, month, server } = useUsage();
  const quota = server?.cap_usd ?? publicEnv.monthlyQuotaUsd;
  const pct = quota > 0 ? Math.min((month.usd / quota) * 100, 100) : 0;
  const over = quota > 0 && month.usd >= quota;
  const near = !over && pct >= 80;

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
          <Stat label="Today (this browser)" usd={today.usd} tokens={today.tokens} />
          {!compact && <Stat label="This month" usd={month.usd} tokens={month.tokens} />}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{server ? "Monthly limit" : "Monthly quota (local estimate)"}</span>
            <span className="tnum">
              {fmtUsd(month.usd)} / {fmtUsd(quota)}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly spend against limit"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                over ? "bg-negative" : near ? "bg-warning" : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {over && (
          <div className="flex items-start gap-2 rounded-md bg-negative/10 px-3 py-2 text-xs text-negative">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {server
                ? `Monthly limit of ${fmtUsd(quota)} reached — further scoring is blocked until next month.`
                : `You've exceeded your monthly quota of ${fmtUsd(quota)}.`}
            </span>
          </div>
        )}
        {near && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{fmtUsd(quota - month.usd)} of your monthly limit remains.</span>
          </div>
        )}
        {server && server.scores_last_hour >= server.hourly_limit * 0.8 && (
          <p className="text-[11px] text-muted-foreground">
            {server.scores_last_hour} of {server.hourly_limit} scorings used this hour.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
