/**
 * Types mirroring the FastAPI backend responses (rookie-scorer-api).
 * Kept in one place so the API layer and UI stay in sync.
 */

export type Role = "student" | "hr";

export interface HealthResponse {
  status: string;
  target: string;
  model_ready: boolean;
  fetch_2degree?: boolean;
}

/** One SHAP contribution factor. `value` is null for the paper-text factor. */
export interface TopFactor {
  label: string;
  value: number | string | null;
  contribution: number; // signed; sums toward (prediction - baseline)
  direction: "increases" | "decreases";
  set: "C" | "D" | "E";
}

export interface Extraction {
  phd?: string | null;
  num_published?: number | null;
  num_awards?: number | null;
  research_area?: string | null;
  cv_chars?: number | null;
  jmp_chars?: number | null;
  [key: string]: unknown;
}

export interface CostBreakdownItem {
  stage: string; // "extraction" | "embedding"
  model: string;
  input_tokens: number;
  output_tokens: number;
  usd: number;
}

export interface Cost {
  usd: number;
  total_tokens: number;
  breakdown: CostBreakdownItem[];
}

/** The shape returned by POST /predict (and each item in a batch result). */
export interface PredictionResult {
  target: string;
  prediction: number; // 0..1
  baseline: number; // 0..1
  sets_used: string[];
  sets_skipped: string[];
  candidate_name: string | null;
  top_factors: TopFactor[];
  extraction: Extraction;
  cost: Cost;
  // present only on batch results:
  candidate?: string;
  status?: "error";
  reason?: string;
}

export interface BatchSubmitResponse {
  job_id: string;
  total?: number;
}

export interface JobStatusResponse {
  status: "running" | "done" | "error";
  progress: string; // e.g. "3/20"
  cost_usd: number;
  results: PredictionResult[];
  reason: string | null;
}

/** A single HR candidate row in the upload table (client-side). */
export interface CandidateInput {
  id: string;
  name: string;
  cv: File | null;
  jmp: File | null;
}

/** A locally-recorded usage event for the running-cost dashboard. */
export interface UsageEvent {
  ts: number; // epoch ms
  usd: number;
  tokens: number;
  kind: "single" | "batch";
  label?: string;
}
