"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { batchPredict, batchPredictZip, pollJob } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "./useUsage";
import { saveBatch } from "@/lib/history";
import type { CandidateInput, JobStatusResponse } from "@/types";

/** Either explicit candidate rows or a zip of candidate folders. */
export type BatchInput = { kind: "rows"; rows: CandidateInput[] } | { kind: "zip"; archive: File };

/** Roughly how long one candidate takes end-to-end, for the ETA. */
const SECONDS_PER_CANDIDATE = 35;
/** Past this with no first result, we're almost certainly waking the instance. */
const COLD_START_HINT_MS = 20_000;

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
    refetchInterval: (q) => (q.state.data?.status === "running" ? 3000 : false),
  });

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
    submit.isPending || (!!jobId && (!job.data || job.data.status === "running"));

  const elapsedMs = startedAt.current ? Date.now() - startedAt.current : 0;
  // Only claim a cold start while genuinely nothing has come back yet.
  const coldStart = running && progress.done === 0 && elapsedMs > COLD_START_HINT_MS;
  const remaining = Math.max(progress.total - progress.done, 0);
  const etaSeconds = running && progress.total ? remaining * SECONDS_PER_CANDIDATE : 0;

  const reset = () => {
    setJobId(null);
    setExpected(0);
    startedAt.current = 0;
    submit.reset();
  };

  return { submit, job, jobId, reset, progress, running, coldStart, etaSeconds };
}
