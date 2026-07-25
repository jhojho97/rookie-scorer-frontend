"use client";
import { useMutation } from "@tanstack/react-query";
import { predict } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "./useUsage";
import type { PredictionResult } from "@/types";

/** Single-candidate prediction. Records the returned cost into the usage ledger. */
export function usePredict() {
  const { getIdToken } = useAuth();
  const { add } = useUsage();

  return useMutation<PredictionResult, Error, { cv: File; jmp: File | null }>({
    mutationFn: async ({ cv, jmp }) => {
      const token = await getIdToken();
      return predict(token, cv, jmp);
    },
    onSuccess: (res) => {
      add({
        usd: res.cost?.usd ?? 0,
        tokens: res.cost?.total_tokens ?? 0,
        kind: "single",
        label: res.candidate_name ?? undefined,
      });
    },
  });
}
