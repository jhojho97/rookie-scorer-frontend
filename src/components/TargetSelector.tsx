"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_TARGET, TARGETS, type TargetKey } from "@/lib/targets";

const STORE = "rookie-target";

/** The viewer's chosen target, remembered in this browser. */
export function useTargetChoice(): [TargetKey, (t: TargetKey) => void] {
  const [choice, setChoice] = useState<TargetKey>(DEFAULT_TARGET);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE) as TargetKey | null;
      if (saved && TARGETS.some((t) => t.key === saved)) setChoice(saved);
    } catch {
      /* storage blocked: stay on the default */
    }
  }, []);
  const set = (t: TargetKey) => {
    setChoice(t);
    try {
      localStorage.setItem(STORE, t);
    } catch {
      /* not remembered, still applied */
    }
  };
  return [choice, set];
}

/**
 * Choose which research-productivity level to view results at. Renders
 * nothing when only one target is available (a saved batch from before
 * per-target results), so there is nothing to explain.
 */
export function TargetSelector({
  value,
  onChange,
  available,
  className,
}: {
  value: TargetKey;
  onChange: (t: TargetKey) => void;
  available: TargetKey[];
  className?: string;
}) {
  if (available.length < 2) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span id="target-label" className="text-xs font-medium text-muted-foreground">
        View results for
      </span>
      <div role="group" aria-labelledby="target-label" className="inline-flex rounded-lg border border-border p-0.5">
        {TARGETS.filter((t) => available.includes(t.key)).map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={value === t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === t.key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.short}
          </button>
        ))}
      </div>
    </div>
  );
}
