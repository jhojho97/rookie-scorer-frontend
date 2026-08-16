import type { PredictionResult } from "@/types";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten batch results to a CSV string for download. */
export function resultsToCsv(rows: PredictionResult[]): string {
  const header = [
    "candidate",
    "percentile",
    "raw_score",
    "baseline",
    "top_positive",
    "top_negative",
    "cost_usd",
    "tokens",
    "status",
  ];
  const lines = rows.map((r) => {
    // Factors are sorted by |contribution| descending, so the FIRST match in
    // each direction is the strongest. Reversing to find the negative returned
    // the weakest detractor instead — the same bug the results table had.
    const factors = r.top_factors ?? [];
    const pos = factors.find((f) => f.contribution >= 0)?.label ?? "";
    const neg = factors.find((f) => f.contribution < 0)?.label ?? "";
    return [
      r.candidate ?? r.candidate_name ?? "",
      r.status === "error" || typeof r.percentile !== "number" ? "" : r.percentile.toFixed(1),
      r.status === "error" ? "" : r.prediction?.toFixed(4),
      r.baseline?.toFixed(4) ?? "",
      pos,
      neg,
      r.cost?.usd?.toFixed(6) ?? "",
      r.cost?.total_tokens ?? "",
      r.status === "error" ? `error: ${r.reason ?? ""}` : "ok",
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
