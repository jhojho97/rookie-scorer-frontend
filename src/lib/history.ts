"use client";
import type { PredictionResult } from "@/types";

/**
 * Recent batches, so a run survives "New batch" and a page reload.
 *
 * Deliberately local: results contain candidate names and CV-derived features,
 * and there is no server-side store to keep them in. Local means they stay on
 * the machine that produced them and disappear with the browser profile —
 * appropriate for personal data nobody agreed to have retained.
 */
export interface BatchRecord {
  id: string;
  ts: number;
  costUsd: number;
  results: PredictionResult[];
}

const KEY = "batch-history";
const MAX_BATCHES = 10;

export function loadBatches(): BatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as BatchRecord[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveBatch(results: PredictionResult[], costUsd: number): BatchRecord {
  const rec: BatchRecord = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    costUsd,
    results,
  };
  const all = [rec, ...loadBatches()].slice(0, MAX_BATCHES);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Quota exceeded (reports are large): keep only this one rather than lose it.
    try {
      localStorage.setItem(KEY, JSON.stringify([rec]));
    } catch {
      /* give up silently — history is a convenience, not the product */
    }
  }
  window.dispatchEvent(new CustomEvent("batches-updated"));
  return rec;
}

export function deleteBatch(id: string) {
  localStorage.setItem(KEY, JSON.stringify(loadBatches().filter((b) => b.id !== id)));
  window.dispatchEvent(new CustomEvent("batches-updated"));
}

export function clearBatches() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("batches-updated"));
}
