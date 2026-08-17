import "server-only";
import { getAuth } from "firebase-admin/auth";
import { guard } from "../_guard";
import { getAdminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Persists the caller's role as a Firebase CUSTOM CLAIM, ONCE.
 *
 * Role used to live in localStorage keyed by uid, which meant it was a property
 * of the browser rather than the account: signing in on a second device
 * silently demoted every HR user to Student. A custom claim travels with the
 * account and is readable from the ID token.
 *
 * Write-once: the role is chosen at registration and fixed thereafter. Removing
 * the switch from the UI would not have been enough on its own — this endpoint
 * is reachable by any authenticated caller, so without the check here a user
 * could still flip their own role with a single request. A student and a
 * recruiter are not two views of one person; they see different information
 * about different people.
 *
 * To correct a genuine mistake, change the claim out of band (Firebase console
 * or the Admin SDK). That is deliberate friction, not an oversight.
 */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof Response) return g;

  const { role } = (await req.json().catch(() => ({}))) as { role?: string };
  if (role !== "student" && role !== "hr") {
    return Response.json({ error: "role must be 'student' or 'hr'." }, { status: 422 });
  }

  const app = getAdminApp();
  if (!app) {
    // Dev / unconfigured admin: the client falls back to its local preference.
    return Response.json({ role, persisted: false });
  }
  try {
    const auth = getAuth(app);
    const existing = (await auth.getUser(g.user.uid)).customClaims?.role;
    if (existing === "student" || existing === "hr") {
      if (existing !== role) {
        return Response.json(
          {
            error: "Your account type is fixed and cannot be changed.",
            role: existing,
          },
          { status: 409 },
        );
      }
      return Response.json({ role: existing, persisted: true, unchanged: true });
    }
    await auth.setCustomUserClaims(g.user.uid, { role });
    return Response.json({ role, persisted: true });
  } catch (e) {
    return Response.json(
      { error: `Could not save role: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
