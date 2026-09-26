"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Search } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { fmtScore } from "@/lib/format";
import { rankScored, rankValue, splitResults, type FlaggedResult } from "@/lib/results";

type SortKey = "candidate" | "score";

/**
 * The strongest factor in one direction.
 *
 * `top_factors` arrives sorted by |contribution| DESCENDING, so the first match
 * after filtering is the biggest one either way. (This previously took the LAST
 * negative, which is the *weakest* detractor — the column claimed to show a
 * candidate's biggest problem and showed their smallest.)
 */
function topFactor(r: PredictionResult, positive: boolean) {
  const fs = (r.top_factors ?? []).filter((f) => (positive ? f.contribution >= 0 : f.contribution < 0));
  return fs[0]?.label ?? "—";
}

const candidateName = (r: PredictionResult) => r.candidate ?? r.candidate_name ?? "—";

/**
 * Results table for the HR workflow. Row click → full report.
 *
 * Shows rank within the batch, who, the score, and what stands out either way.
 * The model's raw output, per-candidate API cost and a status column were all
 * removed — the raw value is uncalibrated and reads as a competing mark out of
 * 100, and the other two are operational detail with no bearing on comparing
 * candidates.
 *
 * Only candidates with a usable score are ranked. A failed scoring, or a CV
 * that could not be read, is listed in its own "Not scored" section instead
 * (see lib/results.ts for why an unreadable CV's number cannot be ranked).
 */
export function CandidateTable({
  results,
  onSelect,
}: {
  results: PredictionResult[];
  onSelect: (r: PredictionResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "score", dir: -1 });

  const { scored, flagged } = useMemo(() => splitResults(results), [results]);

  /**
   * Position within THIS batch, best first, among scored candidates only.
   *
   * Derived from the full scored set, not the rendered rows: searching or
   * re-sorting the table must not renumber people.
   */
  const rankOf = useMemo(() => rankScored(scored), [scored]);

  const rows = useMemo(() => {
    const name = (r: PredictionResult) => (r.candidate ?? r.candidate_name ?? "").toLowerCase();
    const filtered = scored.filter((r) => name(r).includes(query.toLowerCase()));
    return filtered.sort((a, b) => {
      if (sort.key === "candidate") return name(a).localeCompare(name(b)) * sort.dir;
      return (rankValue(a) - rankValue(b)) * sort.dir;
    });
  }, [scored, query, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  const Th = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th
      className={cn("px-3 py-2 text-left font-medium", className)}
      aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
    >
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => toggle(k)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sort.key === k ? "opacity-100" : "opacity-30")} />
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      {flagged.length > 0 && <NotScored flagged={flagged} />}

      {scored.length === 0 ? (
        <p className="rounded-lg border border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No candidate in this batch could be scored.
        </p>
      ) : (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search candidates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Mobile: the table still doesn't fit below ~560px, so present each
              candidate as a card instead of forcing a horizontal scroll. */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="w-full rounded-lg border border-border p-3 text-left hover:bg-muted/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="tnum shrink-0 text-xs text-muted-foreground">
                        #{rankOf.get(r)}
                      </span>
                      <span className="truncate font-medium">{candidateName(r)}</span>
                      <NoJmp r={r} />
                    </span>
                    <span className="tnum text-lg font-semibold">
                      {typeof r.percentile === "number" ? fmtScore(r.percentile) : "—"}
                    </span>
                  </div>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Outstanding</dt>
                      <dd className="truncate text-positive">{topFactor(r, true)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Lagging</dt>
                      <dd className="truncate text-negative">{topFactor(r, false)}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
            {!rows.length && (
              <li className="rounded-lg border border-border px-3 py-8 text-center text-sm text-muted-foreground">
                No candidates match your search.
              </li>
            )}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <Th k="candidate" label="Candidate" />
                  {/* Sorts by the score itself, the same value the rank uses. */}
                  <Th k="score" label="Score" />
                  <th className="px-3 py-2 text-left font-medium">Outstanding areas</th>
                  <th className="px-3 py-2 text-left font-medium">Lagging areas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => onSelect(r)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="tnum px-3 py-2 text-muted-foreground">{rankOf.get(r)}</td>
                    <td className="px-3 py-2 font-medium">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{candidateName(r)}</span>
                        <NoJmp r={r} />
                      </span>
                    </td>
                    <td className="tnum px-3 py-2 font-medium">
                      {typeof r.percentile === "number" ? fmtScore(r.percentile) : "—"}
                    </td>
                    <td className="px-3 py-2 text-positive">{topFactor(r, true)}</td>
                    <td className="px-3 py-2 text-negative">{topFactor(r, false)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No candidates match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Marks a candidate scored without a job-market paper. They are ranked with
 * everyone else -- their score is against the same reference candidates,
 * scored the same way -- but the reader should know it rests on the CV alone.
 */
function NoJmp({ r }: { r: PredictionResult }) {
  if (r.paper_used !== false) return null;
  return (
    <span
      className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      title="No readable job-market paper was provided, so this score is based on the CV alone."
    >
      No JMP
    </span>
  );
}

/**
 * Candidates left out of the ranking, each with what went wrong and what to do.
 * Shown ABOVE the table: a missing candidate is easy to overlook below it.
 */
function NotScored({ flagged }: { flagged: FlaggedResult[] }) {
  const n = flagged.length;
  return (
    <section
      aria-labelledby="not-scored-title"
      className="rounded-lg border border-warning/40 bg-warning/5 p-3"
    >
      <h3 id="not-scored-title" className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        {n} candidate{n === 1 ? "" : "s"} not scored
        <span className="font-normal text-muted-foreground">
          · left out of the ranking and the CSV
        </span>
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {flagged.map((f, i) => (
          <li key={i} className="grid gap-1 py-2 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:gap-4">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{candidateName(f.result)}</span>
              <span className="text-xs text-muted-foreground">
                {f.kind === "unreadable" ? "CV could not be read" : "Scoring failed"}
              </span>
            </span>
            <span className="text-sm">
              <span className="block text-muted-foreground">{f.reason}</span>
              <span className="block">{f.action}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
