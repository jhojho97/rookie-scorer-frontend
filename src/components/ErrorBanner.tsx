"use client";
import { AlertTriangle, Clock } from "lucide-react";
import { ApiError } from "@/services/api";

/** Friendly inline error, with a special cold-start hint for 504/timeouts. */
export function ErrorBanner({ error }: { error: unknown }) {
  const isCold = error instanceof ApiError && (error.coldStart || error.status === 504);
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
      {isCold ? (
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
      )}
      <div>
        {isCold ? (
          <p>
            The backend didn&apos;t respond in time — it may be waking from sleep (first
            request can take ~1 minute), or scoring is taking longer than usual.
            It&apos;s likely warm now, so please try again.
          </p>
        ) : (
          <p>{msg}</p>
        )}
      </div>
    </div>
  );
}
