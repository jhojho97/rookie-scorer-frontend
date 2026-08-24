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

  // Every component calling this hook holds its OWN server figure, so when a
  // scoring finished it was useBatchJob's copy that refreshed while the panel
  // kept the value it fetched at mount -- which is 0 at the start of a session,
  // and stayed 0 all session. Refetch on the same event the local ledger uses,
  // so one broadcast updates every instance.
  useEffect(() => {
    const onUpdate = () => {
      refresh();
      void refreshServer();
    };
    onUpdate();
    window.addEventListener("usage-updated", onUpdate);
    return () => window.removeEventListener("usage-updated", onUpdate);
  }, [refresh, refreshServer]);

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
    // The server total is authoritative — it counts every device and is what
    // actually gates work — but never report LESS than this browser has already
    // seen. Under-reporting spend is the dangerous direction: it shows headroom
    // that may not exist.
    month: {
      usd: Math.max(server?.month_usd ?? 0, local.month.usd),
      tokens: local.month.tokens,
    },
  };
}
