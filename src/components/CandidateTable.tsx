"use client";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { fmtUsd, toScore } from "@/lib/format";

type SortKey = "candidate" | "score" | "cost";

function topFactor(r: PredictionResult, positive: boolean) {
  const fs = (r.top_factors ?? []).filter((f) => (positive ? f.contribution >= 0 : f.contribution < 0));
  return (positive ? fs[0] : fs[fs.length - 1])?.label ?? "—";
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
    <th className={cn("px-3 py-2 text-left font-medium", className)}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggle(k)}>
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
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <Th k="candidate" label="Candidate" />
              <Th k="score" label="Score" />
              <th className="px-3 py-2 text-left font-medium">Baseline</th>
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
                  <td className="tnum px-3 py-2">{err ? "—" : toScore(r.prediction)}</td>
                  <td className="tnum px-3 py-2 text-muted-foreground">
                    {err ? "—" : toScore(r.baseline)}
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
