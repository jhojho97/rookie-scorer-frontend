import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Server-only Firebase Admin, used by the proxy to verify the caller's ID token
 * before spending backend credits. If admin credentials are not configured we
 * fall back to "unverified" mode (dev only) — the proxy logs a loud warning.
 */
let app: App | null = null;

function getAdminApp(): App | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  if (app) return app;
  app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

export interface VerifiedUser {
  uid: string;
  email?: string;
  verified: boolean; // false => admin not configured, token not checked
}

/**
 * Verify a `Bearer <idToken>` Authorization header. Returns the user, or null
 * only when a token was present but invalid. When admin is unconfigured we
 * return an unverified stub so local dev works without a service account.
 */
export async function verifyRequest(authHeader: string | null): Promise<VerifiedUser | null> {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const adminApp = getAdminApp();

  if (!adminApp) {
    if (process.env.NODE_ENV === "production") {
      console.error("[proxy] FIREBASE_ADMIN_* not set in production — refusing.");
      return null;
    }
    console.warn("[proxy] Firebase Admin not configured; skipping ID-token verification (dev).");
    return { uid: token ? "dev-token" : "anonymous", verified: false };
  }

  if (!token) return null;
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, verified: true };
  } catch (e) {
    console.warn("[proxy] ID-token verification failed:", (e as Error).message);
    return null;
  }
}
