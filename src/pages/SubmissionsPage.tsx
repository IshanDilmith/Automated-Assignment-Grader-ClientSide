import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CloudUpload, RefreshCw, Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
import type { SubmissionSummary } from "@/lib/types";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "graded" | "flagged">("all");
  const [selected, setSelected] = useState<SubmissionSummary | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    const data = await api.submissions();
    setSubmissions(data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesQuery =
        !needle ||
        submission.id.toLowerCase().includes(needle) ||
        submission.fileName.toLowerCase().includes(needle) ||
        submission.preview.toLowerCase().includes(needle);
      const matchesFilter = filter === "all" || submission.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, submissions]);

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const content = await file.text();
      await api.uploadSubmission({ fileName: file.name, content });
      await refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Submissions" description="Browse the real files the grader reads from the submissions folder." />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="grid gap-4 pt-6">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search student id, file name, or preview text"
                />
              </div>
              <Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="graded">Graded</option>
                <option value="flagged">Flagged</option>
              </Select>
              <Button variant="outline" onClick={() => void refresh()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div
              className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-slate-50 to-cyan-50 p-5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) void handleUpload(file);
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CloudUpload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Upload submission</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Drop a `.md`, `.txt`, or `.py` file here, or choose one from your computer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.py"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void handleUpload(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" />
                    Choose file
                  </Button>
                </div>
              </div>

              {uploading ? <p className="mt-4 text-sm text-muted-foreground">Uploading file to the grader folder...</p> : null}
              {uploadError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-border bg-slate-950 p-5 text-slate-50">
              <div className="text-sm font-semibold">Submission rules</div>
              <div className="mt-3 grid gap-3 text-sm text-slate-300">
                <p>Only `.md`, `.txt`, and `.py` files are accepted by the grader.</p>
                <p>The uploaded file is saved into the backend `data/submissions` folder.</p>
                <p>Run the grader again after uploading to generate a new report.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Similarity</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{submission.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {submission.lineCount} lines | {submission.sizeBytes} bytes
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={submission.status} />
                  </TableCell>
                  <TableCell>{submission.reportGrade ?? "-"}</TableCell>
                  <TableCell>{submission.plagiarism !== null ? `${submission.plagiarism}%` : "-"}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(submission.modifiedAt), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(submission)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.fileName ?? "Submission"}
        description={selected ? `${selected.id} | ${selected.filePath}` : undefined}
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <span className="text-sm text-muted-foreground">{selected.reportGrade !== null ? `Grade ${selected.reportGrade}` : "Not graded yet"}</span>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-sm leading-6 text-slate-100">
              {selected.content}
            </pre>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
