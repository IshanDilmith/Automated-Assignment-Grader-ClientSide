# Automated Assignment Grader Client

React + Tailwind + shadcn-style frontend for the local Automated Assignment Grader backend.

## What it does

- Reads submissions, rubric data, reports, and logs from the Python grader repo.
- Lets you edit the rubric JSON from the UI.
- Lets you trigger a fresh grading run from the frontend.

## Local setup

Prerequisites:

- Node.js (v16+ recommended)
- npm (comes with Node.js)
- The Python backend repository available as a sibling folder or pointed to by the bridge (see Backend bridge)

Install dependencies:

```bash
npm install
```

Start the API bridge (connects to the Python grader):

```bash
# from this frontend repo
npm run api
```

What `npm run api` does:

- Launches the Node-based API bridge which talks to the local Python grader.
- The bridge listens on port `8787` by default and forwards frontend requests to the backend.

Start the frontend dev server:

```bash
npm run dev
```

Notes:

- On Windows, run the commands in PowerShell, Command Prompt, or Windows Terminal.
- If the bridge cannot find the backend automatically, set the explicit backend path via the bridge configuration or keep both repos next to each other.
- If you encounter a permissions or port-in-use error, stop any processes using port `8787` or change the bridge port in the bridge config.


## Backend bridge

- The bridge auto-discovers the sibling Python backend folder.
- If you keep both repos next to each other, you do not need to set a path.
- The bridge listens on port `8787` by default.

## Routes

- `Dashboard` shows grading health and latest reports.
- `Submissions` lists the real submission files.
- `Rubric` edits `data/rubric.json`.
- `Reports` displays generated final reports.
- `Logs` tails the backend log.
- `Run grader` triggers the local Python pipeline.
