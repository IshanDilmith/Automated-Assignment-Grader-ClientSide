import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const FRONTEND_ROOT = process.cwd();

async function discoverBackendRoot() {
  if (process.env.AAG_BACKEND_ROOT) {
    return path.resolve(process.env.AAG_BACKEND_ROOT);
  }

  const parentDir = path.resolve(FRONTEND_ROOT, "..");
  const candidates = await readdir(parentDir, { withFileTypes: true });

  for (const entry of candidates) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(parentDir, entry.name);
    if (
      existsSync(path.join(candidate, "main.py")) &&
      existsSync(path.join(candidate, "requirements.txt")) &&
      existsSync(path.join(candidate, "data", "rubric.json"))
    ) {
      return candidate;
    }
  }

  return path.resolve(parentDir, "Automated Assignment Grader");
}

const BACKEND_ROOT = await discoverBackendRoot();

const DATA_ROOT = path.join(BACKEND_ROOT, "data");
const SUBMISSIONS_DIR = path.join(DATA_ROOT, "submissions");
const REPORTS_DIR = path.join(DATA_ROOT, "final_reports");
const FEEDBACKS_DIR = path.join(DATA_ROOT, "feedbacks");
const RUBRIC_PATH = path.join(DATA_ROOT, "rubric.json");
const LOG_PATH = path.join(BACKEND_ROOT, "logs", "execution.log");
const RUNNER_SCRIPT = path.join(FRONTEND_ROOT, "scripts", "run_grader.py");
const PORT = Number(process.env.AAG_API_PORT ?? 8787);
const RUN_LOG_LIMIT = 20;
const RUN_TIMEOUT_MS = Number(process.env.AAG_RUN_TIMEOUT_MS ?? 600000);

const runState = {
  status: "idle",
  stage: "idle",
  message: "Ready to run",
  startedAt: null,
  updatedAt: null,
  finishedAt: null,
  durationMs: null,
  error: null,
  studentCount: null,
  studentIds: [],
  backendRoot: BACKEND_ROOT,
  recentOutput: [],
};

let runHeartbeat = null;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function updateHeartbeat() {
  if (!runState.startedAt || runState.status !== "running") return;
  const elapsed = Date.now() - new Date(runState.startedAt).getTime();
  if (runState.stage === "starting" && elapsed > 15000) {
    runState.stage = "booting";
  }

  const baseMessage =
    runState.stage === "booting"
      ? "Booting the Python grader runtime..."
      : runState.stage === "loading"
        ? "Loading submissions from disk..."
        : runState.stage === "grading"
          ? "Running the grading pipeline..."
          : runState.stage === "finalizing"
            ? "Writing the final summary..."
            : "Starting the grader...";
  runState.message = `${baseMessage} (${formatDuration(elapsed)} elapsed)`;
  runState.updatedAt = new Date().toISOString();
}

function startRunHeartbeat() {
  clearInterval(runHeartbeat);
  runHeartbeat = setInterval(updateHeartbeat, 10000);
}

function stopRunHeartbeat() {
  clearInterval(runHeartbeat);
  runHeartbeat = null;
}

function setRunState(patch) {
  Object.assign(runState, patch, { updatedAt: new Date().toISOString() });
}

function pushRunOutput(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed) return;
  runState.recentOutput = [...runState.recentOutput, trimmed].slice(-RUN_LOG_LIMIT);
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function text(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function sanitizeSubmissionFileName(fileName) {
  const base = path.basename(String(fileName || "")).trim();
  if (!base || base !== fileName) {
    throw new Error("Invalid submission file name.");
  }
  if (!/\.(txt|md|py)$/i.test(base)) {
    throw new Error("Only .txt, .md, and .py submission files are supported.");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(base)) {
    throw new Error("Submission file name contains unsupported characters.");
  }
  return base;
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function parseReport(content) {
  const gradeMatch = content.match(/## Final Grade:\s*([0-9]+(?:\.[0-9]+)?)\/100/i);
  const plagiarismMatch = content.match(/Average similarity:\s*([0-9]+(?:\.[0-9]+)?)%/i);
  const generatedMatch = content.match(/Generated on:\s*(.+)/i);
  const recommendationMatch = content.match(/## Recommendation:\s*\n([\s\S]*?)\n---/i);
  const feedbackMatch = content.match(/## Teacher Feedback:\s*\n([\s\S]*?)\n\n## Recommendation:/i);

  return {
    grade: gradeMatch ? Number(gradeMatch[1]) : null,
    avgPlagiarism: plagiarismMatch ? Number(plagiarismMatch[1]) : null,
    generatedOn: generatedMatch ? generatedMatch[1].trim() : null,
    recommendation: recommendationMatch ? recommendationMatch[1].trim() : "Unknown",
    teacherFeedback: feedbackMatch ? feedbackMatch[1].trim() : "",
  };
}

function deriveSubmissionStatus(report) {
  if (!report) return "pending";
  if (report.avgPlagiarism !== null && report.avgPlagiarism > 30) return "flagged";
  return "graded";
}

async function fileLines(filePath) {
  const content = await readFile(filePath, "utf-8");
  return content.split(/\r?\n/);
}

async function buildRubric() {
  const rubric = await readJson(RUBRIC_PATH);
  if (!rubric.criteria || typeof rubric.criteria !== "object") {
    return rubric;
  }
  return rubric;
}

async function getReportMap() {
  const entries = await readdir(REPORTS_DIR, { withFileTypes: true }).catch(() => []);
  const map = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith("_final_report.md")) continue;
    const reportPath = path.join(REPORTS_DIR, entry.name);
    const content = await readFile(reportPath, "utf-8");
    const parsed = parseReport(content);
    const studentId = entry.name.replace(/_final_report\.md$/i, "");
    map.set(studentId, {
      id: studentId,
      studentId,
      filePath: reportPath,
      content,
      ...parsed,
      flagged: parsed.avgPlagiarism !== null ? parsed.avgPlagiarism > 30 : false,
    });
  }
  return map;
}

async function listSubmissions() {
  const reportMap = await getReportMap();
  const entries = await readdir(SUBMISSIONS_DIR, { withFileTypes: true }).catch(() => []);
  const submissions = [];

  for (const entry of entries) {
    if (!entry.isFile() || !/\.(md|txt|py)$/i.test(entry.name)) continue;
    const filePath = path.join(SUBMISSIONS_DIR, entry.name);
    const content = await readFile(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const studentId = path.parse(entry.name).name;
    const report = reportMap.get(studentId);
    const stats = await stat(filePath);

    submissions.push({
      id: studentId,
      fileName: entry.name,
      filePath,
      extension: path.extname(entry.name),
      sizeBytes: stats.size,
      lineCount: lines.length,
      preview: lines.slice(0, 6).join("\n").trim(),
      content,
      status: deriveSubmissionStatus(report),
      reportGrade: report?.grade ?? null,
      plagiarism: report?.avgPlagiarism ?? null,
      reportPath: report?.filePath ?? null,
      feedbackPath: report?.teacherFeedback ? path.join(FEEDBACKS_DIR, `${studentId}_draft_feedback.md`) : null,
      modifiedAt: stats.mtime.toISOString(),
    });
  }

  return submissions.sort((a, b) => a.id.localeCompare(b.id));
}

async function listReports() {
  const reportMap = await getReportMap();
  return Array.from(reportMap.values()).sort((a, b) => {
    const aTime = a.generatedOn ? new Date(a.generatedOn).getTime() : 0;
    const bTime = b.generatedOn ? new Date(b.generatedOn).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.studentId.localeCompare(b.studentId);
  });
}

async function listFeedbacks() {
  const entries = await readdir(FEEDBACKS_DIR, { withFileTypes: true }).catch(() => []);
  const feedbacks = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith("_draft_feedback.md")) continue;
    const filePath = path.join(FEEDBACKS_DIR, entry.name);
    const content = await readFile(filePath, "utf-8");
    const studentId = entry.name.replace(/_draft_feedback\.md$/i, "");
    const stats = await stat(filePath);

    feedbacks.push({
      id: studentId,
      studentId,
      fileName: entry.name,
      filePath,
      content,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  }

  return feedbacks.sort((a, b) => a.studentId.localeCompare(b.studentId));
}

async function tailLog(lineCount) {
  const exists = existsSync(LOG_PATH);
  if (!exists) {
    return { filePath: LOG_PATH, exists: false, lines: [] };
  }

  const lines = await fileLines(LOG_PATH);
  return {
    filePath: LOG_PATH,
    exists: true,
    lines: lines.slice(Math.max(0, lines.length - lineCount)),
  };
}

async function getHealth() {
  return {
    backendRoot: BACKEND_ROOT,
    submissionsFolder: SUBMISSIONS_DIR,
    rubricPath: RUBRIC_PATH,
    reportsFolder: REPORTS_DIR,
    feedbacksFolder: FEEDBACKS_DIR,
    logPath: LOG_PATH,
    exists: {
      backendRoot: existsSync(BACKEND_ROOT),
      submissionsFolder: existsSync(SUBMISSIONS_DIR),
      rubricPath: existsSync(RUBRIC_PATH),
      reportsFolder: existsSync(REPORTS_DIR),
      feedbacksFolder: existsSync(FEEDBACKS_DIR),
      logPath: existsSync(LOG_PATH),
    },
  };
}

async function getOverview() {
  const rubric = await buildRubric();
  const reports = await listReports();
  const submissions = await listSubmissions();
  const logStat = existsSync(LOG_PATH) ? await stat(LOG_PATH) : null;

  return {
    submissionCount: submissions.length,
    reportCount: reports.length,
    feedbackCount: (await readdir(FEEDBACKS_DIR).catch(() => [])).filter((name) => /\.md$/i.test(name)).length,
    flaggedReports: reports.filter((report) => report.flagged).length,
    rubricName: rubric.name ?? "Unnamed rubric",
    totalPoints: rubric.total_points ?? 100,
    lastRunAt: logStat ? logStat.mtime.toISOString() : null,
    backendReady: existsSync(BACKEND_ROOT) && existsSync(SUBMISSIONS_DIR) && existsSync(RUBRIC_PATH),
  };
}

function pythonExecutable() {
  const candidates = [
    path.join(BACKEND_ROOT, ".venv", "Scripts", "python.exe"),
    path.join(BACKEND_ROOT, ".venv", "bin", "python"),
    process.env.PYTHON,
    "python",
  ].filter(Boolean);

  return candidates.find((candidate) => typeof candidate === "string" && (candidate === "python" || existsSync(candidate))) ?? "python";
}

function runPythonGrader() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonExecutable(),
      [RUNNER_SCRIPT, "--backend-root", BACKEND_ROOT, "--submissions-folder", SUBMISSIONS_DIR, "--rubric-path", RUBRIC_PATH],
      {
        cwd: BACKEND_ROOT,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stderr = "";
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      pushRunOutput(`Run timeout reached (${Math.round(RUN_TIMEOUT_MS / 1000)}s). Terminating grader process.`);
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore process-kill errors; close/error handlers will reject.
      }
    }, RUN_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      text.split(/\r?\n/).forEach(pushRunOutput);

      if (/STAGE:\s*Load Submissions/i.test(text)) {
        setRunState({ stage: "loading", message: "Loading submissions from disk..." });
      } else if (/STAGE:\s*Ollama Preflight/i.test(text)) {
        setRunState({ stage: "booting", message: "Checking Ollama before grading..." });
      } else if (/STAGE:\s*Booting Grader Runtime/i.test(text)) {
        setRunState({ stage: "booting", message: "Booting the Python grader runtime..." });
      } else if (/STAGE:\s*(Sequential 4-Agent Pipeline|Direct Grading Pipeline)/i.test(text)) {
        setRunState({ stage: "grading", message: "Running the grading pipeline..." });
      } else if (/STUDENT:\s*/i.test(text)) {
        const studentMatch = text.match(/STUDENT:\s*(.+)/i);
        if (studentMatch) {
          setRunState({ stage: "grading", message: `Working on ${studentMatch[1].trim()}...` });
        }
      } else if (/FINAL SUMMARY/i.test(text)) {
        setRunState({ stage: "finalizing", message: "Writing the final summary..." });
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      stderr += text;
      text.split(/\r?\n/).forEach(pushRunOutput);
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      if (timedOut) {
        reject(new Error(`Grader timed out after ${Math.round(RUN_TIMEOUT_MS / 1000)} seconds.`));
        return;
      }
      if (code === 0) {
        resolve({ stderr });
      } else {
        reject(new Error(stderr || `Grader exited with code ${code}`));
      }
    });
  });
}

async function handleRun() {
  if (runState.status === "running") {
    return {
      ok: false,
      error: "Grader is already running",
      status: runState,
    };
  }

      setRunState({
        status: "running",
        stage: "starting",
        message: "Starting the grader...",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    error: null,
    studentCount: null,
        studentIds: [],
        recentOutput: [],
      });
      startRunHeartbeat();

      void (async () => {
        const started = Date.now();
        try {
          await runPythonGrader();
          const reports = await listReports();
          setRunState({
            status: "completed",
            stage: "done",
            message: `Finished grading ${reports.length} submission(s).`,
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - started,
            studentCount: reports.length,
            studentIds: reports.map((report) => report.studentId),
          });
          stopRunHeartbeat();
        } catch (error) {
          setRunState({
            status: "failed",
            stage: "failed",
            message: error instanceof Error ? error.message : "Grader failed",
        finishedAt: new Date().toISOString(),
            durationMs: Date.now() - started,
            error: error instanceof Error ? error.message : "Grader failed",
          });
          pushRunOutput(error instanceof Error ? error.stack ?? error.message : String(error));
          stopRunHeartbeat();
        }
      })();

  return {
    ok: true,
    status: runState,
  };
}

async function handleRubricPut(req) {
  const body = await readRequestBody(req);
  const payload = JSON.parse(body);
  await writeFile(RUBRIC_PATH, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  return payload;
}

async function handleSubmissionPost(req) {
  const body = await readRequestBody(req);
  const payload = JSON.parse(body);
  const fileName = sanitizeSubmissionFileName(payload.fileName);
  const content = String(payload.content ?? "").trimEnd();

  if (!content.trim()) {
    throw new Error("Submission content cannot be empty.");
  }

  await writeFile(path.join(SUBMISSIONS_DIR, fileName), `${content}\n`, "utf-8");

  return {
    ok: true,
    fileName,
    filePath: path.join(SUBMISSIONS_DIR, fileName),
    sizeBytes: Buffer.byteLength(`${content}\n`, "utf-8"),
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf-8");
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return notFound(res);
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, await getHealth());
    }

    if (req.method === "GET" && url.pathname === "/api/overview") {
      return json(res, 200, await getOverview());
    }

    if (req.method === "GET" && url.pathname === "/api/submissions") {
      return json(res, 200, await listSubmissions());
    }

    if (req.method === "POST" && url.pathname === "/api/submissions") {
      return json(res, 200, await handleSubmissionPost(req));
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/submissions/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/submissions/", ""));
      const submission = (await listSubmissions()).find((item) => item.id === id);
      return submission ? json(res, 200, submission) : notFound(res);
    }

    if (req.method === "GET" && url.pathname === "/api/rubric") {
      return json(res, 200, await buildRubric());
    }

    if (req.method === "PUT" && url.pathname === "/api/rubric") {
      return json(res, 200, await handleRubricPut(req));
    }

    if (req.method === "GET" && url.pathname === "/api/reports") {
      return json(res, 200, await listReports());
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/reports/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/reports/", ""));
      const report = (await listReports()).find((item) => item.id === id);
      return report ? json(res, 200, report) : notFound(res);
    }

    if (req.method === "GET" && url.pathname === "/api/feedbacks") {
      return json(res, 200, await listFeedbacks());
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/feedbacks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/feedbacks/", ""));
      const feedback = (await listFeedbacks()).find((item) => item.id === id);
      return feedback ? json(res, 200, feedback) : notFound(res);
    }

    if (req.method === "GET" && url.pathname === "/api/logs") {
      const lines = Number(url.searchParams.get("lines") ?? "200");
      return json(res, 200, await tailLog(Number.isFinite(lines) ? lines : 200));
    }

    if (req.method === "POST" && url.pathname === "/api/run") {
      return json(res, 202, await handleRun());
    }

    if (req.method === "GET" && url.pathname === "/api/run/status") {
      return json(res, 200, runState);
    }

    if (req.method === "GET" && url.pathname === "/api/backend-file") {
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return json(res, 400, { error: "Missing path" });
      }
      return text(res, 200, await readFile(filePath, "utf-8"));
    }

    return notFound(res);
  } catch (error) {
    return json(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.log(`Automated Assignment Grader API is already running on http://localhost:${PORT}`);
    console.log("You can keep that terminal open and just run the frontend dev server.");
    process.exit(0);
    return;
  }

  console.error(error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Automated Assignment Grader API listening on http://localhost:${PORT}`);
  console.log(`Backend root: ${BACKEND_ROOT}`);
});
