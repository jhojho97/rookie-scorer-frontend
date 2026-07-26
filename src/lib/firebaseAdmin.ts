import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Server-only Firebase Admin, used by the proxy to verify the caller's ID token
 * before spending backend credits. If admin credentials are not configured we
 * fall back to "unverified" mode (dev only). If they ARE configured but invalid
 * (e.g. a malformed private key), we surface the real error instead of crashing.
 */
let app: App | null = null;
let lastInitError: string | null = null;

export const getAdminInitError = () => lastInitError;

/** Normalise a pasted private key: strip wrapping quotes, unescape \n. */
function normalizeKey(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, "\n");
}

function getAdminApp(): App | null {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizeKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) return null;
  if (app) return app;
  try {
    app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    lastInitError = null;
    return app;
  } catch (e) {
    lastInitError = (e as Error).message;
    console.error("[proxy] Firebase Admin init failed:", lastInitError);
    return null;
  }
}

export interface VerifiedUser {
  uid: string;
  email?: string;
  verified: boolean; // false => admin not configured, token not checked
}

/**
 * Verify a `Bearer <idToken>` Authorization header. Returns the user, or null
 * when access should be denied. When admin init failed, `getAdminInitError()`
 * is set so the caller can return a 503 (misconfig) instead of a 401.
 */
export async function verifyRequest(authHeader: string | null): Promise<VerifiedUser | null> {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const adminApp = getAdminApp();

  if (!adminApp) {
    if (lastInitError) return null; // configured but broken → caller returns 503
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
