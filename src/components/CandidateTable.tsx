"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Search } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { toScore } from "@/lib/format";
import { paperGroups, rankScored, rankValue, splitResults, type FlaggedResult } from "@/lib/results";
import { DEFAULT_TARGET, forTarget, type TargetKey } from "@/lib/targets";

type SortKey = "candidate" | "score";
type Sort = { key: SortKey; dir: 1 | -1 };

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
 *
 * Candidates scored without a job-market paper get their own ranked table:
 * their scores come from two of the three models and sit on a different scale
 * (see paperGroups in lib/results.ts), so they are never ranked against
 * candidates who had a paper.
 */
export function CandidateTable({
  results,
  onSelect,
  target = DEFAULT_TARGET,
}: {
  results: PredictionResult[];
  onSelect: (r: PredictionResult) => void;
  /** The research-productivity level to rank and describe candidates at. */
  target?: TargetKey;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "score", dir: -1 });

  // Each candidate as seen at the chosen target. Rank, sort and the factor
  // columns all follow it; the Not scored section does not depend on it.
  const viewed = useMemo(() => results.map((r) => forTarget(r, target) ?? r), [results, target]);
  const { scored, flagged } = useMemo(() => splitResults(viewed), [viewed]);
  const { withPaper, cvOnly } = useMemo(() => paperGroups(scored), [scored]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  // Headings only when both groups are present; a batch of one kind reads as
  // a single table, as before.
  const split = withPaper.length > 0 && cvOnly.length > 0;

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

          {withPaper.length > 0 && (
            <RankedGroup
              id="with-paper"
              title={split ? "Scored with a job-market paper" : undefined}
              group={withPaper}
              query={query}
              sort={sort}
              toggle={toggle}
              onSelect={onSelect}
            />
          )}

          {cvOnly.length > 0 && (
            <RankedGroup
              id="cv-only"
              title="Scored on the CV only"
              description={
                "No readable job-market paper was provided, so these scores come from the CV alone. " +
                "They are ranked only against each other: a CV-only score is not comparable with one that used a paper."
              }
              group={cvOnly}
              query={query}
              sort={sort}
              toggle={toggle}
              onSelect={onSelect}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * One ranked table: candidates of a single paper group, numbered among
 * themselves. The rank comes from the whole group, not the rendered rows, so
 * searching or re-sorting never renumbers anyone.
 */
function RankedGroup({
  id,
  title,
  description,
  group,
  query,
  sort,
  toggle,
  onSelect,
}: {
  id: string;
  title?: string;
  description?: string;
  group: PredictionResult[];
  query: string;
  sort: Sort;
  toggle: (key: SortKey) => void;
  onSelect: (r: PredictionResult) => void;
}) {
  const rankOf = useMemo(() => rankScored(group), [group]);

  const rows = useMemo(() => {
    const name = (r: PredictionResult) => (r.candidate ?? r.candidate_name ?? "").toLowerCase();
    const filtered = group.filter((r) => name(r).includes(query.toLowerCase()));
    return filtered.sort((a, b) => {
      if (sort.key === "candidate") return name(a).localeCompare(name(b)) * sort.dir;
      return (rankValue(a) - rankValue(b)) * sort.dir;
    });
  }, [group, query, sort]);

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
    <section aria-labelledby={title ? `${id}-title` : undefined} className="space-y-2">
      {title && (
        <div className="pt-2">
          <h3 id={`${id}-title`} className="text-sm font-medium">
            {title}
            <span className="ml-2 font-normal text-muted-foreground">
              · {group.length} candidate{group.length === 1 ? "" : "s"}
            </span>
          </h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}

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
                  <span className="tnum shrink-0 text-xs text-muted-foreground">#{rankOf.get(r)}</span>
                  <span className="truncate font-medium">{candidateName(r)}</span>
                </span>
                <span className="tnum text-lg font-semibold">
                  {typeof r.prediction === "number" ? toScore(r.prediction) : "—"}
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
                  <span className="truncate">{candidateName(r)}</span>
                </td>
                <td className="tnum px-3 py-2 font-medium">
                  {typeof r.prediction === "number" ? toScore(r.prediction) : "—"}
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
    </section>
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
          · left out of the ranking and the export
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
