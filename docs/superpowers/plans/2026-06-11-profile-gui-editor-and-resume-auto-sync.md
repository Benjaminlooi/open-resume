# Profile GUI Editor & Resume Auto-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Candidate Profile management and automatic Resume Sync client/GUI features to the web frontend using TanStack Router, Zustand stores, and neobrutalist design elements.

**Architecture:** Extend the frontend client library with fetch calls matching the backend's `/profile` and `/profile/resume` endpoints. Build a multi-tab neobrutalist candidate profile GUI at `/profile` that reads and writes profile data, reads default resume information from stores, auto-syncs the resume on mount, and supports list additions/deletions. Create a shared dashboard navigation component to unify `/resumes`, `/jobs`, and `/profile`.

**Tech Stack:** React 19, TanStack Router, Zustand, Tailwind CSS, Lucide Icons, Shadcn UI components.

---

### Task 1: Extend local-companion-client.ts

**Files:**
- Modify: `apps/web/src/lib/local-companion-client.ts`
- Test: `apps/web/src/lib/local-companion-client.test.ts`

- [ ] **Step 1: Write CandidateProfile and Resume Zod schemas**
  Extend client library with Zod definitions matching the backend:
  - `targetRoleArchetypeSchema` (name, level, fit)
  - `candidateProfileSchema` (candidate, targetRoles, narrative, compensation, location)
  - `resumeSyncRequestSchema`
  - `okResponseSchema`
- [ ] **Step 2: Add API methods**
  - Implement `getProfile(): Promise<CandidateProfile>`
  - Implement `updateProfile(profile: CandidateProfile): Promise<CandidateProfile>`
  - Implement `syncResume(resume: Record<string, unknown>): Promise<{ ok: boolean }>`
- [ ] **Step 3: Write tests for client methods**
  Add mock fetch calls in `apps/web/src/lib/local-companion-client.test.ts` to assert that they correctly call URLs:
  - `GET /profile`
  - `PUT /profile`
  - `PUT /profile/resume`
  and parse/return parsed payloads correctly.
- [ ] **Step 4: Run client unit tests**
  Command: `pnpm --filter @open-resume/web test`
  Verify tests pass.

---

### Task 2: Create the /profile Route and GUI Form

**Files:**
- Create: `apps/web/src/routes/profile.tsx`

- [ ] **Step 1: Define route structure & import UI components**
  Define `/profile` using file-based routing. Inject tabs, inputs, and neobrutalist styling.
- [ ] **Step 2: Implement Candidate Profile multi-tab form**
  Create tabs for:
  - Contact (fullName, email, phone, location, linkedin, portfolioUrl, github, twitter)
  - Target Roles (primary: array of strings; archetypes: array of `{name, level, fit}`)
  - Narrative & Superpowers (headline, exitStory, superpowers: array of strings)
  - Proof Points (achievements: `{name, url, heroMetric}`)
  - Comp & Location (targetRange, currency, minimum, preferred, locationFlexibility, country, city, timezone, visaStatus, onsiteAvailability, remotePolicy)
- [ ] **Step 3: Add list editors for arrays**
  - Primary roles (string list editor)
  - Archetypes (name, level, fit editor)
  - Superpowers (string list editor)
  - Proof Points (name, url, heroMetric list editor)
- [ ] **Step 4: Connect GET/PUT actions**
  - Fetch profile on mount using client.
  - Save profile on button click using client.
- [ ] **Step 5: Integrate Resume Index details and Auto-Sync**
  - Read default resume ID from `useResumeIndexStore` (`defaultResumeId`).
  - Read/fetch resume details from `useResumeStore`.
  - Display default resume name and sync status (e.g. "Synced", "Syncing...", "Unsynced", "Error").
  - Auto-sync on route mount, and provide manual "Sync Resume" button.

---

### Task 3: Shared Dashboard Navigation Bar

**Files:**
- Create/Modify a shared component or header wrapper (e.g., `apps/web/src/components/dashboard/DashboardHeader.tsx` or similar).
- Modify: `apps/web/src/routes/jobs.tsx`, `apps/web/src/routes/resumes.tsx`, and `apps/web/src/routes/profile.tsx` to include the shared navigation header.

- [ ] **Step 1: Create DashboardHeader component**
  Styled matching `EditorHeader` (neobrutalist, thick borders, clean monospace font, high contrast) but simplified. Contains links for:
  - My Resumes (`/resumes`)
  - Jobs Tracker (`/jobs`)
  - My Profile (`/profile`)
  - Settings (button triggering `GlobalSettingsModal`)
- [ ] **Step 2: Integrate DashboardHeader in the dashboard routes**
  Place `<DashboardHeader />` at the top of `/jobs`, `/resumes`, and `/profile`.

---

### Task 4: E2E Verification & Typecheck

- [ ] **Step 1: Check compile safety**
  Command: `pnpm typecheck`
- [ ] **Step 2: Run all tests**
  Command: `pnpm test`
- [ ] **Step 3: Build check**
  Command: `pnpm build`
