"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePredict } from "@/hooks/usePredict";
import { UploadCard } from "@/components/UploadCard";
import { ProgressTimeline, PREDICT_STEPS } from "@/components/ProgressTimeline";
import { ReportCard } from "@/components/ReportCard";
import { UsageDashboard } from "@/components/UsageDashboard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StudentDashboard() {
  const { user } = useAuth();
  const predict = usePredict();
  const [cv, setCv] = useState<File | null>(null);
  const [jmp, setJmp] = useState<File | null>(null);
  const [step, setStep] = useState(0);

  // Advance the timeline while the single request is in flight (it's one HTTP
  // call, so we pace the intermediate stages for feedback, then jump to done).
  useEffect(() => {
    if (!predict.isPending) return;
    setStep(1);
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, PREDICT_STEPS.length - 1)),
      2500,
    );
    return () => clearInterval(id);
  }, [predict.isPending]);

  useEffect(() => {
    if (predict.isSuccess) setStep(PREDICT_STEPS.length);
  }, [predict.isSuccess]);

  function onScore() {
    if (!cv) return;
    predict.mutate({ cv, jmp });
  }

  function reset() {
    predict.reset();
    setStep(0);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your research productivity report</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user?.email}. Upload your CV (and optionally your JMP) to begin.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!predict.isSuccess && (
            <Card>
              <CardHeader>
                <CardTitle>Upload documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UploadCard label="CV" file={cv} onChange={setCv} />
                <UploadCard label="Job-market paper" optional file={jmp} onChange={setJmp} />
                <Button onClick={onScore} disabled={!cv || predict.isPending} className="w-full">
                  <Sparkles className="h-4 w-4" />
                  {predict.isPending ? "Scoring…" : "Score my profile"}
                </Button>
                {predict.isError && <ErrorBanner error={predict.error} />}
              </CardContent>
            </Card>
          )}

          {predict.isPending && (
            <Card>
              <CardHeader>
                <CardTitle>Prediction progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressTimeline active={step} />
              </CardContent>
            </Card>
          )}

          {predict.isSuccess && predict.data && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={reset}>
                  Score another
                </Button>
              </div>
              <ReportCard result={predict.data} />
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
