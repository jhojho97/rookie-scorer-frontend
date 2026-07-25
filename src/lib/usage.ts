"use client";
import type { UsageEvent } from "@/types";

/**
 * Lightweight per-user usage ledger in localStorage for the running-cost
 * dashboard. (For real multi-device accounting you'd persist server-side; this
 * is a client convenience matching the "today's usage" spec.)
 */
const key = (uid: string) => `usage:${uid}`;

export function loadUsage(uid: string): UsageEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(uid)) ?? "[]") as UsageEvent[];
  } catch {
    return [];
  }
}

export function recordUsage(uid: string, e: UsageEvent) {
  const all = loadUsage(uid);
  all.push(e);
  localStorage.setItem(key(uid), JSON.stringify(all.slice(-500)));
  window.dispatchEvent(new CustomEvent("usage-updated"));
}

const startOfDay = () => new Date().setHours(0, 0, 0, 0);
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

export function summarize(events: UsageEvent[]) {
  const since = (t: number) =>
    events.filter((e) => e.ts >= t).reduce(
      (a, e) => ({ usd: a.usd + e.usd, tokens: a.tokens + e.tokens }),
      { usd: 0, tokens: 0 },
    );
  return { today: since(startOfDay()), month: since(startOfMonth()) };
}
