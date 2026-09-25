import type { PredictionResult } from "@/types";
import { rankScored, splitResults } from "@/lib/results";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten batch results to a CSV string for download. */
export function resultsToCsv(rows: PredictionResult[]): string {
  // Recruiter-facing columns only. Model internals (raw output, baseline),
  // metering (cost, tokens) and pipeline state (status, CV readability) stay
  // in the app, where the report and the table already surface them.
  const header = ["rank", "candidate", "score", "top_positive", "top_negative"];
  // Only scored candidates, ranked exactly as the table ranks them. Failed
  // scorings and unreadable CVs are listed separately in the app, never here,
  // so a number that does not describe the candidate cannot leave the app.
  const { scored } = splitResults(rows);
  const rankOf = rankScored(scored);
  const ordered = [...scored].sort((a, b) => rankOf.get(a)! - rankOf.get(b)!);

  const lines = ordered.map((r) => {
    // Factors are sorted by |contribution| descending, so the FIRST match in
    // each direction is the strongest. Reversing to find the negative returned
    // the weakest detractor instead — the same bug the results table had.
    const factors = r.top_factors ?? [];
    const pos = factors.find((f) => f.contribution >= 0)?.label ?? "";
    const neg = factors.find((f) => f.contribution < 0)?.label ?? "";
    return [
      rankOf.get(r) ?? "",
      r.candidate ?? r.candidate_name ?? "",
      typeof r.percentile === "number" ? String(Math.round(r.percentile)) : "",
      pos,
      neg,
    ]
      .map(esc)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, blob);
}

export function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
