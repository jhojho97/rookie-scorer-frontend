import { guard } from "../_guard";
import { backendBaseUrl, callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mints a single-use upload ticket so the BROWSER can POST files straight to the
 * backend instead of through this proxy.
 *
 * Why: Vercel serverless functions reject request bodies over 4.5MB
 * (FUNCTION_PAYLOAD_TOO_LARGE) — a batch of CV+JMP PDFs blows past that long
 * before the function runs, and the limit is not configurable. Uploading direct
 * to Render (no such cap, and no 60s function ceiling either) is the only fix.
 *
 * Security is unchanged: the caller is still authenticated with their Firebase
 * ID token here, the secret X-API-Key never leaves the server, and the ticket
 * the browser receives is short-lived and burns on first use.
 */
export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  // This tiny call is also what wakes a sleeping Render instance, so allow for a
  // cold start but return before Vercel's own 60s function ceiling.
  const res = await callBackend({ path: "/upload-ticket", method: "POST", timeoutMs: 55_000 });
  if (!res.ok) return res;

  const ticket = (await res.json()) as { ticket: string; expires_in: number };
  return Response.json({ ...ticket, backend_url: backendBaseUrl() });
}
