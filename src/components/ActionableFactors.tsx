"use client";
import { Lock, Wrench, FileText } from "lucide-react";
import type { TopFactor } from "@/types";
import { splitFactors, factorAdvice } from "@/lib/factors";
import { fmtContribution } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Row({ f, advice }: { f: TopFactor; advice: string | null }) {
  return (
    <li className="flex gap-3 py-2.5">
      <span
        className={cnTone(f.contribution)}
        aria-label={f.contribution >= 0 ? "helps" : "hurts"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{f.label}</span>
          <span
            className={`tnum shrink-0 text-xs ${
              f.contribution >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {fmtContribution(f.contribution)}
          </span>
        </div>
        {advice && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{advice}</p>}
      </div>
    </li>
  );
}

const cnTone = (v: number) =>
  `mt-1.5 h-2 w-2 shrink-0 rounded-full ${v >= 0 ? "bg-positive" : "bg-negative"}`;

/**
 * Turns the SHAP factor list into something a candidate can act on, by
 * separating levers they control from context they cannot change. Listing
 * "PhD from a top-50 school" under "areas to improve" is not advice.
 */
export function ActionableFactors({ factors }: { factors: TopFactor[] }) {
  const { actionable, paper, fixed } = splitFactors(factors);
  if (!factors.length) return null;

  return (
    <Card>
      <CardHeader>
        {/* Named "AI suggested" on purpose: these sentences are authored
            guidance keyed to each feature, NOT model output. SHAP contributions
            are associational, so acting on them moves a correlate, not a proven
            cause — the heading has to carry that disclaimer. */}
        <CardTitle>AI suggested actions to improve scoring</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs leading-snug text-muted-foreground">
          These suggestions are generated guidance, not model output. The model finds factors
          that <em>correlate</em> with published productivity in past candidates — it cannot show
          that changing one causes a better outcome.
        </p>

        {actionable.length > 0 ? (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Wrench className="h-3.5 w-3.5" /> Levers
            </h4>
            <ul className="mt-1 divide-y divide-border">
              {actionable.map((f, i) => (
                <Row key={i} f={f} advice={factorAdvice(f)} />
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            None of this candidate&apos;s strongest factors are ones they can change directly —
            the score is driven by fixed context below.
          </p>
        )}

        {paper.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Your paper
            </h4>
            <ul className="mt-1 divide-y divide-border">
              {paper.map((f, i) => (
                <Row key={i} f={f} advice={factorAdvice(f)} />
              ))}
            </ul>
          </section>
        )}

        {fixed.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Fixed context — not advice
            </h4>
            <ul className="mt-1 divide-y divide-border">
              {fixed.map((f, i) => (
                <Row key={i} f={f} advice={null} />
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              The model uses these, but they describe circumstances rather than choices. They are
              shown for transparency, not as things to change.
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
