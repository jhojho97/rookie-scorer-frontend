"use client";
import { useEffect, useState } from "react";
import { Download, Play, RotateCcw, Trash2, X } from "lucide-react";
import type { PredictionResult, CandidateInput } from "@/types";
import { publicEnv } from "@/lib/env";
import { useBatchJob } from "@/hooks/useBatchJob";
import { CandidateRows, emptyRow } from "@/components/hr/CandidateRows";
import { BulkUpload } from "@/components/hr/BulkUpload";
import { CandidateTable } from "@/components/CandidateTable";
import { JobProgress } from "@/components/JobProgress";
import { ReportCard } from "@/components/ReportCard";
import { UsageDashboard } from "@/components/UsageDashboard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadCsv, resultsToCsv } from "@/lib/csv";
import { fmtUsd } from "@/lib/format";
import { loadBatches, deleteBatch, RETENTION_DAYS, type BatchRecord } from "@/lib/history";

export default function HrDashboard() {
  const { submit, job, reset, progress, running, coldStart } = useBatchJob();
  const [rows, setRows] = useState<CandidateInput[]>([emptyRow(), emptyRow()]);
  const [archive, setArchive] = useState<File | null>(null);
  const [selected, setSelected] = useState<PredictionResult | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [history, setHistory] = useState<BatchRecord[]>([]);
  const [viewing, setViewing] = useState<BatchRecord | null>(null);

  useEffect(() => {
    const sync = () => setHistory(loadBatches());
    sync();
    window.addEventListener("batches-updated", sync);
    return () => window.removeEventListener("batches-updated", sync);
  }, []);

  const maxBatch = publicEnv.maxBatch;
  const stagedCount = rows.filter((r) => r.cv).length;
  const validCount = archive ? 0 : stagedCount;
  const canSubmit = Boolean(archive) || validCount > 0;

  const failed = submit.isError || job.isError || job.data?.status === "error";
  const succeeded = job.data?.status === "done";
  // Results stream in as each candidate finishes, so show them while running.
  const results = viewing ? viewing.results : (job.data?.results ?? []);
  const finished = succeeded || failed;

  function onSubmit() {
    setInputError(null);
    setViewing(null);
    if (archive) {
      submit.mutate({ kind: "zip", archive });
      return;
    }
    const usable = rows.filter((r) => r.cv);
    if (!usable.length || usable.length > maxBatch) return;
    submit.mutate({ kind: "rows", rows: usable });
  }

  function onReset() {
    reset();
    setRows([emptyRow(), emptyRow()]);
    setArchive(null);
    setSelected(null);
    setInputError(null);
    setViewing(null);
  }

  const errorMsg =
    (submit.error as Error | undefined)?.message ||
    (job.error as Error | undefined)?.message ||
    job.data?.reason ||
    "Batch scoring failed.";

  const showInputs = !running && !finished && !viewing;
  const costUsd = viewing ? viewing.costUsd : (job.data?.cost_usd ?? 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Candidate batch scoring</h1>
          <p className="text-sm text-muted-foreground">
            Drop a folder or zip, or add candidates by hand — up to {maxBatch} per batch.
          </p>
        </div>
        {(finished || viewing) && (
          <div className="flex gap-2">
            {results.length > 0 && (
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
          {showInputs && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Candidates {archive ? `(${archive.name})` : `(${validCount} ready)`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* BulkUpload reports the outcome of every drop through
                    onError (a message, or null to clear the previous one), so
                    these handlers must NOT clear it themselves -- doing so
                    batched away the message in the same render. */}
                <BulkUpload
                  existing={rows}
                  onCandidates={(c) => {
                    setArchive(null);
                    setRows(c);
                  }}
                  onArchive={setArchive}
                  onError={setInputError}
                />

                {/* Applies to every upload route on this card: bulk drop, zip and rows. */}
                <p className="text-xs leading-snug text-muted-foreground">
                  For each job-market paper, only the title, abstract and introduction are extracted
                  and used for scoring. Upload the full paper; the rest is ignored.
                </p>

                {inputError && <ErrorBanner error={new Error(inputError)} />}

                {archive ? (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate">
                        {archive.name} · {(archive.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setArchive(null)}>
                        Remove
                      </Button>
                    </div>
                    {/* A zip and loose rows are different endpoints and cannot be
                        scored in one job, so attaching a zip hides the rows. They
                        are NOT discarded -- but without this line the candidate
                        the user just staged simply vanishes from the screen. */}
                    {stagedCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {stagedCount} staged candidate{stagedCount === 1 ? " is" : "s are"} set
                        aside while this zip is attached — remove the zip to get{" "}
                        {stagedCount === 1 ? "them" : "them"} back.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Or edit rows directly
                    </div>
                    <CandidateRows
                      rows={rows}
                      setRows={setRows}
                      max={maxBatch}
                      onReject={setInputError}
                    />
                  </>
                )}

                <Button onClick={onSubmit} disabled={!canSubmit}>
                  <Play className="h-4 w-4" />
                  {archive
                    ? "Score archive"
                    : `Score ${validCount} candidate${validCount === 1 ? "" : "s"}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {running && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10">
                <JobProgress
                  done={progress.done}
                  total={progress.total}
                  coldStart={coldStart}
                />
              </CardContent>
            </Card>
          )}

          {/* Partial results appear while the rest are still scoring. */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewing ? "Saved batch" : running ? "Results so far" : "Results"} ·{" "}
                  {results.length} candidate{results.length === 1 ? "" : "s"} · {fmtUsd(costUsd)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CandidateTable results={results} onSelect={setSelected} />
              </CardContent>
            </Card>
          )}

          {failed && (
            <Card>
              <CardContent className="p-5">
                <ErrorBanner error={new Error(errorMsg)} />
              </CardContent>
            </Card>
          )}

          {history.length > 0 && showInputs && (
            <Card>
              <CardHeader>
                <CardTitle>Recent batches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {history.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <button
                      className="min-w-0 flex-1 text-left text-sm"
                      onClick={() => setViewing(b)}
                    >
                      <span className="font-medium">
                        {b.results.length} candidate{b.results.length === 1 ? "" : "s"}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(b.ts).toLocaleString()} · {fmtUsd(b.costUsd)}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete saved batch"
                      onClick={() => deleteBatch(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <p className="px-2 pt-1 text-[11px] text-muted-foreground">
                  Saved in this browser only — candidate data never leaves your machine, and
                  saved batches are deleted automatically after {RETENTION_DAYS} days.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <UsageDashboard compact />
        </div>
      </div>

      {/* Drill-in report overlay — same ReportCard as the student view, minus
          the "how to improve" guidance, which is for the candidate, not a
          recruiter deciding about them. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Candidate report"
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
            <ReportCard result={selected} variant="reviewer" />
          </div>
        </div>
      )}
    </div>
  );
}
