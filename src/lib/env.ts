/** Centralised, typed access to public runtime config. */
export const publicEnv = {
  monthlyQuotaUsd: Number(process.env.NEXT_PUBLIC_MONTHLY_QUOTA_USD ?? "5"),
  maxFileMb: Number(process.env.NEXT_PUBLIC_MAX_FILE_MB ?? "20"),
  // Keep in sync with the backend's ROOKIE_MAX_BATCH (default 20).
  maxBatch: Number(process.env.NEXT_PUBLIC_MAX_BATCH ?? "20"),
  authDevMode: process.env.NEXT_PUBLIC_AUTH_DEV_MODE === "true",
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  },
};

export const isFirebaseConfigured = Boolean(
  publicEnv.firebase.apiKey && publicEnv.firebase.authDomain && publicEnv.firebase.projectId,
);
