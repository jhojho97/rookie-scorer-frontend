"use client";
import { Loader2, Moon } from "lucide-react";

/**
 * Progress for a running scoring job.
 *
 * Two genuinely different cases, drawn differently.
 *
 * A batch (HR) has countable progress, so it gets a real percentage and a
 * filling bar. A single profile (student) has total = 1 and done = 0 for its
 * whole duration -- there is no percentage to report that is not invented, so
 * it gets a travelling bar instead. The old code drew both the same way and
 * the single case rendered as "Scoring 0 of 1 profile" above a bar stuck at 0%
 * for forty seconds, which is indistinguishable from a hung job.
 */
export function JobProgress({
  done,
  total,
  coldStart,
  unit = "candidate",
  label,
}: {
  done: number;
  total: number;
  coldStart?: boolean;
  unit?: string;
  /** Heading shown while there is nothing countable yet. Defaults to the unit. */
  label?: string;
}) {
  // Only a multi-item job has progress worth counting. One item is either not
  // started or finished, and a bar with two states is not a progress bar.
  const countable = total > 1;
  const pct = countable ? Math.min((done / total) * 100, 100) : 0;

  return (
    <div className="w-full max-w-md space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
          {countable ? `Scoring ${unit}s` : label ?? `Scoring ${unit}`}
        </p>
        {countable && (
          <p className="tnum shrink-0 text-base font-semibold text-foreground">
            {Math.round(pct)}%
          </p>
        )}
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border"
        role="progressbar"
        aria-valuenow={countable ? Math.round(pct) : undefined}
        aria-valuemin={0}
        aria-valuemax={countable ? 100 : undefined}
        aria-label={countable ? "Scoring progress" : "Scoring in progress"}
      >
        {countable ? (
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-1/4 rounded-full bg-accent motion-safe:animate-slide" />
        )}
      </div>

      {coldStart ? (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Moon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The scoring service was asleep and is starting up — this first one takes about a
            minute.
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {countable
            ? `${done} of ${total} done. You can leave this tab open.`
            : "You can leave this tab open."}
        </p>
      )}
    </div>
  );
}
