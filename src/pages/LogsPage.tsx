import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { LogSnapshot } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

export function LogsPage() {
  const [snapshot, setSnapshot] = useState<LogSnapshot | null>(null);
  const [lineCount, setLineCount] = useState(200);

  async function loadLogs(lines = lineCount) {
    const result = await api.logs(lines);
    setSnapshot(result);
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Logs"
        description="Read the grader execution log that the Python backend writes while it runs."
      />

      <Card>
        <CardContent className="grid grid-cols-3 gap-3 pt-6">
          <Select className="max-w-xs" value={lineCount} onChange={(event) => setLineCount(Number(event.target.value))}>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </Select>
          <div className="text-sm text-muted-foreground">
            {snapshot?.exists ? snapshot.filePath : "Log file not found yet"}
          </div>
          <Button className="max-w-32 ml-auto" variant="outline" onClick={() => void loadLogs()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {(snapshot?.lines ?? ["No logs loaded yet."]).join("\n")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
