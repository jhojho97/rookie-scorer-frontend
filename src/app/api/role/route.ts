import "server-only";
import { getAuth } from "firebase-admin/auth";
import { guard } from "../_guard";
import { getAdminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Persists the caller's role as a Firebase CUSTOM CLAIM.
 *
 * Role used to live in localStorage keyed by uid, which meant it was a property
 * of the browser rather than the account: signing in on a second device
 * silently demoted every HR user to Student, and there was no way to change it.
 * A custom claim travels with the account and is readable from the ID token.
 *
 * Roles here are self-declared (they choose at registration and may switch),
 * so this grants no privilege the user could not already claim — it decides
 * which dashboard they see, not what the backend will do for them.
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
    await getAuth(app).setCustomUserClaims(g.user.uid, { role });
    return Response.json({ role, persisted: true });
  } catch (e) {
    return Response.json(
      { error: `Could not save role: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
