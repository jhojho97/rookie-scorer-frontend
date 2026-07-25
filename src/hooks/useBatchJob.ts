"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { batchPredict, pollJob } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "./useUsage";
import type { CandidateInput, JobStatusResponse } from "@/types";

/**
 * Batch workflow: submit candidates -> get job_id -> poll /jobs until done.
 * TanStack Query handles polling + retry; navigation away cancels it. Records
 * the batch's total cost once, when the job finishes.
 */
export function useBatchJob() {
  const { getIdToken } = useAuth();
  const { add } = useUsage();
  const [jobId, setJobId] = useState<string | null>(null);
  const recorded = useRef(false);

  const submit = useMutation<string, Error, CandidateInput[]>({
    mutationFn: async (candidates) => {
      const token = await getIdToken();
      const { job_id } = await batchPredict(token, candidates);
      return job_id;
    },
    onSuccess: (id) => {
      recorded.current = false;
      setJobId(id);
    },
  });

  const job = useQuery<JobStatusResponse>({
    queryKey: ["job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const token = await getIdToken();
      return pollJob(token, jobId!);
    },
    refetchInterval: (q) => (q.state.data?.status === "running" ? 3000 : false),
  });

  useEffect(() => {
    if (job.data && job.data.status !== "running" && !recorded.current) {
      recorded.current = true;
      const tokens = (job.data.results ?? []).reduce((a, r) => a + (r.cost?.total_tokens ?? 0), 0);
      add({ usd: job.data.cost_usd ?? 0, tokens, kind: "batch" });
    }
  }, [job.data, add]);

  const reset = () => {
    setJobId(null);
    submit.reset();
  };

  return { submit, job, jobId, reset };
}
