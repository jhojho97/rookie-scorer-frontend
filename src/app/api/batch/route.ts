import { guard } from "../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";
// Batch submit returns a job_id quickly; scoring happens server-side on Render
// and is polled via /jobs, so this only needs to cover submit + cold start.
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  const form = await req.formData();
  const url = new URL(req.url);
  const topN = url.searchParams.get("top_n");
  return callBackend({
    path: `/predict/batch_files${topN ? `?top_n=${encodeURIComponent(topN)}` : ""}`,
    method: "POST",
    body: form,
    timeoutMs: 55_000,
  });
}
