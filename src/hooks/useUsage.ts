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

  // Which figure to show.
  //
  // This used to be max(server, local) unconditionally, on the reasoning that
  // under-reporting spend is the dangerous direction. That was right when the
  // server counter was in-process and reset on every free-tier spin-up. It is
  // now a durable per-account store, and the max was actively wrong: a browser
  // that had done the scoring showed its own local total while a second browser
  // on the SAME account showed the (lower) server total, so the usage appeared
  // not to follow the account at all. It always did — only the display
  // disagreed.
  //
  // So prefer the server whenever it says it is durable, which makes the number
  // identical on every device. Keep the old max for a non-durable store, where
  // the original reasoning still holds, and for when /usage is unreachable.
  const serverUsd = server?.month_usd ?? 0;
  const monthUsd = server?.durable ? serverUsd : Math.max(serverUsd, local.month.usd);

  return {
    events,
    add,
    server,
    refreshServer,
    // Local-only: the server keeps a monthly total, not a daily one.
    today: local.today,
    month: { usd: monthUsd, tokens: local.month.tokens },
  };
}
