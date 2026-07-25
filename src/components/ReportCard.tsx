"use client";
import { useRef, useState } from "react";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import type { PredictionResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Spinner } from "@/components/ui/misc";
import { ScoreGauge } from "./ScoreGauge";
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

export function ReportCard({ result }: { result: PredictionResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const name = result.candidate_name || result.candidate || "Candidate";
  const factors = result.top_factors ?? [];
  const positives = factors.filter((f) => f.contribution >= 0).slice(0, 5);
  const negatives = factors.filter((f) => f.contribution < 0).slice(0, 5);
  const delta = toScore(result.prediction) - toScore(result.baseline);

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
            {new Date().toLocaleString()} · target {result.target}
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
              <CardTitle>Research productivity score</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreGauge prediction={result.prediction} baseline={result.baseline} />
              <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                <Badge tone={delta >= 0 ? "positive" : "negative"}>
                  {delta >= 0 ? "+" : ""}
                  {delta} vs baseline
                </Badge>
                <span className="text-muted-foreground">
                  candidate {toScore(result.prediction)} · baseline {toScore(result.baseline)}
                </span>
              </div>
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
            title="Areas to improve"
            icon={<TrendingDown className="h-4 w-4 text-negative" />}
            factors={negatives}
            tone="negative"
          />
        </div>

        <FeatureAccordion extraction={result.extraction ?? {}} />
        <CostCard cost={result.cost} />
      </div>
    </div>
  );
}
