import type { PredictionResult } from "@/types";
import { rankScored, splitResults } from "@/lib/results";
import { availableTargets, forTarget, targetInfo, type TargetKey } from "@/lib/targets";

/**
 * The recruiter's export: an Excel workbook with one tab per target, each
 * ranked for that target.
 *
 * A workbook rather than a CSV because a CSV cannot hold more than one sheet.
 * Every tab has the same five recruiter-facing columns. Only scored candidates
 * appear; failed scorings and unreadable CVs are listed separately in the app,
 * so a number that does not describe the candidate never leaves it.
 */
const HEADER = ["rank", "candidate", "score", "top_positive", "top_negative"];

/** One tab's rows for one target, best first. Exported for tests. */
export function rowsForTarget(results: PredictionResult[], target: TargetKey): (string | number)[][] {
  const viewed = results.map((r) => forTarget(r, target) ?? r);
  const { scored } = splitResults(viewed);
  const rankOf = rankScored(scored);
  return [...scored]
    .sort((a, b) => rankOf.get(a)! - rankOf.get(b)!)
    .map((r) => {
      // Factors are sorted by |contribution| descending, so the first match in
      // each direction is the strongest.
      const factors = r.top_factors ?? [];
      return [
        rankOf.get(r) ?? "",
        r.candidate ?? r.candidate_name ?? "",
        typeof r.prediction === "number" ? Math.round(r.prediction * 100) : "",
        factors.find((f) => f.contribution >= 0)?.label ?? "",
        factors.find((f) => f.contribution < 0)?.label ?? "",
      ];
    });
}

export async function downloadWorkbook(results: PredictionResult[], fileName: string) {
  // Loaded on click so the Excel writer stays out of the page bundle.
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const bold = { fontWeight: "bold" as const };
  const sheets = availableTargets(results).map((t) => ({
    sheet: targetInfo(t).short, // "Top 5%", "Top 10%", ...
    stickyRowsCount: 1,
    columns: [{ width: 7 }, { width: 32 }, { width: 8 }, { width: 36 }, { width: 36 }],
    data: [
      HEADER.map((h) => ({ value: h, ...bold })),
      ...rowsForTarget(results, t).map((row) =>
        row.map((v) => (typeof v === "number" ? { value: v, type: Number } : { value: v })),
      ),
    ],
  }));
  const blob = await writeXlsxFile(sheets).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
