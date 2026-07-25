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
  setRole: (role: Role) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

// Role isn't a backend concept — persist it client-side, keyed by uid.
const roleKey = (uid: string) => `role:${uid}`;
function loadRole(uid: string): Role {
  if (typeof window === "undefined") return "student";
  return (localStorage.getItem(roleKey(uid)) as Role) || "student";
}
function saveRole(uid: string, role: Role) {
  localStorage.setItem(roleKey(uid), role);
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
      setUser(u ? { uid: u.uid, email: u.email ?? "", role: loadRole(u.uid) } : null);
      setLoading(false);
    });
  }, [devMode]);

  const api = useMemo<AuthCtx>(() => {
    const getIdToken = async () => {
      if (devMode) return "dev";
      return fbUser ? fbUser.getIdToken() : "";
    };

    async function login(email: string, password: string) {
      if (devMode) {
        const u: AppUser = { uid: `dev:${email}`, email, role: loadRole(`dev:${email}`) };
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
        saveRole(uid, role);
        const u: AppUser = { uid, email, role };
        localStorage.setItem("dev-user", JSON.stringify(u));
        setUser(u);
        return;
      }
      const auth = getFirebaseAuth()!;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      saveRole(cred.user.uid, role);
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

    function setRole(role: Role) {
      if (!user) return;
      saveRole(user.uid, role);
      setUser({ ...user, role });
      if (devMode) localStorage.setItem("dev-user", JSON.stringify({ ...user, role }));
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
