import type { PredictionResult } from "@/types";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten batch results to a CSV string for download. */
export function resultsToCsv(rows: PredictionResult[]): string {
  const header = [
    "rank",
    "candidate",
    "score",
    "model_output",
    "baseline",
    "top_positive",
    "top_negative",
    "cost_usd",
    "tokens",
    "status",
    // Without this, a row scored from an unreadable CV is indistinguishable
    // from a genuinely low-ranking one once the data leaves the app.
    "cv_readable",
  ];
  // Rank within the batch, best first, so the export matches the table.
  const ranked = rows
    .filter((r) => r.status !== "error" && typeof r.prediction === "number")
    .sort((a, b) => b.prediction - a.prediction);
  const rankOf = new Map<PredictionResult, number>();
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    rankOf.set(r, prev && prev.prediction === r.prediction ? rankOf.get(prev)! : i + 1);
  });

  const lines = rows.map((r) => {
    // Factors are sorted by |contribution| descending, so the FIRST match in
    // each direction is the strongest. Reversing to find the negative returned
    // the weakest detractor instead — the same bug the results table had.
    const factors = r.top_factors ?? [];
    const pos = factors.find((f) => f.contribution >= 0)?.label ?? "";
    const neg = factors.find((f) => f.contribution < 0)?.label ?? "";
    return [
      rankOf.get(r) ?? "",
      r.candidate ?? r.candidate_name ?? "",
      r.status === "error" || typeof r.percentile !== "number"
        ? ""
        : String(Math.round(r.percentile)),
      r.status === "error" ? "" : r.prediction?.toFixed(4),
      r.baseline?.toFixed(4) ?? "",
      pos,
      neg,
      r.cost?.usd?.toFixed(6) ?? "",
      r.cost?.total_tokens ?? "",
      r.status === "error" ? `error: ${r.reason ?? ""}` : "ok",
      r.extraction_ok === false ? "no" : "yes",
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
