"use client";
import { Loader2, Moon } from "lucide-react";

/**
 * Progress for a running scoring job.
 *
 * The backend has always reported "3/7" and published results as each candidate
 * landed; the UI showed a bare spinner and threw both away. For a wait of one
 * to several minutes, knowing how many are done — and that a cold instance is
 * waking rather than hanging — is the difference between patience and a reload.
 */
export function JobProgress({
  done,
  total,
  coldStart,
  etaSeconds,
  unit = "candidate",
}: {
  done: number;
  total: number;
  coldStart?: boolean;
  etaSeconds?: number;
  unit?: string;
}) {
  const known = total > 0;
  const pct = known ? Math.min((done / total) * 100, 100) : 0;
  const eta = etaSeconds && etaSeconds > 0 ? formatEta(etaSeconds) : null;

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <p className="text-sm font-medium">
          {known ? `Scoring ${done} of ${total} ${unit}${total === 1 ? "" : "s"}` : "Scoring…"}
        </p>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={known ? done : undefined}
        aria-valuemin={0}
        aria-valuemax={known ? total : undefined}
        aria-label="Scoring progress"
      >
        <div
          className={
            known
              ? "h-full rounded-full bg-accent transition-all duration-500"
              : "h-full w-1/3 animate-pulse rounded-full bg-accent"
          }
          style={known ? { width: `${pct}%` } : undefined}
        />
      </div>

      {coldStart ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Moon className="h-3.5 w-3.5 shrink-0" />
          The scoring service was asleep and is starting up — this first one takes about a minute.
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          {eta ? `About ${eta} remaining. ` : ""}You can leave this tab open.
        </p>
      )}
    </div>
  );
}

function formatEta(seconds: number): string {
  if (seconds < 60) return "under a minute";
  const mins = Math.round(seconds / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}
