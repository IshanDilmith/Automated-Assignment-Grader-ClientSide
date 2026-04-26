import type {
  FeedbackSummary,
  HealthResponse,
  LogSnapshot,
  Overview,
  ReportSummary,
  RubricDocument,
  RunResponse,
  RunStartResponse,
  RunState,
  SubmissionSummary,
  UploadSubmissionResponse,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  overview: () => request<Overview>("/api/overview"),
  submissions: () => request<SubmissionSummary[]>("/api/submissions"),
  submission: (id: string) => request<SubmissionSummary>(`/api/submissions/${encodeURIComponent(id)}`),
  rubric: () => request<RubricDocument>("/api/rubric"),
  saveRubric: (payload: RubricDocument) =>
    request<RubricDocument>("/api/rubric", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  reports: () => request<ReportSummary[]>("/api/reports"),
  report: (id: string) => request<ReportSummary>(`/api/reports/${encodeURIComponent(id)}`),
  feedbacks: () => request<FeedbackSummary[]>("/api/feedbacks"),
  feedback: (id: string) => request<FeedbackSummary>(`/api/feedbacks/${encodeURIComponent(id)}`),
  logs: (lines = 200) => request<LogSnapshot>(`/api/logs?lines=${lines}`),
  run: () => request<RunStartResponse>("/api/run", { method: "POST" }),
  runStatus: () => request<RunState>("/api/run/status"),
  uploadSubmission: (payload: { fileName: string; content: string }) =>
    request<UploadSubmissionResponse>("/api/submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
