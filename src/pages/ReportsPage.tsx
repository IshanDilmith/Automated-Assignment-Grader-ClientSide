import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import type { ReportSummary } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

export function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<ReportSummary | null>(null);

  useEffect(() => {
    void api.reports().then(setReports);
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader title="Reports" description="Inspect final grading reports written by the grader." />

      <Card>
        <CardContent className="grid gap-3 pt-6">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{report.studentId}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {report.generatedOn ? formatDistanceToNow(new Date(report.generatedOn), { addSuffix: true }) : "Generated recently"}
                  </div>
                </div>
                <StatusBadge status={report.flagged ? "flagged" : "graded"} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Grade</div>
                  <div className="mt-1 text-2xl font-semibold">{report.grade ?? "-"}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Similarity</div>
                  <div className="mt-1 text-2xl font-semibold">{report.avgPlagiarism ?? "-"}%</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</div>
                  <div className="mt-1 text-sm font-semibold leading-5">{report.recommendation}</div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setSelected(report)}>
                  View report
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.studentId ?? "Report"}
        description={selected?.filePath}
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.flagged ? "flagged" : "graded"} />
              <span className="text-sm text-muted-foreground">
                Grade {selected.grade ?? "-"} | Similarity {selected.avgPlagiarism ?? "-"}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{selected.teacherFeedback || "No teacher feedback was parsed from the report."}</p>
            <pre className="max-h-[480px] overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
              {selected.content}
            </pre>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
