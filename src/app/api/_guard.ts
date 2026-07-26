import "server-only";
import { verifyRequest, getAdminInitError } from "@/lib/firebaseAdmin";

/** Shared auth gate for the scoring proxy routes. Returns null if allowed. */
export async function guard(req: Request): Promise<Response | null> {
  const user = await verifyRequest(req.headers.get("authorization"));
  if (!user) {
    const initErr = getAdminInitError();
    if (initErr) {
      // Configured but broken (e.g. bad FIREBASE_ADMIN_PRIVATE_KEY). Surface it
      // so it's diagnosable instead of an opaque 500.
      return Response.json(
        { error: "Auth is misconfigured on the server.", detail: initErr },
        { status: 503 },
      );
    }
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
