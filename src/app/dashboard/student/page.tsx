"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBatchJob } from "@/hooks/useBatchJob";
import { UploadCard } from "@/components/UploadCard";
import { ReportCard } from "@/components/ReportCard";
import { UsageDashboard } from "@/components/UsageDashboard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { JobProgress } from "@/components/JobProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Single-candidate scoring runs through the backend's async JOB flow (submit ->
 * poll /jobs). The heavy work happens on the server, so we only make quick calls
 * and sidestep Vercel's function time limit. Per request, we surface a single
 * "Running" state until the report is ready — no intermediate statuses.
 */
export default function StudentDashboard() {
  const { user } = useAuth();
  const { submit, job, reset, progress, running, coldStart, etaSeconds } = useBatchJob();
  const [cv, setCv] = useState<File | null>(null);
  const [jmp, setJmp] = useState<File | null>(null);

  const done = job.data?.status === "done";
  const result = job.data?.results?.[0];
  const failed = submit.isError || job.data?.status === "error" || result?.status === "error";
  const failMsg =
    (submit.error as Error | undefined)?.message ||
    result?.reason ||
    job.data?.reason ||
    "Scoring failed.";
  const showReport = done && result && result.status !== "error";

  function onScore() {
    if (!cv) return;
    submit.mutate({ kind: "rows", rows: [{ id: "me", name: "Your profile", cv, jmp }] });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Your research productivity report</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user?.email}. Upload your CV (and optionally your JMP) to begin.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!done && !running && (
            <Card>
              <CardHeader>
                <CardTitle>Upload documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UploadCard label="CV" file={cv} onChange={setCv} />
                <UploadCard label="Job-market paper" optional file={jmp} onChange={setJmp} />
                <Button onClick={onScore} disabled={!cv} className="w-full">
                  <Sparkles className="h-4 w-4" />
                  Score my profile
                </Button>
                {failed && <ErrorBanner error={new Error(failMsg)} />}
              </CardContent>
            </Card>
          )}

          {running && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <JobProgress
                  done={progress.done}
                  total={progress.total}
                  coldStart={coldStart}
                  etaSeconds={etaSeconds}
                  unit="profile"
                />
              </CardContent>
            </Card>
          )}

          {showReport && result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={reset}>
                  Score another
                </Button>
              </div>
              <ReportCard result={result} variant="student" />
            </motion.div>
          )}

          {done && !showReport && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <ErrorBanner error={new Error(failMsg)} />
                <Button variant="outline" size="sm" onClick={reset}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <UsageDashboard />
        </div>
      </div>
    </div>
  );
}
