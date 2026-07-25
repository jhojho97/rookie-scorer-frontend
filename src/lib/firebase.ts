"use client";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { publicEnv, isFirebaseConfigured } from "./env";

/** Lazily-initialised Firebase client. Null when not configured (dev mode). */
let app: FirebaseApp | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(publicEnv.firebase);
  }
  return getAuth(app);
}
