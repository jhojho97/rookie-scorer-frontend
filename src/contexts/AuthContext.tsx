"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FbUser,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { publicEnv } from "@/lib/env";
import type { Role } from "@/types";

export interface AppUser {
  uid: string;
  email: string;
  role: Role;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  devMode: boolean;
  /** Bearer token for the proxy Authorization header (Firebase ID token, or "" in dev). */
  getIdToken: () => Promise<string>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Switch role; persisted to the account as a custom claim. */
  setRole: (role: Role) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

/**
 * Role lives in a Firebase CUSTOM CLAIM, so it belongs to the ACCOUNT and
 * follows the user to any device. localStorage is kept only as (a) an offline
 * cache for instant first paint and (b) a fallback when Firebase Admin is not
 * configured (dev). It is never the source of truth when a claim exists —
 * previously it was, which silently demoted HR users to Student on any second
 * device and left no way to change role at all.
 */
const roleKey = (uid: string) => `role:${uid}`;
const isRole = (v: unknown): v is Role => v === "student" || v === "hr";

function cachedRole(uid: string): Role {
  if (typeof window === "undefined") return "student";
  const v = localStorage.getItem(roleKey(uid));
  return isRole(v) ? v : "student";
}
function cacheRole(uid: string, role: Role) {
  if (typeof window !== "undefined") localStorage.setItem(roleKey(uid), role);
}

/** Read the role claim off the ID token, falling back to the local cache. */
async function resolveRole(u: FbUser): Promise<Role> {
  try {
    const { claims } = await u.getIdTokenResult();
    if (isRole(claims.role)) {
      cacheRole(u.uid, claims.role);
      return claims.role;
    }
  } catch {
    /* offline or token unavailable — fall through to the cache */
  }
  return cachedRole(u.uid);
}

/** Persist a role as a custom claim, then refresh the token so it takes effect. */
async function persistRole(u: FbUser, role: Role): Promise<void> {
  cacheRole(u.uid, role);
  const res = await fetch("/api/role", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await u.getIdToken()}` },
    body: JSON.stringify({ role }),
  });
  // A new claim is only visible after the ID token is re-minted.
  if (res.ok) await u.getIdToken(true);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const devMode = publicEnv.authDevMode || !getFirebaseAuth();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fbUser, setFbUser] = useState<FbUser | null>(null);

  // ── Firebase-backed session ──────────────────────────────────────────────
  useEffect(() => {
    if (devMode) {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dev-user") : null;
      setUser(raw ? (JSON.parse(raw) as AppUser) : null);
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Paint immediately from the cache, then correct from the token claim.
      setUser({ uid: u.uid, email: u.email ?? "", role: cachedRole(u.uid) });
      setLoading(false);
      resolveRole(u).then((role) =>
        setUser((prev) => (prev && prev.uid === u.uid ? { ...prev, role } : prev)),
      );
    });
  }, [devMode]);

  const api = useMemo<AuthCtx>(() => {
    const getIdToken = async () => {
      if (devMode) return "dev";
      return fbUser ? fbUser.getIdToken() : "";
    };

    async function login(email: string, password: string) {
      if (devMode) {
        const u: AppUser = { uid: `dev:${email}`, email, role: cachedRole(`dev:${email}`) };
        localStorage.setItem("dev-user", JSON.stringify(u));
        setUser(u);
        return;
      }
      const auth = getFirebaseAuth()!;
      await signInWithEmailAndPassword(auth, email, password);
    }

    async function register(email: string, password: string, role: Role) {
      if (devMode) {
        const uid = `dev:${email}`;
        cacheRole(uid, role);
        const u: AppUser = { uid, email, role };
        localStorage.setItem("dev-user", JSON.stringify(u));
        setUser(u);
        return;
      }
      const auth = getFirebaseAuth()!;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Attach the role to the account itself, not just this browser. If the
      // claim write fails we still proceed — the cached role keeps them moving
      // and the next role change will retry.
      await persistRole(cred.user, role).catch(() => {});
      setUser({ uid: cred.user.uid, email, role });
    }

    async function resetPassword(email: string) {
      if (devMode) return; // no-op in dev
      await sendPasswordResetEmail(getFirebaseAuth()!, email);
    }

    async function logout() {
      if (devMode) {
        localStorage.removeItem("dev-user");
        setUser(null);
        return;
      }
      await signOut(getFirebaseAuth()!);
    }

    async function setRole(role: Role) {
      if (!user) return;
      cacheRole(user.uid, role);
      setUser({ ...user, role });
      if (devMode) {
        localStorage.setItem("dev-user", JSON.stringify({ ...user, role }));
        return;
      }
      if (fbUser) await persistRole(fbUser, role);
    }

    return { user, loading, devMode, getIdToken, login, register, resetPassword, logout, setRole };
  }, [user, loading, devMode, fbUser]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
