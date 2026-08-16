"use client";
import { useRef, useState } from "react";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Spinner } from "@/components/ui/misc";
import { ScoreGauge } from "./ScoreGauge";
import { ActionableFactors } from "./ActionableFactors";
import { ComponentSpread } from "./ComponentSpread";
import { ContributionChart } from "./ContributionChart";
import { CostCard } from "./CostCard";
import { FeatureAccordion } from "./FeatureAccordion";
import { fmtContribution, toScore } from "@/lib/format";
import { exportElementToPdf } from "@/lib/pdf";

function FactorList({
  title,
  icon,
  factors,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  factors: PredictionResult["top_factors"];
  tone: "positive" | "negative";
}) {
  if (!factors.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </h4>
      <div className="grid gap-2">
        {factors.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <span className="text-sm">{f.label}</span>
            <Badge tone={tone} className="tnum">
              {fmtContribution(f.contribution)}
            </Badge>
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
  result,
  variant = "reviewer",
}: {
  result: PredictionResult;
  variant?: ReportVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const isStudent = variant === "student";

  const name = result.candidate_name || result.candidate || "Candidate";
  const factors = result.top_factors ?? [];
  const positives = factors.filter((f) => f.contribution >= 0).slice(0, 5);
  const negatives = factors.filter((f) => f.contribution < 0).slice(0, 5);
  // Compute the gap on the underlying probabilities and round ONCE. Rounding
  // both ends first (8 - 4) lets a 3.6-point gap print as 5, or vice versa.
  const delta = Math.round((result.prediction - result.baseline) * 100);

  // Server-stamped scoring time. Falls back to render time only for results
  // produced before the backend started sending it.
  const scoredAt = result.scored_at ? new Date(result.scored_at) : null;

  async function handleExport() {
    if (!ref.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(ref.current, `${name.replace(/\s+/g, "_")}_report.pdf`);
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
            )}{" "}
            · target {result.target}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Spinner /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
      </div>

      {/* Everything inside this ref is captured into the PDF. */}
      <div ref={ref} className="space-y-4 rounded-lg">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Research productivity ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreGauge
                prediction={result.prediction}
                baseline={result.baseline}
                percentile={result.percentile}
                cohortN={result.cohort_n}
              />
              {!isStudent && (
                <>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
                    <Badge tone={delta >= 0 ? "positive" : "negative"}>
                      {delta >= 0 ? "+" : ""}
                      {delta} vs baseline
                    </Badge>
                    <span className="text-muted-foreground">
                      raw score {toScore(result.prediction)} · baseline {toScore(result.baseline)}
                    </span>
                  </div>
                  <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
                    The raw score ranks candidates but is not a calibrated probability — read the
                    percentile, not the number out of 100.
                  </p>
                  <div className="mt-4">
                    <ComponentSpread result={result} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contribution breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionChart factors={factors} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FactorList
            title="Top contributors"
            icon={<TrendingUp className="h-4 w-4 text-positive" />}
            factors={positives}
            tone="positive"
          />
          <FactorList
            title="Holding the score down"
            icon={<TrendingDown className="h-4 w-4 text-negative" />}
            factors={negatives}
            tone="negative"
          />
        </div>

        {isStudent && <ActionableFactors factors={factors} />}

        {!isStudent && (
          <>
            <FeatureAccordion extraction={result.extraction ?? {}} />
            <CostCard cost={result.cost} />
          </>
        )}
      </div>
    </div>
  );
}
