import type { PredictionResult } from "@/types";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten batch results to a CSV string for download. */
export function resultsToCsv(rows: PredictionResult[]): string {
  const header = [
    "candidate",
    "score",
    "baseline",
    "top_positive",
    "top_negative",
    "cost_usd",
    "tokens",
    "status",
  ];
  const lines = rows.map((r) => {
    const factors = r.top_factors ?? [];
    const pos = factors.find((f) => f.contribution >= 0)?.label ?? "";
    const neg = [...factors].reverse().find((f) => f.contribution < 0)?.label ?? "";
    return [
      r.candidate ?? r.candidate_name ?? "",
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
