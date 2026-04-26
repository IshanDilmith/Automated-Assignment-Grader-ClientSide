import { Badge } from "@/components/ui/badge";
import { SubmissionStatus } from "@/lib/types";

type StatusBadgeProps = {
  status: SubmissionStatus | "running" | "booting" | "done" | "failed" | "healthy";
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const map = {
    queued: { label: "Queued", variant: "default" as const },
    reviewing: { label: "Reviewing", variant: "info" as const },
    completed: { label: "Completed", variant: "success" as const },
    "needs-attention": { label: "Needs attention", variant: "warning" as const },
    pending: { label: "Pending", variant: "default" as const },
    graded: { label: "Graded", variant: "success" as const },
    flagged: { label: "Flagged", variant: "warning" as const },
    running: { label: "Running", variant: "info" as const },
    booting: { label: "Booting", variant: "info" as const },
    done: { label: "Done", variant: "success" as const },
    failed: { label: "Failed", variant: "danger" as const },
    healthy: { label: "Healthy", variant: "success" as const },
  };

  const entry = map[status];
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
