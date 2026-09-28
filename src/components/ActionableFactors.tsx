"use client";
import { Wrench } from "lucide-react";
import type { TopFactor } from "@/types";
import { splitFactors, factorAdvice } from "@/lib/factors";
import { displayValue, variableHelp } from "@/lib/variables";
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
          {/* The candidate's own value, not the SHAP contribution — the dot
              already carries whether it helped or hurt. */}
          {displayValue(f) != null && (
            <span className="tnum shrink-0 text-xs text-muted-foreground">{displayValue(f)}</span>
          )}
        </div>
        {variableHelp(f) && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{variableHelp(f)}</p>
        )}
        {advice && <p className="mt-1 text-xs leading-snug text-foreground/80">{advice}</p>}
      </div>
    </li>
  );
}

const cnTone = (v: number) =>
  `mt-1.5 h-2 w-2 shrink-0 rounded-full ${v >= 0 ? "bg-positive" : "bg-negative"}`;

/**
 * Turns the SHAP factor list into something a candidate can act on.
 *
 * Only the levers are shown: factors the candidate controls that LOWERED the
 * score, each with a tip. Factors that already raised the score are strengths
 * (they appear under Outstanding areas), not things to fix. The "Fixed context"
 * and "Your paper" groups were removed -- neither gave the candidate anything
 * to do, and the strongest of those factors already appear under Outstanding
 * and Lagging areas.
 */
export function ActionableFactors({ factors }: { factors: TopFactor[] }) {
  // Factors arrive sorted by |contribution|, so slicing takes the strongest.
  // Drawn from every factor that lowered the score (the API returns all of
  // them), so a lever can sit just below the five shown under Lagging areas.
  const levers = splitFactors(factors)
    .actionable.filter((f) => f.contribution < 0)
    .slice(0, 5);
  if (!factors.length) return null;

  return (
    <Card>
      <CardHeader>
        {/* Named "AI suggested" on purpose: these sentences are authored
            guidance keyed to each feature, NOT model output. SHAP contributions
            are associational, so acting on them moves a correlate, not a proven
            cause -- the heading has to carry that disclaimer. */}
        <CardTitle>AI suggested actions to improve scoring</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 text-xs leading-snug text-muted-foreground">
          <p>
            These suggestions are generated guidance based on correlation with published
            productivity in past candidates.
          </p>
          <p>
            The levers are chosen using SHAP values, which measure how much each factor pushed
            this score up or down.
          </p>
        </div>

        {levers.length > 0 ? (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Wrench className="h-3.5 w-3.5" /> Levers
            </h4>
            <ul className="mt-1 divide-y divide-border">
              {levers.map((f, i) => (
                <Row key={i} f={f} advice={factorAdvice(f)} />
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            None of the factors that lowered this score are ones you can change directly, such as
            publications, R&amp;Rs or presentations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
