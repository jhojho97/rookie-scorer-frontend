import { guard, userHeader } from "../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";
// Batch submit returns a job_id quickly; scoring happens server-side on Render
// and is polled via /jobs, so this only needs to cover submit + cold start.
// Fallback path only — see /api/upload-ticket for the direct-upload route.
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof Response) return g;

  const form = await req.formData();
  const url = new URL(req.url);
  const topN = url.searchParams.get("top_n");
  // `archive` present => a zip of candidate folders; otherwise loose cv/jmp pairs.
  const path = form.has("archive") ? "/predict/batch" : "/predict/batch_files";
  return callBackend({
    path: `${path}${topN ? `?top_n=${encodeURIComponent(topN)}` : ""}`,
    method: "POST",
    body: form,
    timeoutMs: 55_000,
    headers: userHeader(g.user),
  });
}
