/**
 * Client API layer. Talks ONLY to the same-origin Next.js proxy (/api/*),
 * which injects the secret X-API-Key server-side. The browser never sees the
 * backend token. Every call carries the Firebase ID token as a Bearer header.
 */
import type {
  HealthResponse,
  PredictionResult,
  BatchSubmitResponse,
  JobStatusResponse,
  CandidateInput,
} from "@/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public coldStart = false,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const body = data as { error?: string; detail?: string; cold_start?: boolean };
    throw new ApiError(
      res.status,
      body.error || body.detail || friendlyStatus(res.status),
      Boolean(body.cold_start),
    );
  }
  return data as T;
}

function friendlyStatus(status: number): string {
  switch (status) {
    case 401:
      return "Your session expired. Please sign in again.";
    case 403:
      return "You don't have access to this resource.";
    case 404:
      return "Not found.";
    case 422:
      return "The upload was rejected — check the files and try again.";
    case 500:
      return "The server hit an error while scoring.";
    case 504:
      return "The backend is starting up. This can take around a minute — please retry.";
    default:
      return `Request failed (${status}).`;
  }
}

function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function health(): Promise<HealthResponse> {
  return parse<HealthResponse>(await fetch("/api/health", { cache: "no-store" }));
}

export async function predict(
  token: string,
  cv: File,
  jmp: File | null,
  topN = 5,
): Promise<PredictionResult> {
  const form = new FormData();
  form.append("cv", cv);
  if (jmp) form.append("jmp", jmp);
  const res = await fetch(`/api/predict?top_n=${topN}`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  return parse<PredictionResult>(res);
}

export async function batchPredict(
  token: string,
  candidates: CandidateInput[],
  topN = 5,
): Promise<BatchSubmitResponse> {
  const form = new FormData();
  const anyJmp = candidates.some((c) => c.jmp);
  for (const c of candidates) {
    if (!c.cv) throw new ApiError(422, `Candidate "${c.name || "unnamed"}" is missing a CV.`);
    form.append("cv", c.cv, c.cv.name);
    // If ANY candidate has a JMP, the lists must align — send a 0-byte placeholder.
    if (anyJmp) {
      form.append("jmp", c.jmp ?? new File([], "none"), c.jmp?.name ?? "none");
    }
    form.append("name", c.name || c.cv.name.replace(/\.[^.]+$/, ""));
  }
  const res = await fetch(`/api/batch?top_n=${topN}`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  return parse<BatchSubmitResponse>(res);
}

export async function pollJob(token: string, jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return parse<JobStatusResponse>(res);
}
