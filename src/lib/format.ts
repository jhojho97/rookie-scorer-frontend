/** Shared display formatters. */

/** Map a 0..1 probability to a 0..100 score. */
export const toScore = (p: number) => Math.round((p ?? 0) * 100);

export const fmtUsd = (v: number) =>
  v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;

export const fmtTokens = (v: number) => (v ?? 0).toLocaleString();

export const fmtContribution = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;

export const fmtPct = (p: number) => `${(p * 100).toFixed(0)}%`;
