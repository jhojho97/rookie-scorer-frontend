/** Shared display formatters. */

/**
 * Map the model's raw 0..1 output to a 0..100 number.
 *
 * NOTE: this is an UNCALIBRATED ranking score, not a probability — the model
 * trains with scale_pos_weight, so a ~5% base rate comes out around 0.20. Show
 * it as supporting detail; the headline figure should be the percentile, which
 * is what the ordering actually supports.
 */
export const toScore = (p: number) => Math.round((p ?? 0) * 100);

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
export function ordinal(n: number): string {
  const i = Math.round(n);
  const mod100 = i % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${i}th`;
  switch (i % 10) {
    case 1:
      return `${i}st`;
    case 2:
      return `${i}nd`;
    case 3:
      return `${i}rd`;
    default:
      return `${i}th`;
  }
}

/**
 * The headline score, 0-100.
 *
 * Under the hood this is the candidate's percentile against the held-out
 * cohort, which is what makes it well-behaved: 50 really is the middle of the
 * field, unlike the model's raw output where a median candidate scores ~18.
 * Shown as a plain number rather than an ordinal, because it is presented to
 * the reader as a score rather than as a rank.
 */
export const fmtScore = (p: number) => Math.round(Math.min(Math.max(p, 0), 100));

export const fmtUsd = (v: number) =>
  v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;

export const fmtTokens = (v: number) => (v ?? 0).toLocaleString();

export const fmtContribution = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;

export const fmtPct = (p: number) => `${(p * 100).toFixed(0)}%`;
