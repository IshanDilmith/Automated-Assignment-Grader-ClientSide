import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CloudUpload, RefreshCw, Search, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
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
  const [uploadToast, setUploadToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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

  async function handleUpload(files: FileList | File[]) {
    setUploadError(null);
    setUploading(true);
    let successCount = 0;
    try {
      for (const file of Array.from(files)) {
        const lower = file.name.toLowerCase();
        const isBinary = /\.(pdf|docx|doc)$/i.test(lower);

        if (isBinary) {
          const dataUrl = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string | ArrayBuffer | null);
            fr.onerror = (e) => reject(e);
            fr.readAsDataURL(file);
          });

          if (typeof dataUrl !== "string") throw new Error(`Failed to read binary file: ${file.name}`);
          const commaIndex = dataUrl.indexOf(",");
          const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
          await api.uploadSubmission({ fileName: file.name, content: base64, isBinary: true });
        } else {
          const content = await file.text();
          await api.uploadSubmission({ fileName: file.name, content, isBinary: false });
        }
        successCount++;
      }

      await refresh();
      setUploadToast({ 
        message: successCount > 1 ? `Successfully uploaded ${successCount} files` : `Uploaded ${Array.from(files)[0].name}`, 
        type: "success" 
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      setUploadError(msg);
      setUploadToast({ message: msg, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!uploadToast) return;
    const t = setTimeout(() => setUploadToast(null), 5000);
    return () => clearTimeout(t);
  }, [uploadToast]);

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
                const files = event.dataTransfer.files;
                if (files && files.length > 0) void handleUpload(files);
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
                      Drop one or more `.md`, `.txt`, `.py`, `.pdf`, or `.docx` files here, or choose from your computer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".md,.txt,.py,.pdf,.docx"
                    className="hidden"
                    onChange={(event) => {
                      const files = event.currentTarget.files;
                      if (files && files.length > 0) void handleUpload(files);
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
                    Choose files
                  </Button>
                </div>
              </div>

              {uploading ? <p className="mt-4 text-sm text-muted-foreground">Uploading files to the grader folder...</p> : null}
              {uploadError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-border bg-slate-950 p-5 text-slate-50">
              <div className="text-sm font-semibold">Submission rules</div>
              <div className="mt-3 grid gap-3 text-sm text-slate-300">
                <p>Supported submission types: `.md`, `.txt`, `.py`, `.pdf`, and `.docx` (PDF/DOCX text is extracted for grading).</p>
                <p>The uploaded file is saved into the backend `data/submissions` folder.</p>
                <p>Run the grader again after uploading to generate a new report.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload toast */}
      {uploadToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${
            uploadToast.type === "success" ? "border-green-100 bg-green-50/90 text-green-900" : "border-red-100 bg-red-50/90 text-red-900"
          }`}>
            {uploadToast.type === "success" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
            <div className="text-sm font-medium">{uploadToast.message}</div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-black/5"
              onClick={() => setUploadToast(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

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
