import "server-only";
import { verifyRequest, getAdminInitError, getLastVerifyError, getAdminProjectId } from "@/lib/firebaseAdmin";
import type { VerifiedUser } from "@/lib/firebaseAdmin";

/**
 * Shared auth gate for the scoring proxy routes.
 *
 * Returns the verified user on success, or a Response to return immediately.
 * Callers MUST forward the user's uid to the backend (see `userHeader`) — the
 * backend meters spend per user and cannot identify anyone on its own, because
 * only this proxy ever sees a Firebase token.
 */
export async function guard(req: Request): Promise<{ user: VerifiedUser } | Response> {
  const user = await verifyRequest(req.headers.get("authorization"));
  if (!user) {
    const initErr = getAdminInitError();
    if (initErr) {
      return Response.json(
        { error: "Auth is misconfigured on the server.", detail: initErr },
        { status: 503 },
      );
    }
    // Include the verification reason + the admin's project id so a token/project
    // mismatch is obvious (compare against NEXT_PUBLIC_FIREBASE_PROJECT_ID).
    return Response.json(
      { error: "Unauthorized.", detail: getLastVerifyError(), admin_project: getAdminProjectId() },
      { status: 401 },
    );
  }
  return { user };
}

/** Identifies the caller to the backend for per-user metering. */
export function userHeader(user: VerifiedUser): Record<string, string> {
  return { "X-User-Id": user.uid };
}
