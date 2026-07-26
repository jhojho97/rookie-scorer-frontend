import "server-only";
import { verifyRequest, getAdminInitError, getLastVerifyError, getAdminProjectId } from "@/lib/firebaseAdmin";

/** Shared auth gate for the scoring proxy routes. Returns null if allowed. */
export async function guard(req: Request): Promise<Response | null> {
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
  return null;
}
