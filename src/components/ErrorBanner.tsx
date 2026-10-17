"use client";
import { AlertTriangle, Clock } from "lucide-react";
import { ApiError } from "@/services/api";

/**
 * The browser's own wording when a request never reached a server (Chrome and
 * Edge, Firefox, Safari). Callers often re-wrap errors as plain Error(message),
 * so this matches the text rather than the TypeError class.
 */
const NETWORK_FAILURE = /failed to fetch|networkerror|load failed|network request failed/i;

export const NETWORK_MESSAGE =
  "Couldn't reach the scoring service. Check your internet connection, then try again.";

/** Friendly inline error, with a special cold-start hint for 504/timeouts. */
export function ErrorBanner({ error }: { error: unknown }) {
  const isCold = error instanceof ApiError && (error.coldStart || error.status === 504);
  const raw = error instanceof Error ? error.message : "Something went wrong.";
  const msg = NETWORK_FAILURE.test(raw) ? NETWORK_MESSAGE : raw;
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
