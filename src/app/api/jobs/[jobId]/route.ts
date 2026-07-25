import { guard } from "../../_guard";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  return callBackend({ path: `/jobs/${encodeURIComponent(params.jobId)}`, timeoutMs: 60_000 });
}
