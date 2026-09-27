"use client";
import { useRef, useState } from "react";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { ScoreGauge } from "./ScoreGauge";
import { ActionableFactors } from "./ActionableFactors";
import { ExtractionWarning } from "./ExtractionWarning";
import { cn } from "@/lib/cn";
import { printReport } from "@/lib/printReport";
import { displayValue, variableHelp } from "@/lib/variables";
import { DEFAULT_TARGET, describeTarget, forTarget, targetInfo, type TargetKey } from "@/lib/targets";

function FactorList({
  title,
  description,
  icon,
  factors,
  tone,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  factors: PredictionResult["top_factors"];
  tone: "positive" | "negative";
}) {
  if (!factors.length) return null;
  return (
    <div className="space-y-2">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </h4>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2">
        {factors.map((f, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    tone === "positive" ? "bg-positive" : "bg-negative",
                  )}
                  aria-hidden
                />
                {f.label}
              </span>
              {/* The candidate's own value, not the SHAP number: "3 awards" is
                  something a reader can act on, "+0.021" is not. */}
              {displayValue(f) != null && (
                <span className="tnum shrink-0 text-right text-sm text-muted-foreground">
                  {displayValue(f)}
                </span>
              )}
            </div>
            {variableHelp(f) && (
              <p className="mt-0.5 pl-3.5 text-xs leading-snug text-muted-foreground">{variableHelp(f)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Two audiences, two reports.
 *
 * "student" — the person being scored. Their rank, what drove it, and what they
 * could do about it. The model's internals (raw uncalibrated score, baseline,
 * per-component disagreement), the parsed-feature dump and the API cost are all
 * noise to them: they cannot act on any of it and the raw number actively
 * misleads, since it reads as a mark out of 100.
 *
 * "reviewer" — the HR drill-in. Gets the internals, because they are deciding
 * about someone else and should see how firm the number is, plus the cost,
 * because they are the one spending it. Does NOT get the improvement advice:
 * that is guidance for the candidate, not for whoever is judging them.
 */
export type ReportVariant = "student" | "reviewer";

export function ReportCard({
  result: base,
  variant = "reviewer",
  target = DEFAULT_TARGET,
}: {
  result: PredictionResult;
  variant?: ReportVariant;
  /** Which research-productivity level to show. Falls back to the result's
   *  own (default) target when it has no result for this one. */
  target?: TargetKey;
}) {
  // Everything below reads `result`, so swapping in the target's view here is
  // the whole change: score, factors, levers and components all follow it.
  const result = forTarget(base, target) ?? base;
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const isStudent = variant === "student";

  const name = result.candidate_name || result.candidate || "Candidate";
  const factors = result.top_factors ?? [];
  const positives = factors.filter((f) => f.contribution >= 0).slice(0, 5);
  const negatives = factors.filter((f) => f.contribution < 0).slice(0, 5);
  // Compute the gap on the underlying probabilities and round ONCE. Rounding
  // both ends first (8 - 4) lets a 3.6-point gap print as 5, or vice versa.

  // Server-stamped scoring time. Falls back to render time only for results
  // produced before the backend started sending it.
  const scoredAt = result.scored_at ? new Date(result.scored_at) : null;

  async function handleExport() {
    if (!ref.current) return;
    setExporting(true);
    try {
      await printReport(ref.current, `${name.replace(/\s+/g, "_")}_report`, {
        title: name,
        subtitle: [
          `${targetInfo(result.target).short} target`,
          scoredAt ? `Scored ${scoredAt.toLocaleString()}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground">
            {scoredAt ? (
              <>
                Scored <time dateTime={result.scored_at}>{scoredAt.toLocaleString()}</time>
              </>
            ) : (
              "Scoring time unavailable"
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          title="Opens the print dialog. Choose Save as PDF as the destination."
        >
          {exporting ? <Spinner /> : <Download className="h-4 w-4" />}
          Save as PDF
        </Button>
      </div>

      {/* Everything inside this ref is captured into the PDF — including the
          warning, so an unreliable score stays labelled once exported. */}
      <div ref={ref} className="space-y-4 rounded-lg">
        <ExtractionWarning result={result} />
        {/* Full width: the Contribution breakdown chart that sat beside this was
            removed -- its factors are the ones already listed under Outstanding
            and Lagging areas, so it repeated them as bars. */}
        <Card>
          <CardHeader>
            <CardTitle>Research productivity score · {targetInfo(result.target).short}</CardTitle>
            <p className="text-xs leading-snug text-muted-foreground">{describeTarget(result.target)}</p>
          </CardHeader>
          <CardContent>
            <ScoreGauge
              prediction={result.prediction}
              baseline={result.baseline}
              percentile={result.percentile}
              cohortN={result.cohort_n}
              showCohort={!isStudent}
              target={result.target}
            />
            {result.paper_used === false && (
              <p className="mt-2 text-center text-xs leading-snug text-muted-foreground">
                No readable job-market paper was provided, so this score is based on the CV
                alone.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Same wording as the results table, so a recruiter clicking through
              from "Outstanding areas" lands on a section by the same name. */}
          <FactorList
            title="Outstanding areas"
            description="The five factors that raised this score the most, with the candidate's own value for each."
            icon={<TrendingUp className="h-4 w-4 text-positive" />}
            factors={positives}
            tone="positive"
          />
          <FactorList
            title="Lagging areas"
            description="The five factors that lowered this score the most, with the candidate's own value for each."
            icon={<TrendingDown className="h-4 w-4 text-negative" />}
            factors={negatives}
            tone="negative"
          />
        </div>

        {/* The recruiter's report is the candidate's report without the
            improvement advice: guidance for the candidate, not for the person
            judging them. Everything else is identical. */}
        {isStudent && <ActionableFactors factors={factors} />}
      </div>
    </div>
  );
}
