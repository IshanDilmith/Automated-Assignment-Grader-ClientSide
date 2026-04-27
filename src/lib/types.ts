export type SubmissionStatus = "pending" | "graded" | "flagged";
export type RunStatus = "idle" | "running" | "completed" | "failed";

export type HealthResponse = {
  backendRoot: string;
  submissionsFolder: string;
  rubricPath: string;
  reportsFolder: string;
  feedbacksFolder: string;
  logPath: string;
  exists: {
    backendRoot: boolean;
    submissionsFolder: boolean;
    rubricPath: boolean;
    reportsFolder: boolean;
    feedbacksFolder: boolean;
    logPath: boolean;
  };
};

export type Overview = {
  submissionCount: number;
  reportCount: number;
  feedbackCount: number;
  flaggedReports: number;
  rubricName: string;
  totalPoints: number;
  lastRunAt: string | null;
  backendReady: boolean;
};

export type SubmissionSummary = {
  id: string;
  fileName: string;
  filePath: string;
  extension: string;
  sizeBytes: number;
  lineCount: number;
  preview: string;
  content: string;
  status: SubmissionStatus;
  reportGrade: number | null;
  plagiarism: number | null;
  reportPath: string | null;
  feedbackPath: string | null;
  modifiedAt: string;
};

export type RubricCriterion = {
  maxPoints: number;
  description: string;
};

export type RubricDocument = {
  name: string;
  total_points: number;
  criteria: Record<string, RubricCriterion>;
};

export type ReportSummary = {
  id: string;
  studentId: string;
  filePath: string;
  grade: number | null;
  avgPlagiarism: number | null;
  recommendation: string;
  generatedOn: string | null;
  teacherFeedback: string;
  content: string;
  flagged: boolean;
};

export type FeedbackSummary = {
  id: string;
  studentId: string;
  fileName: string;
  filePath: string;
  content: string;
  sizeBytes: number;
  modifiedAt: string;
};

export type LogSnapshot = {
  filePath: string;
  exists: boolean;
  lines: string[];
};

export type RunResponse = {
  ok: boolean;
  studentCount: number;
  studentIds: string[];
  durationMs: number;
  backendRoot: string;
};

export type RunStartResponse = {
  ok: boolean;
  status: RunState;
  error?: string;
};

export type RunState = {
  status: "idle" | "running" | "completed" | "failed";
  stage: "idle" | "starting" | "booting" | "loading" | "grading" | "finalizing" | "done" | "failed";
  message: string;
  startedAt: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
  studentCount: number | null;
  studentIds: string[];
  backendRoot: string;
  recentOutput: string[];
};

export type UploadSubmissionResponse = {
  ok: boolean;
  fileName: string;
  filePath: string;
  sizeBytes: number;
};
