"use client";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { fmtPercentile, fmtUsd, toScore } from "@/lib/format";

type SortKey = "candidate" | "score" | "cost";

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

/** Sortable, searchable results table for the HR workflow. Row click → report. */
export function CandidateTable({
  results,
  onSelect,
}: {
  results: PredictionResult[];
  onSelect: (r: PredictionResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "score", dir: -1 });

  const rows = useMemo(() => {
    const name = (r: PredictionResult) => (r.candidate ?? r.candidate_name ?? "").toLowerCase();
    const filtered = results.filter((r) => name(r).includes(query.toLowerCase()));
    return filtered.sort((a, b) => {
      if (sort.key === "candidate") return name(a).localeCompare(name(b)) * sort.dir;
      const num = (r: PredictionResult) =>
        sort.key === "score" ? (r.prediction ?? -1) : (r.cost?.usd ?? 0);
      return (num(a) - num(b)) * sort.dir;
    });
  }, [results, query, sort]);

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
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search candidates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {/* Mobile: the 7-column table is unusable below ~720px, so present each
          candidate as a card instead of forcing a horizontal scroll. */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r, i) => {
          const err = r.status === "error";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={err}
                onClick={() => !err && onSelect(r)}
                className={cn(
                  "w-full rounded-lg border border-border p-3 text-left",
                  err ? "opacity-60" : "hover:bg-muted/40",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">
                    {r.candidate ?? r.candidate_name ?? "—"}
                  </span>
                  <span className="tnum text-lg font-semibold">
                    {err
                      ? "—"
                      : typeof r.percentile === "number"
                        ? fmtPercentile(r.percentile)
                        : toScore(r.prediction)}
                  </span>
                </div>
                {err ? (
                  <Badge tone="negative" className="mt-2">
                    error
                  </Badge>
                ) : (
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Raw score</dt>
                      <dd className="tnum">{toScore(r.prediction)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Top +</dt>
                      <dd className="truncate text-positive">{topFactor(r, true)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Top −</dt>
                      <dd className="truncate text-negative">{topFactor(r, false)}</dd>
                    </div>
                  </dl>
                )}
              </button>
            </li>
          );
        })}
        {!rows.length && (
          <li className="rounded-lg border border-border px-3 py-8 text-center text-sm text-muted-foreground">
            No candidates match your search.
          </li>
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <Th k="candidate" label="Candidate" />
              {/* Sorting still keys off the raw prediction; percentile is a
                  monotonic transform of it, so the order is identical. */}
              <Th k="score" label="Percentile" />
              <th className="px-3 py-2 text-left font-medium">Raw score</th>
              <th className="px-3 py-2 text-left font-medium">Top +</th>
              <th className="px-3 py-2 text-left font-medium">Top −</th>
              <Th k="cost" label="Cost" />
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => {
              const err = r.status === "error";
              return (
                <tr
                  key={i}
                  onClick={() => !err && onSelect(r)}
                  className={cn(
                    "transition-colors",
                    err ? "opacity-60" : "cursor-pointer hover:bg-muted/40",
                  )}
                >
                  <td className="px-3 py-2 font-medium">{r.candidate ?? r.candidate_name ?? "—"}</td>
                  <td className="tnum px-3 py-2 font-medium">
                    {err ? "—" : typeof r.percentile === "number" ? fmtPercentile(r.percentile) : "—"}
                  </td>
                  <td className="tnum px-3 py-2 text-muted-foreground">
                    {err ? "—" : toScore(r.prediction)}
                  </td>
                  <td className="px-3 py-2 text-positive">{err ? "—" : topFactor(r, true)}</td>
                  <td className="px-3 py-2 text-negative">{err ? "—" : topFactor(r, false)}</td>
                  <td className="tnum px-3 py-2">{fmtUsd(r.cost?.usd ?? 0)}</td>
                  <td className="px-3 py-2">
                    {err ? <Badge tone="negative">error</Badge> : <Badge tone="positive">done</Badge>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No candidates match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
