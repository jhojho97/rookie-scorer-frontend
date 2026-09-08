"use client";
import { useEffect, useState } from "react";
import { Loader2, Moon } from "lucide-react";

/**
 * Progress for a running scoring job.
 *
 * There are two genuinely different cases here and they were being drawn the
 * same way, which is what made the single-candidate one illegible:
 *
 *  - A batch (HR) has real countable progress. "3 of 7" and a filling bar are
 *    accurate, so show them large, with a percentage.
 *  - A single profile (student) has total = 1 and done = 0 for the entire run.
 *    The old code rendered that faithfully: the text read "Scoring 0 of 1
 *    profile" and the bar sat at 0% width for forty seconds. Nothing moved, so
 *    there was no way to tell a working job from a hung one.
 *
 * For the single case we therefore show an indeterminate travelling bar and a
 * live elapsed clock. Neither invents a percentage we don't have, and both
 * change every second, which is the whole point.
 */
export function JobProgress({
  done,
  total,
  coldStart,
  etaSeconds,
  unit = "candidate",
  label,
}: {
  done: number;
  total: number;
  coldStart?: boolean;
  etaSeconds?: number;
  unit?: string;
  /** Heading shown while there is nothing countable yet. Defaults to the unit. */
  label?: string;
}) {
  const elapsed = useElapsedSeconds();

  // Only a multi-item job has progress worth counting. One item is either not
  // started or finished, and a bar with two states is not a progress bar.
  const countable = total > 1;
  const pct = countable ? Math.min((done / total) * 100, 100) : 0;
  const eta = etaSeconds && etaSeconds > 0 ? formatEta(etaSeconds) : null;

  return (
    <div className="w-full max-w-md space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
          {countable ? `Scoring ${unit}s` : label ?? `Scoring ${unit}`}
        </p>
        <p className="tnum shrink-0 text-sm font-semibold text-foreground">
          {countable ? `${done} of ${total}` : formatClock(elapsed)}
        </p>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border"
        role="progressbar"
        aria-valuenow={countable ? done : undefined}
        aria-valuemin={0}
        aria-valuemax={countable ? total : undefined}
        aria-label={countable ? "Candidates scored" : "Scoring in progress"}
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

      {/* One line of context, always present so the block never changes height. */}
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
            ? `${Math.round(pct)}% complete${eta ? ` · about ${eta} left` : ""} · ${formatClock(
                elapsed,
              )} elapsed`
            : "This usually takes under a minute. You can leave this tab open."}
        </p>
      )}
    </div>
  );
}

/** Seconds since the component mounted, which is when the job was submitted. */
function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return "under a minute";
  const mins = Math.round(seconds / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}
