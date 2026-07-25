import "server-only";
import { verifyRequest } from "@/lib/firebaseAdmin";

/** Shared auth gate for the scoring proxy routes. Returns null if allowed. */
export async function guard(req: Request): Promise<Response | null> {
  const user = await verifyRequest(req.headers.get("authorization"));
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  return null;
}
