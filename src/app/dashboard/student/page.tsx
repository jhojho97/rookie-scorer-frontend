"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBatchJob } from "@/hooks/useBatchJob";
import { UploadCard } from "@/components/UploadCard";
import { ProgressTimeline, PREDICT_STEPS } from "@/components/ProgressTimeline";
import { ReportCard } from "@/components/ReportCard";
import { UsageDashboard } from "@/components/UsageDashboard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Single-candidate scoring runs through the backend's async JOB flow (submit ->
 * job_id -> poll /jobs). The heavy work happens on Render in the background, so
 * we only ever make quick requests — this sidesteps Vercel's 60s function limit
 * that a synchronous /predict would hit for a real (multi-LLM-call) scoring.
 */
export default function StudentDashboard() {
  const { user } = useAuth();
  const { submit, job, reset } = useBatchJob();
  const [cv, setCv] = useState<File | null>(null);
  const [jmp, setJmp] = useState<File | null>(null);
  const [step, setStep] = useState(0);

  const running = submit.isPending || job.data?.status === "running";
  const done = job.data?.status === "done";
  const result = job.data?.results?.[0];
  const jobError = job.data?.status === "error" ? job.data?.reason : undefined;
  const resultError = result?.status === "error" ? result.reason : undefined;

  // Pace the timeline while the job runs (poll-driven), then jump to done.
  useEffect(() => {
    if (!running) return;
    setStep((s) => Math.max(s, 1));
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PREDICT_STEPS.length - 1)), 2500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (done) setStep(PREDICT_STEPS.length);
  }, [done]);

  function onScore() {
    if (!cv) return;
    setStep(1);
    submit.mutate([{ id: "me", name: "Your profile", cv, jmp }]);
  }

  function startOver() {
    reset();
    setStep(0);
  }

  const showReport = done && result && result.status !== "error";

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
          {!done && (
            <Card>
              <CardHeader>
                <CardTitle>Upload documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UploadCard label="CV" file={cv} onChange={setCv} />
                <UploadCard label="Job-market paper" optional file={jmp} onChange={setJmp} />
                <Button onClick={onScore} disabled={!cv || running} className="w-full">
                  <Sparkles className="h-4 w-4" />
                  {running ? "Scoring…" : "Score my profile"}
                </Button>
                {submit.isError && <ErrorBanner error={submit.error} />}
                {job.isError && <ErrorBanner error={job.error} />}
              </CardContent>
            </Card>
          )}

          {running && (
            <Card>
              <CardHeader>
                <CardTitle>Prediction progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressTimeline active={step} />
                <p className="mt-4 text-xs text-muted-foreground">
                  Scoring runs on the server — this can take up to a minute. You can leave this tab open.
                </p>
              </CardContent>
            </Card>
          )}

          {done && !showReport && (
            <Card>
              <CardContent className="space-y-4 p-5">
                <ErrorBanner error={new Error(resultError || jobError || "Scoring failed.")} />
                <Button variant="outline" size="sm" onClick={startOver}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {showReport && result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={startOver}>
                  Score another
                </Button>
              </div>
              <ReportCard result={result} />
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <UsageDashboard />
        </div>
      </div>
    </div>
  );
}
