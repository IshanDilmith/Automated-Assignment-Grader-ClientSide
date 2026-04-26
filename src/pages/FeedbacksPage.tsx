import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareText, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { FeedbackSummary } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

export function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackSummary[]>([]);
  const [selected, setSelected] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.feedbacks();
      setFeedbacks(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Feedbacks"
        description="View the draft feedback generated for each student by the grading pipeline."
      />

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {feedbacks.length} feedback{feedbacks.length !== 1 ? "s" : ""} available
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {loading && feedbacks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Loading feedbacks...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No feedbacks have been generated yet. Run the grader to create draft feedback for each student.
            </div>
          ) : (
            <div className="grid gap-3">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="group rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                        <MessageSquareText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{feedback.studentId}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {feedback.fileName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {feedback.sizeBytes} bytes
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(feedback.modifiedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-gradient-to-br from-slate-50 to-violet-50 p-4">
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {feedback.content.length > 300
                        ? `${feedback.content.slice(0, 300)}…`
                        : feedback.content}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setSelected(feedback)}>
                      View full feedback
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `Feedback — ${selected.studentId}` : "Feedback"}
        description={selected?.filePath}
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                Draft Feedback
              </span>
              <span>{selected.fileName}</span>
              <span>·</span>
              <span>{selected.sizeBytes} bytes</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(selected.modifiedAt), { addSuffix: true })}</span>
            </div>
            <div className="max-h-[480px] overflow-auto rounded-xl border border-border bg-gradient-to-br from-slate-50 to-violet-50 p-5">
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                {selected.content}
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
