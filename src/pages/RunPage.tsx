import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Play, X } from "lucide-react";
import { api } from "@/lib/api";
import type { HealthResponse, RunState } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function RunPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [requestingRun, setRequestingRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    void api.health().then(setHealth);
    void api.runStatus().then(setRunState).catch(() => null);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void api.runStatus()
        .then((state) => {
          // Detect completion
          if (runState?.status === "running" && state.status === "completed") {
            setToast({ message: "Grader run completed successfully!", type: "success" });
          } else if (runState?.status === "running" && state.status === "failed") {
            setToast({ message: "Grader run failed.", type: "error" });
          }

          setRunState(state);
          if (state.status !== "running") {
            setRequestingRun(false);
          }
        })
        .catch(() => null);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [runState?.status]);

  async function handleRun() {
    setRequestingRun(true);
    setError(null);
    try {
      const response = await api.run();
      if (response.error) {
        setError(response.error);
        setToast({ message: response.error, type: "error" });
        setRequestingRun(false);
        return;
      }
      const state = await api.runStatus();
      setRunState(state);
      await api.health().then(setHealth);
      setToast({ message: "Grader started...", type: "info" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to run grader";
      setError(msg);
      setToast({ message: msg, type: "error" });
      setRequestingRun(false);
    }
  }

  const statusTone =
    runState?.status === "completed"
      ? "healthy"
      : runState?.status === "failed"
        ? "failed"
        : runState?.status === "running" || runState?.stage === "booting"
          ? "running"
          : "healthy";
  const isBusy = requestingRun || runState?.status === "running";

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Run grader"
        description="Trigger the Python pipeline locally and let the backend regenerate reports from the submissions folder."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline control</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Local bridge</div>
                  <div className="mt-1 text-sm text-muted-foreground">The UI talks to the API bridge on port 8787.</div>
                </div>
                <StatusBadge status={health ? (health.exists.backendRoot ? "healthy" : "failed") : "running"} />
              </div>
              <Separator className="my-4" />
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Backend root</span>
                  <span className="truncate text-right">{health?.backendRoot ?? "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Submissions</span>
                  <span className="truncate text-right">{health?.submissionsFolder ?? "Loading..."}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Rubric</span>
                  <span className="truncate text-right">{health?.rubricPath ?? "Loading..."}</span>
                </div>
              </div>
            </div>

            <Button onClick={() => void handleRun()} disabled={isBusy}>
              {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isBusy ? "Running..." : "Run grader now"}
            </Button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Live run status</div>
                  <div className="mt-1 text-lg font-semibold">{runState?.message ?? "Ready to run"}</div>
                </div>
                <StatusBadge status={statusTone} />
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {runState?.status === "running" ? (
                    <Clock3 className="h-4 w-4" />
                  ) : runState?.status === "failed" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span className="capitalize">{runState?.stage ?? "idle"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Started</span>
                  <span className="truncate text-right">{runState?.startedAt ?? "Not started"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="truncate text-right">{runState?.updatedAt ?? "Not started"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Students processed</span>
                  <span className="truncate text-right">{runState?.studentCount ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="truncate text-right">{runState?.durationMs ? `${runState.durationMs} ms` : "—"}</span>
                </div>
              </div>

              {runState?.error ? <p className="mt-3 text-sm text-red-600">{runState.error}</p> : null}

              <div className="mt-4 rounded-lg border border-border bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent output</div>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                  {(runState?.recentOutput?.length ? runState.recentOutput : ["Waiting for run output..."]).join("\n")}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>The runner imports your existing Python pipeline and writes fresh reports back into `data/final_reports`.</p>
            <p>Use this page when you want to regenerate the grading artifacts without leaving the frontend.</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${
            toast.type === "success" ? "border-green-100 bg-green-50/90 text-green-900" :
            toast.type === "error" ? "border-red-100 bg-red-50/90 text-red-900" :
            "border-blue-100 bg-blue-50/90 text-blue-900"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
             toast.type === "error" ? <AlertCircle className="h-5 w-5 text-red-500" /> :
             <Clock3 className="h-5 w-5 text-blue-500" />}
            <div className="text-sm font-medium">{toast.message}</div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full hover:bg-black/5" 
              onClick={() => setToast(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
