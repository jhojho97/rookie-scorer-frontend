"use client";
import { useState } from "react";
import { Download, Play, RotateCcw, X } from "lucide-react";
import type { PredictionResult, CandidateInput } from "@/types";
import { publicEnv } from "@/lib/env";
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

  const maxBatch = publicEnv.maxBatch;
  const validCount = rows.filter((r) => r.cv).length;
  const results = job.data?.results ?? [];

  // Simple state machine: after submitting we only surface a single "Running"
  // state until the results (or an error) are ready — no intermediate statuses.
  const failed = submit.isError || job.isError || job.data?.status === "error";
  const succeeded = job.data?.status === "done";
  const waitingFirstPoll = submit.isSuccess && !job.data && !job.isError;
  const running = !failed && !succeeded && (submit.isPending || waitingFirstPoll || job.data?.status === "running");
  const finished = succeeded || failed;

  function onSubmit() {
    const usable = rows.filter((r) => r.cv);
    if (!usable.length || usable.length > maxBatch) return;
    submit.mutate(usable);
  }

  function onReset() {
    reset();
    setRows([emptyRow(), emptyRow()]);
    setSelected(null);
  }

  const errorMsg =
    (submit.error as Error | undefined)?.message ||
    (job.error as Error | undefined)?.message ||
    job.data?.reason ||
    "Batch scoring failed.";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Candidate batch scoring</h1>
          <p className="text-sm text-muted-foreground">
            Add candidates (CV required, JMP optional) — up to {maxBatch} per batch — then run and rank.
          </p>
        </div>
        {finished && (
          <div className="flex gap-2">
            {succeeded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv("candidate_scores.csv", resultsToCsv(results))}
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            )}
            <Button variant="subtle" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4" /> New batch
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-3">
          {!running && !finished && (
            <Card>
              <CardHeader>
                <CardTitle>Candidates ({validCount} ready)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CandidateRows rows={rows} setRows={setRows} max={maxBatch} />
                <Button onClick={onSubmit} disabled={!validCount}>
                  <Play className="h-4 w-4" />
                  Score {validCount} candidate{validCount === 1 ? "" : "s"}
                </Button>
              </CardContent>
            </Card>
          )}

          {running && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <Spinner className="h-6 w-6 text-accent" />
                <p className="text-sm font-medium">Running…</p>
                <p className="text-xs text-muted-foreground">
                  Scoring {validCount} candidate{validCount === 1 ? "" : "s"} on the server. A large
                  batch can take several minutes — you can leave this tab open.
                </p>
              </CardContent>
            </Card>
          )}

          {succeeded && (
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

          {failed && !succeeded && (
            <Card>
              <CardContent className="p-5">
                <ErrorBanner error={new Error(errorMsg)} />
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
