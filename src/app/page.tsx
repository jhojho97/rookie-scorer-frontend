"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, LineChart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold">
          <LineChart className="h-5 w-5 text-accent" /> RPP
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Accounting academia · ML + explainability
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Research Productivity Prediction
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
            Upload a CV and job-market paper. Get a calibrated productivity score, a transparent
            SHAP breakdown of what drove it, and the exact API cost — in one professional report.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <RoleCard
              href="/register?role=student"
              icon={<GraduationCap className="h-6 w-6" />}
              title="Student"
              body="Score your own profile and see how to strengthen it."
            />
            <RoleCard
              href="/register?role=hr"
              icon={<Users className="h-6 w-6" />}
              title="HR / Headhunter"
              body="Batch-score many candidates and rank them side by side."
            />
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function RoleCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-accent/50 hover:shadow-md"
    >
      <span className="rounded-lg bg-accent/10 p-2 text-accent">{icon}</span>
      <div>
        <div className="flex items-center gap-1 font-semibold">
          {title}
          <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </Link>
  );
}
