import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, FileText, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import type { Overview, ReportSummary, RubricDocument, SubmissionSummary } from "@/lib/types";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [rubric, setRubric] = useState<RubricDocument | null>(null);

  useEffect(() => {
    void Promise.all([api.overview(), api.submissions(), api.reports(), api.rubric()]).then(
      ([overviewData, submissionData, reportData, rubricData]) => {
        setOverview(overviewData);
        setSubmissions(submissionData);
        setReports(reportData);
        setRubric(rubricData);
      },
    );
  }, []);

  const latestReport = reports[0];
  const gradedSubmissions = submissions.filter((submission) => submission.status !== "pending").length;
  const progressValue = Math.min((gradedSubmissions / Math.max(submissions.length, 1)) * 100, 100);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description="Monitor the live grading queue, review generated reports, and keep the rubric aligned with the backend."
        actionLabel="Run grader"
        actionIcon={<Play className="h-4 w-4" />}
        actionHref="/run"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Submissions" value={overview?.submissionCount ?? "-"} hint="Files in the submissions folder" accentClassName="bg-cyan-500" />
        <MetricCard label="Reports" value={overview?.reportCount ?? "-"} hint="Generated final reports" accentClassName="bg-emerald-500" />
        <MetricCard label="Flagged" value={overview?.flaggedReports ?? "-"} hint="Reports over the plagiarism threshold" accentClassName="bg-amber-500" />
        <MetricCard label="Rubric points" value={overview?.totalPoints ?? "-"} hint={overview?.rubricName ?? "Rubric loaded from backend"} accentClassName="bg-sky-500" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Latest report</CardTitle>
              <p className="text-sm text-muted-foreground">The most recent generated feedback from the local grader.</p>
            </div>
            <Link to="/reports" className="text-sm font-semibold text-primary">
              View all
            </Link>
          </CardHeader>
          <CardContent className="grid gap-4">
            {latestReport ? (
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{latestReport.studentId}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {latestReport.generatedOn ? formatDistanceToNow(new Date(latestReport.generatedOn), { addSuffix: true }) : "Recently generated"}
                    </div>
                  </div>
                  <StatusBadge status={latestReport.flagged ? "flagged" : "graded"} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Grade</div>
                    <div className="mt-1 text-2xl font-semibold">{latestReport.grade ?? "-"}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Similarity</div>
                    <div className="mt-1 text-2xl font-semibold">{latestReport.avgPlagiarism ?? "-"}%</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</div>
                    <div className="mt-1 text-sm font-semibold leading-5">{latestReport.recommendation}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{latestReport.teacherFeedback || "No teacher feedback was parsed from the report."}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                No report has been generated yet. Run the grader to populate this section.
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <Link to="/run" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
                Start grading
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/rubric" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
                Review rubric
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System status</CardTitle>
            <p className="text-sm text-muted-foreground">Backend connection and data folders.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Backend ready</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {overview?.backendReady ? "The API bridge can see the grader folders." : "The bridge cannot see all required folders yet."}
                  </div>
                </div>
                <StatusBadge status={overview?.backendReady ? "healthy" : "failed"} />
              </div>
              <Separator className="my-4" />
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Last run</span>
                  <span>{overview?.lastRunAt ? formatDistanceToNow(new Date(overview.lastRunAt), { addSuffix: true }) : "No log yet"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Reports flagged</span>
                  <span>{overview?.flaggedReports ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Rubric</span>
                  <span className="truncate text-right">{overview?.rubricName ?? "Loading..."}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="h-4 w-4" />
                Submission load
              </div>
              <Progress value={progressValue} className="mt-3" />
              <div className="mt-2 text-sm text-muted-foreground">
                {gradedSubmissions} of {submissions.length} submissions have generated reports.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                Active rubric
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {rubric ? `${rubric.name} with ${Object.keys(rubric.criteria ?? {}).length} criteria.` : "Loading rubric details..."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent submissions</CardTitle>
              <p className="text-sm text-muted-foreground">Fresh files waiting to be graded or already processed.</p>
            </div>
            <Link to="/submissions" className="text-sm font-semibold text-primary">
              Open queue
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {submissions.slice(0, 4).map((submission) => (
              <div key={submission.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{submission.id}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{submission.fileName}</div>
                  </div>
                  <StatusBadge status={submission.status} />
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{submission.preview || "No preview available."}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Report history</CardTitle>
              <p className="text-sm text-muted-foreground">Generated documents written by the grader.</p>
            </div>
            <Link to="/reports" className="text-sm font-semibold text-primary">
              Open reports
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {reports.slice(0, 4).map((report) => (
              <div key={report.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{report.studentId}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Grade {report.grade ?? "-"} | Similarity {report.avgPlagiarism ?? "-"}%
                    </div>
                  </div>
                  <StatusBadge status={report.flagged ? "flagged" : "graded"} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{report.teacherFeedback || report.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
