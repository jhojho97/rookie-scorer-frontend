import type { TopFactor } from "@/types";

/**
 * One-line explanations of every variable the models use, keyed by the
 * dataset column name. Worded from the paper's own definitions (Ke & Long,
 * Appendix A, Panels B-D) so what the reader sees matches what was measured.
 */
export const VARIABLE_HELP: Record<string, string> = {
  // Set C: read directly from the CV (paper's Predictors A)
  gender: "Candidate's gender, inferred from their name.",
  "has Bachelor honor": "Whether the CV lists any honours from the bachelor's degree.",
  "has Master honor": "Whether the CV lists any honours from the master's degree.",
  "has PhD honor": "Whether the CV lists any honours from the PhD.",
  "number of published papers": "Papers listed on the CV as published, in any journal.",
  "number of R&R papers": "Papers listed as revise-and-resubmit (R&R) at a journal.",
  "number of papers in progress": "Working papers not yet published or at R&R.",
  has_coauthor: "Whether any paper on the CV has a coauthor.",
  has_reference: "Whether the CV names any references (referees).",
  "number of coauthors": "Number of different coauthors across the papers on the CV.",
  "number of presentations": "Conference and workshop presentations listed on the CV.",
  "number of teaching experiences": "Teaching roles listed on the CV.",
  "number of awards": "Academic awards listed on the CV.",
  "number of reviewers": "Journals or associations the candidate reviews for.",
  "number of membership": "Professional memberships listed on the CV.",
  "number of working experiences": "Jobs and work roles listed on the CV.",
  "had academic work": "Whether the CV lists earlier academic employment.",
  "had non-academic work": "Whether the CV lists work outside academia.",
  "provide abstract": "Whether the CV includes an abstract for any of the papers.",
  PrimaryResearchArea_financial: "Main research area is financial accounting, judged from the research interests and paper titles.",
  PrimaryResearchArea_auditing: "Main research area is auditing, judged from the research interests and paper titles.",
  PrimaryResearchArea_managerial: "Main research area is managerial accounting, judged from the research interests and paper titles.",
  PrimaryResearchArea_tax: "Main research area is tax, judged from the research interests and paper titles.",
  PrimaryResearchMethod_archival: "Main research method is archival: empirical work with existing data.",
  PrimaryResearchMethod_experiment: "Main research method is experiments.",
  PrimaryResearchMethod_analytical: "Main research method is analytical: mathematical models.",
  multi_language: "Whether the CV lists more than one language.",

  // Set D: CV combined with outside information (paper's Predictors B)
  Bachelor_top: "Bachelor's degree from a US News top-50 business school.",
  Master_top: "Master's degree from a US News top-50 business school.",
  PhD_top: "PhD from a US News top-50 business school.",
  visit_top: "A visiting position, such as visiting PhD student, at a US News top-50 business school.",
  "number of top published papers": "Publications in the 11 top accounting and finance journals used in the study.",
  "number of top R&R papers": "R&Rs at the 11 top accounting and finance journals used in the study.",
  coauthor_mean: "Average rank of the candidate's coauthors in the BYU Accounting Research Rankings. Lower means more prominent.",
  coauthor_high: "Best rank among the candidate's coauthors in the BYU Accounting Research Rankings. Lower means more prominent.",
  coauthor_top: "Whether any coauthor is in the top 1% of the BYU Accounting Research Rankings.",
  "number of presentations on top conferences": "Presentations at top accounting conferences, such as the AAA annual meeting and the JAE, JAR, CAR and RAS conferences.",
  reference_first: "BYU Accounting Research Ranking of the first reference listed, usually the main advisor. Lower means more prominent.",
  reference_mean: "Average BYU Accounting Research Ranking of the references listed. Lower means more prominent.",
  reference_high: "Best BYU Accounting Research Ranking among the references listed. Lower means more prominent.",
  second_language_asia: "Speaks an Asian language besides English.",
  second_language_euro: "Speaks a European language besides English.",

  // Set E: the job-market paper (paper's Predictors C)
  _embedding_E:
    "How the title, abstract and introduction of the job-market paper compare with past candidates', from an AI text embedding.",
};

/** Rank variables where 0 means "nobody found in the ranking", not rank zero. */
const RANK_VARIABLES = new Set([
  "coauthor_mean",
  "coauthor_high",
  "reference_first",
  "reference_mean",
  "reference_high",
]);

export const variableHelp = (f: TopFactor) => (f.feature ? VARIABLE_HELP[f.feature] : undefined);

/** The candidate's value as a reader should see it. */
export function displayValue(f: TopFactor): string | null {
  if (f.value == null) return null;
  const v = String(f.value);
  if (f.feature && RANK_VARIABLES.has(f.feature) && Number(v) === 0) return "Not in the BYU ranking";
  return v;
}
