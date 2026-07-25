"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadUsage, recordUsage, summarize } from "@/lib/usage";
import type { UsageEvent } from "@/types";

/** Running usage ledger for the signed-in user, reactive to new records. */
export function useUsage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<UsageEvent[]>([]);

  const refresh = useCallback(() => {
    if (user) setEvents(loadUsage(user.uid));
  }, [user]);

  useEffect(() => {
    refresh();
    window.addEventListener("usage-updated", refresh);
    return () => window.removeEventListener("usage-updated", refresh);
  }, [refresh]);

  const add = useCallback(
    (e: Omit<UsageEvent, "ts">) => {
      if (user) recordUsage(user.uid, { ...e, ts: Date.now() });
    },
    [user],
  );

  return { events, add, ...summarize(events) };
}
