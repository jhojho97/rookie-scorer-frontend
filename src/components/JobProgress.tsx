"use client";
import { useEffect, useState } from "react";
import { Loader2, Moon } from "lucide-react";

/** Extra time the free-tier backend takes to wake from sleep, measured ~50s. */
const COLD_START_SECONDS = 50;

/**
 * Estimated percentage for a single scoring, from elapsed time.
 *
 * One profile has nothing countable (it is not started or finished), so the
 * percentage is paced against how long a scoring usually takes: linear to 90%
 * at the expected time, then easing toward 95% so a slow run keeps moving
 * without ever claiming to be done. The report replaces the bar the moment
 * scoring actually finishes.
 */
function estimatedPct(elapsed: number, expected: number) {
  if (elapsed <= expected) return (90 * elapsed) / expected;
  return 90 + 5 * (1 - Math.exp(-(elapsed - expected) / expected));
}

/**
 * Progress for a running scoring job, always as a percentage.
 *
 * A batch (HR) has countable progress: done / total. A single profile
 * (student) has total = 1 and done = 0 for its whole duration, so its
 * percentage is an estimate paced on typical scoring time (`expectedSeconds`).
 * The old code drew "Scoring 0 of 1 profile" above a bar stuck at 0% for forty
 * seconds, which is indistinguishable from a hung job.
 */
export function JobProgress({
  done,
  total,
  coldStart,
  unit = "candidate",
  label,
  expectedSeconds = 60,
}: {
  done: number;
  total: number;
  coldStart?: boolean;
  unit?: string;
  /** Heading shown for a single item. Defaults to the unit. */
  label?: string;
  /** Typical duration of one scoring, which paces a single item's percentage. */
  expectedSeconds?: number;
}) {
  const countable = total > 1;

  // Time since this progress view appeared, for the single-item estimate.
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (countable) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [countable]);

  const expected = expectedSeconds + (coldStart ? COLD_START_SECONDS : 0);
  const pct = countable
    ? Math.min((done / total) * 100, 100)
    : estimatedPct((now - start) / 1000, expected);

  return (
    <div className="w-full max-w-md space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
          {countable ? `Scoring ${unit}s` : label ?? `Scoring ${unit}`}
        </p>
        <p className="tnum shrink-0 text-base font-semibold text-foreground">{Math.floor(pct)}%</p>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border"
        role="progressbar"
        aria-valuenow={Math.floor(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Scoring progress"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-linear"
          style={{ width: `${pct}%` }}
        />
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
