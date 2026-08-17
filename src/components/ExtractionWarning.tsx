"use client";
import { AlertTriangle } from "lucide-react";
import type { PredictionResult } from "@/types";

/**
 * Shown when the CV could not be read.
 *
 * The backend still returns a score in this case, because an empty extraction
 * is a *valid* feature row — every value at its default. The model scores it,
 * SHAP produces contributors, and the report renders exactly like a real one.
 * Nothing about the output reveals that it was computed from no information.
 * That is precisely why it has to be said out loud, above the number.
 */
export function ExtractionWarning({ result }: { result: PredictionResult }) {
  if (result.extraction_ok !== false) return null;
  const problems = result.extraction_problems ?? [];

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-negative/40 bg-negative/10 p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-negative" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-negative">
          This score is not reliable — the CV could not be read.
        </p>
        <p className="text-xs leading-snug text-negative/90">
          Scoring ran on empty CV data, so the ranking and the factors below are meaningless.
          Re-upload the CV, or try a text-based PDF if this one is a scan.
        </p>
        {problems.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-negative/80">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
