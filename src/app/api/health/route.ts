import { callBackend } from "@/lib/backend";

// /health is public on the backend; expose it without auth for status checks.
// It also doubles as the "warm-up" call, so allow the full cold-start window.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return callBackend({ path: "/health", timeoutMs: 55_000 });
}
