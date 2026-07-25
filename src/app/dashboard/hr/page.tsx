"use client";
import { useMemo, useState } from "react";
import { Download, Play, RotateCcw, X } from "lucide-react";
import type { PredictionResult, CandidateInput } from "@/types";
import { useBatchJob } from "@/hooks/useBatchJob";
import { CandidateRows, emptyRow } from "@/components/hr/CandidateRows";
import { CandidateTable } from "@/components/CandidateTable";
import { ReportCard } from "@/components/ReportCard";
import { UsageDashboard } from "@/components/UsageDashboard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { downloadCsv, resultsToCsv } from "@/lib/csv";
import { fmtUsd } from "@/lib/format";

export default function HrDashboard() {
  const { submit, job, reset } = useBatchJob();
  const [rows, setRows] = useState<CandidateInput[]>([emptyRow(), emptyRow()]);
  const [selected, setSelected] = useState<PredictionResult | null>(null);

  const validCount = rows.filter((r) => r.cv).length;
  const running = job.data?.status === "running" || submit.isPending;
  const done = job.data?.status === "done" || job.data?.status === "error";
  const results = job.data?.results ?? [];

  const [pctDone, total] = useMemo(() => {
    const [d, t] = (job.data?.progress ?? "0/0").split("/").map(Number);
    return [t ? (d / t) * 100 : 0, t];
  }, [job.data?.progress]);

  function onSubmit() {
    const usable = rows.filter((r) => r.cv);
    if (!usable.length) return;
    submit.mutate(usable);
  }

  function onReset() {
    reset();
    setRows([emptyRow(), emptyRow()]);
    setSelected(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Candidate batch scoring</h1>
          <p className="text-sm text-muted-foreground">
            Add candidates (CV required, JMP optional), then run the batch and rank the results.
          </p>
        </div>
        {done && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv("candidate_scores.csv", resultsToCsv(results))}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="subtle" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4" /> New batch
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-3">
          {!done && (
            <Card>
              <CardHeader>
                <CardTitle>Candidates ({validCount} ready)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CandidateRows rows={rows} setRows={setRows} disabled={running} />
                <div className="flex items-center gap-3">
                  <Button onClick={onSubmit} disabled={!validCount || running}>
                    {running ? <Spinner /> : <Play className="h-4 w-4" />}
                    {running ? "Scoring…" : `Score ${validCount} candidate${validCount === 1 ? "" : "s"}`}
                  </Button>
                  {running && total > 0 && (
                    <span className="text-sm text-muted-foreground">{job.data?.progress} done</span>
                  )}
                </div>

                {running && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(pctDone, 4)}%` }}
                    />
                  </div>
                )}
                {submit.isError && <ErrorBanner error={submit.error} />}
                {job.isError && <ErrorBanner error={job.error} />}
              </CardContent>
            </Card>
          )}

          {done && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Results · {results.length} candidates · batch cost {fmtUsd(job.data?.cost_usd ?? 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CandidateTable results={results} onSelect={setSelected} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <UsageDashboard compact />
        </div>
      </div>

      {/* Drill-in report overlay — same ReportCard as the student view. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="my-8 w-full max-w-4xl rounded-xl border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close report">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ReportCard result={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
