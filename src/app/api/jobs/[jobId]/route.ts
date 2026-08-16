import { guard, userHeader } from "../../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const g = await guard(req);
  if (g instanceof Response) return g;
  // The uid is what lets the backend refuse to hand this job to another user.
  return callBackend({
    path: `/jobs/${encodeURIComponent(params.jobId)}`,
    timeoutMs: 60_000,
    headers: userHeader(g.user),
  });
}
