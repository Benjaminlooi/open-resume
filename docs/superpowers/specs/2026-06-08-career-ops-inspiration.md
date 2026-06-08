# Career-Ops Inspiration Notes

## Purpose

This note summarizes what `santifer/career-ops` is about and how it can inform the job application AI helper for Open Resume. It is context for product and architecture inspiration, not a recommendation to adopt `career-ops` as a backend or dependency.

Sources:

- https://github.com/santifer/career-ops
- https://github.com/santifer/career-ops/blob/main/DATA_CONTRACT.md
- https://github.com/santifer/career-ops/blob/main/docs/SETUP.md

## What Career-Ops Is

Career-Ops is a local, open-source job search operating system built around AI coding CLIs such as Claude Code, Gemini CLI, Codex, and similar tools. It turns a local project directory into a job-search command center where the user can paste job descriptions or job URLs, run AI evaluation workflows, generate tailored CV PDFs, track applications, scan job portals, and maintain job-search knowledge over time.

The project is not a hosted web application. It is local-first and file-backed. User data lives in files such as a Markdown CV, profile YAML, job descriptions, reports, generated PDFs, tracker files, follow-up history, and writing samples. The AI agent reads and writes those files through CLI workflows.

Career-Ops is also intentionally human-in-the-loop. It can evaluate, recommend, tailor, and prepare artifacts, but the user is expected to review decisions and content before submitting anything.

## Core Product Ideas

- **Job search as an operating system:** Career-Ops treats job search as a repeatable pipeline rather than a set of isolated tasks.
- **Application packet per job:** A job can produce a description, evaluation report, tailored CV, tracker entry, interview prep notes, and follow-up state.
- **Fit filtering before applying:** The system emphasizes evaluating whether an opportunity is worth the user’s time before tailoring materials.
- **Structured evaluation:** It uses repeatable scoring/evaluation modes instead of freeform chat alone.
- **Tailored artifacts:** It generates role-specific CVs and other application materials from a source CV and job description.
- **Single source of truth:** It keeps the pipeline, application status, generated outputs, and reports in predictable local files.
- **Human approval:** The user stays responsible for decisions and submissions.
- **Personal context improves quality:** The system encourages users to feed it career story, proof points, preferences, target roles, and writing samples.

## Architecture Ideas Worth Borrowing

- **Local-first privacy posture:** User career data should be treated as sensitive and should remain local by default in the MVP.
- **User data vs system logic boundary:** Career-Ops has a clear data contract separating user-owned files from system-owned logic. Open Resume can mirror this concept in app data by separating user artifacts from reusable templates, prompts, and workflows.
- **Explicit artifact model:** Instead of storing only chat transcripts, store durable artifacts: job description, fit brief, tailored resume copy, cover letter draft, notes, status, and export history.
- **Pipeline integrity checks:** Even in a web app, it is useful to validate application records, statuses, missing resume snapshots, and broken references.
- **Reusable evaluation modes:** Analysis, tailoring, cover letter generation, follow-up drafting, and interview prep should be separate workflows with explicit inputs and outputs.
- **Portable exports:** Career-Ops gets durability from files. Open Resume should offer JSON/Markdown/PDF export so users are not trapped in browser storage.

## Ideas To Avoid Copying Directly

- **CLI-first UX:** Open Resume is a browser app, so workflows should be visual, guided, and inspectable rather than command-driven.
- **File-backed backend as-is:** Career-Ops stores state in Markdown/YAML/TSV files. That is excellent for a local CLI but awkward for this TanStack app. Use typed Zustand/localStorage for MVP, then a hosted database if sync is needed.
- **Batch automation too early:** Portal scanning, batch evaluation, and automated form filling are powerful but high-risk and likely out of scope for the first job workspace MVP.
- **Overweight scoring:** A numerical score can be helpful later, but the first version should prioritize an actionable fit brief: strengths, gaps, risks, keywords, and next actions.
- **Auto-generated application behavior:** The app should not auto-submit applications or encourage spammy workflows.

## Implications For Open Resume

The best adaptation is a browser-native “application workspace” per job:

1. The user chooses a default resume.
2. The user creates a job workspace with company, title, job description, URL, and status.
3. The app generates a fit brief from the job description and default resume.
4. When tailoring begins, the job gets its own resume snapshot copied from the default resume.
5. AI proposes resume changes against the job-specific resume copy.
6. The user approves or rejects each proposed change.
7. The app generates an editable cover letter from the job description, fit brief, and tailored resume.
8. The workspace tracks application status, notes, and follow-ups.

This preserves Career-Ops’ strongest idea, a complete application packet per job, while keeping Open Resume’s browser-first interaction model.

## Backend Recommendation

Career-Ops does not imply that Open Resume needs a backend immediately. For the MVP, stay browser-local:

- Store resumes, job applications, fit briefs, tailored resume copies, cover letters, and statuses in local Zustand stores persisted to `localStorage`.
- Add export/import so users can back up and move their data.
- Keep AI calls aligned with the current provider settings model.

Add a backend only when the product needs cross-device sync, accounts, shared review, server-side PDF generation, durable backups, or server-managed AI credentials. If that happens, the natural path for this repo is a Cloudflare-backed layer using TanStack Start server functions, structured storage such as D1 or Postgres, and object storage for exported PDFs.

## Design Principles To Carry Forward

- Treat user career data as private by default.
- Store generated artifacts as first-class records, not transient chat output.
- Keep every AI action reviewable and reversible.
- Separate source resume from job-specific tailored resumes.
- Make job applications feel like workspaces with a clear next action.
- Prefer quality filtering and thoughtful applications over volume automation.
