import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void api.health().then(setHealth);
  }, []);

  function copyText(value: string, label: string) {
    void navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" description="Show the local bridge configuration and the grader paths the API is currently using." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bridge connection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border bg-white p-4 text-sm">
              <div className="font-semibold">API bridge</div>
              <div className="mt-1 text-muted-foreground">Runs locally on `http://localhost:8787` and proxies through Vite.</div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 text-sm">
              <div className="font-semibold">Backend root</div>
              <div className="mt-1 break-all text-muted-foreground">{health?.backendRoot ?? "Loading..."}</div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 text-sm">
              <div className="font-semibold">Submissions folder</div>
              <div className="mt-1 break-all text-muted-foreground">{health?.submissionsFolder ?? "Loading..."}</div>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => health && copyText(health.submissionsFolder, "submissions folder")}>
                  Copy path
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 text-sm">
              <div className="font-semibold">Rubric file</div>
              <div className="mt-1 break-all text-muted-foreground">{health?.rubricPath ?? "Loading..."}</div>
            </div>
            {copied ? <p className="text-xs text-muted-foreground">Copied {copied}.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
