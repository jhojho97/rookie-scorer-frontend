"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Extraction } from "@/types";
import { cn } from "@/lib/cn";

/** Collapsible view of the structured features the backend extracted from the CV. */
export function FeatureAccordion({ extraction }: { extraction: Extraction }) {
  const [open, setOpen] = useState(false);

  const rows: [string, unknown][] = [
    ["PhD institution", extraction.phd],
    ["Research area", extraction.research_area],
    ["Published papers", extraction.num_published],
    ["Awards", extraction.num_awards],
    ["CV characters parsed", extraction.cv_chars],
    ["JMP characters parsed", extraction.jmp_chars],
  ];

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-sm font-medium"
      >
        Extracted CV / JMP features
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <dl className="divide-y divide-border border-t border-border">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tnum text-right">
                    {v == null || v === "" ? <span className="text-muted-foreground">—</span> : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
