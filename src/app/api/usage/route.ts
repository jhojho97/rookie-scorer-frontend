import { guard, userHeader } from "../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * Server-side truth for this user's metered spend. The browser also keeps a
 * local ledger for instant feedback, but only the backend's number gates
 * anything — a client-side counter cannot limit a client.
 */
export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof Response) return g;
  return callBackend({ path: "/usage", timeoutMs: 55_000, headers: userHeader(g.user) });
}
