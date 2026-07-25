import { guard } from "../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";
// Vercel Hobby caps functions at 60s; Pro allows up to 300. A cold-started
// backend (~50s) can approach this — the app warms it via /health on load.
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  // Forward the multipart body untouched (cv + optional jmp).
  const form = await req.formData();
  const url = new URL(req.url);
  const topN = url.searchParams.get("top_n");
  return callBackend({
    path: `/predict${topN ? `?top_n=${encodeURIComponent(topN)}` : ""}`,
    method: "POST",
    body: form,
    timeoutMs: 55_000, // return a friendly cold-start 504 before Vercel's 60s cut
  });
}
