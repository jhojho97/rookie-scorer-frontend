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
          <p>Backend is starting. This can take around one minute — please try again.</p>
        ) : (
          <p>{msg}</p>
        )}
      </div>
    </div>
  );
}
