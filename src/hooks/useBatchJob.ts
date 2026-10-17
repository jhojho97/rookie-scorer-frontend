"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, batchPredict, batchPredictZip, pollJob } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "./useUsage";
import { saveBatch } from "@/lib/history";
import type { CandidateInput, JobStatusResponse } from "@/types";

/** Either explicit candidate rows or a zip of candidate folders. */
export type BatchInput = { kind: "rows"; rows: CandidateInput[] } | { kind: "zip"; archive: File };

/** Past this with no first result, we're almost certainly waking the instance. */
const COLD_START_HINT_MS = 20_000;

/** Shown when the server no longer knows the job, e.g. after it restarted. */
export const JOB_LOST_MESSAGE =
  "The scoring service lost track of this run, most likely because it restarted. Please score again.";

const isJobGone = (e: unknown) => e instanceof ApiError && e.status === 404;
/** The server answered and refused (job gone, session expired): polling again
 *  will not help. Network failures and 5xx (e.g. the server waking) are retried. */
const isFatalPollError = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500;

/**
 * Batch workflow: submit -> get job_id -> poll /jobs until done.
 *
 * The backend reports `progress` ("3/7") and publishes results as each
 * candidate lands, so this exposes both: a two-minute wait behind a bare
 * spinner is the worst version of this screen.
 */
export function useBatchJob() {
  const { getIdToken } = useAuth();
  const { add, refreshServer } = useUsage();
  const [jobId, setJobId] = useState<string | null>(null);
  const [expected, setExpected] = useState(0);
  const startedAt = useRef<number>(0);
  const recorded = useRef(false);

  const submit = useMutation<string, Error, BatchInput>({
    mutationFn: async (input) => {
      const token = await getIdToken();
      if (input.kind === "zip") {
        setExpected(0); // folder count is unknown until the server unpacks it
        const { job_id } = await batchPredictZip(token, input.archive);
        return job_id;
      }
      setExpected(input.rows.length);
      const { job_id } = await batchPredict(token, input.rows);
      return job_id;
    },
    onSuccess: (id) => {
      recorded.current = false;
      startedAt.current = Date.now();
      setJobId(id);
    },
  });

  const job = useQuery<JobStatusResponse>({
    queryKey: ["job", jobId],
    enabled: !!jobId,
    queryFn: async () => pollJob(await getIdToken(), jobId!),
    // Keep polling until the job reports a final status. Keying this on
    // data alone stopped polling for good if the FIRST poll failed (no data
    // yet), which left the progress bar running forever.
    refetchInterval: (q) => {
      if (isFatalPollError(q.state.error)) return false;
      const status = q.state.data?.status;
      return status && status !== "running" ? false : 3000;
    },
    retry: (count, e) => !isFatalPollError(e) && count < 3,
  });

  const jobLost = isJobGone(job.error);
  // A poll error that ends the run, with a message fit to show as-is.
  const pollError: Error | null = jobLost
    ? new Error(JOB_LOST_MESSAGE)
    : isFatalPollError(job.error)
      ? (job.error as Error)
      : null;
  // TanStack Query pauses requests while the browser is offline and resumes
  // them on reconnect. Without saying so, a paused scoring looks like a hung one.
  const offline = submit.isPaused || job.fetchStatus === "paused";

  useEffect(() => {
    if (job.data && job.data.status !== "running" && !recorded.current) {
      recorded.current = true;
      const results = job.data.results ?? [];
      const tokens = results.reduce((a, r) => a + (r.cost?.total_tokens ?? 0), 0);
      add({ usd: job.data.cost_usd ?? 0, tokens, kind: "batch" });
      refreshServer();
      if (results.length) saveBatch(results, job.data.cost_usd ?? 0);
    }
  }, [job.data, add, refreshServer]);

  // "3/7" -> { done: 3, total: 7 }. Falls back to the submitted count so the
  // bar is meaningful before the first poll returns.
  const progress = useMemo(() => {
    const raw = job.data?.progress ?? "";
    const [d, t] = raw.split("/");
    const done = Number(d);
    const total = Number(t);
    return {
      done: Number.isFinite(done) ? done : 0,
      total: Number.isFinite(total) && total > 0 ? total : expected,
    };
  }, [job.data?.progress, expected]);

  const running =
    submit.isPending || (!!jobId && !pollError && (!job.data || job.data.status === "running"));

  const elapsedMs = startedAt.current ? Date.now() - startedAt.current : 0;
  // Only claim a cold start while genuinely nothing has come back yet.
  const coldStart = running && progress.done === 0 && elapsedMs > COLD_START_HINT_MS;

  const reset = () => {
    setJobId(null);
    setExpected(0);
    startedAt.current = 0;
    submit.reset();
  };

  return { submit, job, jobId, reset, progress, running, coldStart, offline, pollError };
}
