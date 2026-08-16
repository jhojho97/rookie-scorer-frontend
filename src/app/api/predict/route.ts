import { guard, userHeader } from "../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";
// Vercel Hobby caps functions at 60s; Pro allows up to 300. A cold-started
// backend (~50s) can approach this — the app warms it via /health on load.
// This is now only the FALLBACK path: uploads normally go direct to the backend
// (see /api/upload-ticket), which has neither a body-size nor a 60s limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof Response) return g;

  // Forward the multipart body untouched (cv + optional jmp).
  const form = await req.formData();
  const url = new URL(req.url);
  const topN = url.searchParams.get("top_n");
  return callBackend({
    path: `/predict${topN ? `?top_n=${encodeURIComponent(topN)}` : ""}`,
    method: "POST",
    body: form,
    timeoutMs: 55_000, // return a friendly cold-start 504 before Vercel's 60s cut
    headers: userHeader(g.user),
  });
}
