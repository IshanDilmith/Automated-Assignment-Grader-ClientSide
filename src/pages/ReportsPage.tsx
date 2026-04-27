import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, FileText, Info, LayoutList, MessageSquare, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import type { ReportSummary } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<ReportSummary | null>(null);

  useEffect(() => {
    void api.reports().then(setReports);
  }, []);

  function parseDetailedReport(content: string) {
    const rubricMatch = content.match(/## Rubric Breakdown:\s*\r?\n(\{[\s\S]*?\})\r?\n/i);
    const justificationMatch = content.match(/## Score Justification:\s*\r?\n(\{[\s\S]*?\})\r?\n/i);
    const detailedPlagiarismMatch = content.match(/Detailed comparison:\s*\r?\n(\{[\s\S]*?\})\r?\n/i);

    let rubricScores: Record<string, number> = {};
    if (rubricMatch) {
      try {
        rubricScores = JSON.parse(rubricMatch[1]);
      } catch (e) {
        console.error("Failed to parse rubric JSON", e);
      }
    }

    let justification: Record<string, string> = {};
    if (justificationMatch) {
      try {
        justification = JSON.parse(justificationMatch[1]);
      } catch (e) {
        console.error("Failed to parse justification JSON", e);
      }
    }

    let plagiarismDetails: Record<string, number> = {};
    if (detailedPlagiarismMatch) {
      try {
        plagiarismDetails = JSON.parse(detailedPlagiarismMatch[1]);
      } catch (e) {
        console.error("Failed to parse plagiarism JSON", e);
      }
    }

    return { rubricScores, justification, plagiarismDetails };
  }

  const detailed = selected ? parseDetailedReport(selected.content) : null;
  const hasFeedback = selected?.teacherFeedback && selected.teacherFeedback.trim().length > 0;

  return (
    <div className="grid gap-6">
      <PageHeader title="Reports" description="Inspect final grading reports written by the grader." />

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="text-sm text-muted-foreground">
            Showing {reports.length} report{reports.length !== 1 ? "s" : ""}
          </div>
          <div className="grid gap-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="group rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{report.studentId}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {report.generatedOn ? formatDistanceToNow(new Date(report.generatedOn), { addSuffix: true }) : "Generated recently"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={report.flagged ? "flagged" : "graded"} />
                    <Button variant="outline" size="sm" onClick={() => setSelected(report)}>
                      View details
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Final Grade</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900">{report.grade ?? "-"}</span>
                      <span className="text-sm font-medium text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Similarity</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${report.avgPlagiarism && report.avgPlagiarism > 30 ? "text-red-600" : "text-green-600"}`}>
                        {report.avgPlagiarism ?? "-"}%
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {report.flagged ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {report.recommendation}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `Report — ${selected.studentId}` : "Report"}
        description={selected?.filePath}
      >
        {selected && detailed ? (
          <div className="grid gap-6">
            {/* Header Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-slate-50 p-4 text-center">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final Grade</div>
                <div className="mt-2 text-3xl font-bold text-indigo-600">{selected.grade ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-border bg-slate-50 p-4 text-center">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Similarity</div>
                <div className={`mt-2 text-3xl font-bold ${selected.avgPlagiarism && selected.avgPlagiarism > 30 ? "text-red-600" : "text-green-600"}`}>
                  {selected.avgPlagiarism ?? "-"}%
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LayoutList className="h-4 w-4 text-indigo-500" />
                Rubric Breakdown
              </div>
              <div className="rounded-xl border border-border p-4 space-y-5">
                {Object.entries(detailed.rubricScores).map(([criterion, score]) => (
                  <div key={criterion} className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{criterion}</span>
                      <span className="text-indigo-600 font-bold">{score} pts</span>
                    </div>
                    <Progress value={score} className="h-1.5" />
                    {detailed.justification[criterion] && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-slate-50 p-2 rounded-md border border-slate-100">
                        {detailed.justification[criterion]}
                      </p>
                    )}
                  </div>
                ))}
                {Object.keys(detailed.rubricScores).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No rubric scores found in report.</p>
                )}
              </div>
            </div>

            {/* Teacher Feedback */}
            {hasFeedback && (
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                  Teacher Feedback
                </div>
                <div className="rounded-xl border border-border bg-indigo-50/30 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {selected.teacherFeedback}
                </div>
              </div>
            )}

            {/* Plagiarism details */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="h-4 w-4 text-indigo-500" />
                Similarity Details
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="space-y-2">
                  {Object.entries(detailed.plagiarismDetails).map(([sid, sim]) => (
                    <div key={sid} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Compared to {sid}</span>
                      <span className={`font-bold ${sim > 30 ? "text-red-600" : "text-slate-900"}`}>{sim}%</span>
                    </div>
                  ))}
                  {Object.keys(detailed.plagiarismDetails).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No comparison details available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className={`flex items-start gap-3 rounded-xl p-4 ${selected.flagged ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}>
              <Info className={`mt-0.5 h-4 w-4 shrink-0 ${selected.flagged ? "text-red-500" : "text-green-500"}`} />
              <div className="text-sm">
                <div className={`font-semibold ${selected.flagged ? "text-red-900" : "text-green-900"}`}>Recommendation</div>
                <div className={`mt-1 ${selected.flagged ? "text-red-700" : "text-green-700"}`}>{selected.recommendation}</div>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
