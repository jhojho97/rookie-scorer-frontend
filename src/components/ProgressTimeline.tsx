"use client";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export const PREDICT_STEPS = [
  "Uploading",
  "Extracting features",
  "Running ML model",
  "Generating explanations",
  "Preparing report",
] as const;

/**
 * Animated vertical timeline. `active` is the index of the in-progress step;
 * when the request resolves the caller sets active past the last step.
 */
export function ProgressTimeline({ active }: { active: number }) {
  return (
    <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
      {PREDICT_STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={label} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                done && "border-positive bg-positive text-white",
                current && "border-accent bg-accent text-accent-foreground",
                !done && !current && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : current ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            <motion.span
              initial={{ opacity: 0.5 }}
              animate={{ opacity: current || done ? 1 : 0.5 }}
              className={cn("text-sm", current && "font-medium")}
            >
              {label}
            </motion.span>
          </li>
        );
      })}
    </ol>
  );
}
