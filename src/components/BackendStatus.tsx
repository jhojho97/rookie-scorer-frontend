"use client";
import { useQuery } from "@tanstack/react-query";
import { health } from "@/services/api";
import { cn } from "@/lib/cn";

/** Small live dot showing backend reachability (polls /health via the proxy). */
export function BackendStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: health,
    refetchInterval: 60_000,
    retry: 1,
  });
  const ok = data?.status === "ok";
  const state = isLoading ? "loading" : ok ? "ok" : "down";
  const map = {
    loading: { c: "bg-warning", t: "Checking backend…" },
    ok: { c: "bg-positive", t: "Backend online" },
    down: { c: "bg-negative", t: isError ? "Backend unreachable" : "Backend starting…" },
  }[state];

  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground" title={map.t}>
      <span className={cn("h-2 w-2 rounded-full", map.c, state === "loading" && "animate-pulse")} />
      {map.t}
    </span>
  );
}
