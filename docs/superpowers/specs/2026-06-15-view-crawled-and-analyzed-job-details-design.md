# Design: View Crawled and Analyzed Job Details

This document details the design for allowing users to view/check the crawled job description text and the AI fit analysis output directly from the backend queue before converting it into a full Job Application.

## Objectives
- Introduce a details modal for any backend job that has crawled text.
- Provide tabbed navigation inside the modal to switch between "AI Fit Analysis" and "Raw Scraped Text".
- Enable the user to view the scraped text even if AI analysis is in progress or has failed.
- Allow converting to a job application or retrying crawls/analysis directly from the modal.

---

## Proposed Changes

### 1. New Component: [BackendJobDetailsDialog](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/components/jobs/BackendJobDetailsDialog.tsx)

This dialog handles showing the detailed output:
- **State**:
  - `activeTab`: `'ai' | 'scraped'`
- **Props**:
  - `job`: `LocalBackendJob`
  - `isOpen`: `boolean`
  - `onClose`: `() => void`
  - `onConvert?: (job: LocalBackendJob) => void`
  - `onRetry?: (id: string) => void`
  - `onRetryAnalyze?: (id: string) => void`
- **Tab Selection Logic**:
  - If `job.crawlStatus === "ready"`, default `activeTab` to `'ai'`.
  - Otherwise, default `activeTab` to `'scraped'`.
- **Render Details**:
  - Title, company name, match score, and source URL in the header.
  - Tabs:
    - **AI Fit Analysis**:
      - If `ready` and `fitBriefJson` is present:
        - Parse and render the structured `JobFitBrief` fields (Role Summary, Requirements, Keywords, Strengths, Gaps, Risks, Next Actions) using identical styles to `FitBriefStep.tsx` for consistency.
      - If status is `analyzing`, render: *"AI is currently analyzing this job description..."* with a spinner.
      - If status is `failed` (and scraped text is present), render: *"AI analysis failed: [error]. Check the raw scraped text in the next tab."*
    - **Raw Scraped Text**:
      - Render the `cleanedText` inside a scrollable container with `whitespace-pre-wrap` styling.
- **Footer Actions**:
  - **Convert to Application** (visible for `ready` status).
  - **Retry Scrape** / **Retry AI Analysis** (visible for `failed` status).
  - **Close** button.

### 2. Modify: [BackendJobCard](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/components/jobs/BackendJobCard.tsx)

- Add local state `isDetailsOpen: boolean`.
- Add a new "View Details" button at the bottom actions row next to the "Delete" button. This button is enabled/visible if `job.cleanedText` is not empty (i.e. crawl succeeded, meaning status is `ready`, `analyzing`, or `failed` with cleaned text).
- Render `<BackendJobDetailsDialog>` inside the card component and pass the local actions.

---

## Verification Plan

### Automated Tests
- Run `pnpm test` to make sure all existing component tests pass.
- Run `pnpm typecheck` to verify typescript compilation.

### Manual Verification
1. Add a job URL.
2. While the job is `analyzing` (after crawl but before AI completion), click "View Details". Verify that the "Raw Scraped Text" tab is displayed and contains the scraped text, and the "AI Fit Analysis" tab shows that analysis is in progress.
3. Once the job is `ready`, click "View Details". Verify that the "AI Fit Analysis" tab is selected by default and displays all the fit brief fields and match score.
4. Switch to the "Raw Scraped Text" tab and verify it shows the full text.
5. Click "Convert to Application" from the modal. Verify that it creates the job application, redirects to the workspace, and removes the job from the backend queue.
