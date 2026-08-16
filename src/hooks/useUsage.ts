"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadUsage, recordUsage, summarize } from "@/lib/usage";
import { serverUsage } from "@/services/api";
import type { ServerUsage, UsageEvent } from "@/types";

/**
 * Usage for the signed-in user.
 *
 * Two sources, on purpose:
 *  - the LOCAL ledger updates the moment a scoring returns, so the number moves
 *    while you watch, and still works if /usage is unreachable;
 *  - the SERVER figure is authoritative and is what actually blocks work. It is
 *    per-account rather than per-browser, and cannot be cleared by the user.
 * Where they disagree, show the server's.
 */
export function useUsage() {
  const { user, getIdToken } = useAuth();
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [server, setServer] = useState<ServerUsage | null>(null);

  const refresh = useCallback(() => {
    if (user) setEvents(loadUsage(user.uid));
  }, [user]);

  const refreshServer = useCallback(async () => {
    if (!user) return;
    try {
      setServer(await serverUsage(await getIdToken()));
    } catch {
      setServer(null); // fall back to the local ledger
    }
  }, [user, getIdToken]);

  useEffect(() => {
    refresh();
    window.addEventListener("usage-updated", refresh);
    return () => window.removeEventListener("usage-updated", refresh);
  }, [refresh]);

  useEffect(() => {
    void refreshServer();
  }, [refreshServer]);

  const add = useCallback(
    (e: Omit<UsageEvent, "ts">) => {
      if (user) recordUsage(user.uid, { ...e, ts: Date.now() });
    },
    [user],
  );

  const local = summarize(events);
  return {
    events,
    add,
    server,
    refreshServer,
    today: local.today,
    // Prefer the server's month total; it counts every device and is enforced.
    month: server ? { usd: server.month_usd, tokens: local.month.tokens } : local.month,
  };
}
