import type { TopFactor } from "@/types";

/**
 * Which factors a candidate could plausibly change, and what to do about them.
 *
 * "Areas to improve" previously listed SHAP negatives verbatim — including
 * where you did your PhD, your gender, and a 256-dimension text embedding
 * collapsed into "Job market paper content". None of that is advice: some of it
 * is unchangeable, and some of it is not a human-legible thing at all. Split by
 * what the reader can act on, and say what acting would mean.
 */

/** Raw model columns the candidate genuinely controls, with concrete advice. */
const ACTIONABLE: Record<string, string> = {
  "number of published papers": "Publications weigh heavily. Push R&Rs to acceptance first.",
  "number of R&R papers": "Getting papers to R&R is the nearest lever on this.",
  "number of papers in progress": "A deeper pipeline signals sustained output.",
  "number of presentations": "Present at more workshops and conferences.",
  "number of presentations on top conferences":
    "Top-conference slots count for more than volume.",
  "number of awards": "Apply for dissertation grants and awards you qualify for.",
  "number of coauthors": "Co-authorship breadth is visible in the model.",
  has_coauthor: "Co-authored work registers strongly; a solo record does not.",
  has_reference: "Make sure named references appear on the CV itself.",
  "number of reviewers": "Take on reviewing invitations where you can.",
  "number of membership": "Join the main professional associations in your area.",
  "number of teaching experiences": "Teaching experience is part of the profile.",
  "provide abstract": "Include short abstracts for each paper on your CV — cheap to fix.",
  "number of top published papers": "Placement in top journals dominates this factor.",
  "number of top R&R papers": "A top-journal R&R is worth more than several others.",
  "had academic work": "List prior academic positions explicitly.",
  "number of working experiences": "Relevant prior roles are counted.",
};

/** Things the model uses that a candidate cannot change now — context, not advice. */
const FIXED = new Set([
  "gender",
  "Bachelor_top",
  "Master_top",
  "PhD_top",
  "visit_top",
  "has Bachelor honor",
  "has Master honor",
  "has PhD honor",
  "second_language_asia",
  "second_language_euro",
  "multi_language",
  "coauthor_mean",
  "coauthor_high",
  "coauthor_top",
  "number_of_coauthor_2degree",
  "reference_first",
  "reference_mean",
  "reference_high",
]);

export type FactorKind = "actionable" | "fixed" | "paper";

export function factorKind(f: TopFactor): FactorKind {
  if (f.set === "E") return "paper";
  const key = f.feature ?? "";
  if (ACTIONABLE[key]) return "actionable";
  if (FIXED.has(key)) return "fixed";
  // Research area/method flags and anything unrecognised: descriptive, not advice.
  return "fixed";
}

export function factorAdvice(f: TopFactor): string | null {
  if (f.set === "E") {
    return "This reflects the wording and framing of your paper's title, abstract and introduction — not its quality. Sharpening how the contribution is stated is the only lever here.";
  }
  return ACTIONABLE[f.feature ?? ""] ?? null;
}

export function splitFactors(factors: TopFactor[]) {
  return {
    actionable: factors.filter((f) => factorKind(f) === "actionable"),
    paper: factors.filter((f) => factorKind(f) === "paper"),
    fixed: factors.filter((f) => factorKind(f) === "fixed"),
  };
}
