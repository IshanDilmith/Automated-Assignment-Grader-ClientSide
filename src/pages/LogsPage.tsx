import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { LogSnapshot } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LogsPage() {
  const [snapshot, setSnapshot] = useState<LogSnapshot | null>(null);
  const [polling, setPolling] = useState(true);
  const preRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    let id: number | null = null;
    async function load() {
      try {
        const s = await api.logs(1000);
        setSnapshot(s);
      } catch {
        setSnapshot(null);
      }
    }

    void load();
    if (polling) {
      id = window.setInterval(load, 2000) as unknown as number;
    }

    return () => {
      if (id) window.clearInterval(id as number);
    };
  }, [polling]);

  useEffect(() => {
    if (!preRef.current) return;
    // scroll to bottom when new logs arrive
    preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [snapshot?.lines?.length]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Logs" description="Live backend execution log. Auto-scrolls to show newest output." />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Backend log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-3">
              <Button size="sm" variant={polling ? "default" : "outline"} onClick={() => setPolling((s) => !s)}>
                {polling ? "Live" : "Paused"}
              </Button>
              <div className="ml-auto text-xs text-muted-foreground">{snapshot?.filePath ?? "No log available"}</div>
            </div>

            <pre ref={preRef} className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
              {snapshot?.lines?.length ? snapshot.lines.join("\n") : "No log lines available"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
