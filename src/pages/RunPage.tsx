import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Play } from "lucide-react";
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

  useEffect(() => {
    void api.health().then(setHealth);
    void api.runStatus().then(setRunState).catch(() => null);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void api.runStatus()
        .then((state) => {
          setRunState(state);
          if (state.status !== "running") {
            setRequestingRun(false);
          }
        })
        .catch(() => null);
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  async function handleRun() {
    setRequestingRun(true);
    setError(null);
    try {
      await api.run();
      const state = await api.runStatus();
      setRunState(state);
      await api.health().then(setHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run grader");
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
    </div>
  );
}
