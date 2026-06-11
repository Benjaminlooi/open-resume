# Restoring the Active Dashboard & Conversion Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the local companion crawler queue to the active job application pipeline, restore the active applications list, collapsible crawler queue, score badges, manual entry tab, and ensure all tests pass.

**Architecture:** We will update the `/jobs` dashboard route to read from both the companion queue API and the local Zustand `useJobApplicationStore`. The companion queue panel will be rendered collapsibly at the top, and the active jobs grid will render as the primary dashboard below it. The companion job cards will support conversion to full applications, and the creation modal will support tab switching for crawl vs manual entry.

**Tech Stack:** React 19, TypeScript, TanStack Start/Router, Zustand, Tailwind CSS v4, Lucide Icons, Vitest.

---

### Task 1: Update companion schema in local client
**Files:**
- Modify: `apps/web/src/lib/local-companion-client.ts:5-15`

- [ ] **Step 1: Write the updated schema with parsed fields and fitScore/fitBriefJson**
Update `companionJobSchema` in `apps/web/src/lib/local-companion-client.ts`:
```typescript
const companionJobSchema = z.object({
	id: z.string(),
	sourceUrl: z.string().url(),
	crawlStatus: z.enum(["pending", "crawling", "analyzing", "ready", "failed"]),
	crawlError: z.string().nullable(),
	cleanedText: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	crawledAt: z.number().nullable(),
	parsedTitle: z.string().nullable().optional(),
	parsedCompany: z.string().nullable().optional(),
	parsedLocation: z.string().nullable().optional(),
	parsedDescription: z.string().nullable().optional(),
	fitScore: z.number().nullable().optional(),
	fitBriefJson: z.string().nullable().optional(),
});
```

- [ ] **Step 2: Run typecheck to verify compiling**
Run: `pnpm typecheck`
Expected: PASS

---

### Task 2: Update `CompanionJobCard.tsx`
**Files:**
- Modify: `apps/web/src/components/jobs/CompanionJobCard.tsx`

- [ ] **Step 1: Update props interface and component implementation**
Add `onConvert` optional callback to the props.
Inside the card header:
- If ready, use `job.parsedTitle || hostname` as title, and `job.parsedCompany || hostname` as company.
- Add fitScore badge when status is ready. Use appropriate Tailwind v4 bg color:
  - fitScore >= 80: bg-[#BBF7D0]
  - fitScore >= 60: bg-[#FEF08A]
  - fitScore < 60: bg-[#FECACA]
- Add "Convert to Application" button next to Delete for ready jobs.

- [ ] **Step 2: Update `CompanionJobCard.test.tsx`**
Update tests to:
- Render a ready job and check that parsed company, title, and fitScore badge are rendered.
- Check click handler for "Convert to Application".
Run: `pnpm web:test --run`
Expected: PASS

---

### Task 3: Combine dashboards in `apps/web/src/routes/jobs.tsx`
**Files:**
- Modify: `apps/web/src/routes/jobs.tsx`

- [ ] **Step 1: Write the implementation in `jobs.tsx`**
- Import `useJobApplicationStore` and `useNavigate` and `PipelineIntegrityPanel`.
- Read `jobApplications`, `createJobApplication`, `saveFitBrief`, `deleteJobApplication` from `useJobApplicationStore`.
- Restore the search query state and status filter state (`active` by default, or specific statuses, or `all`).
- Filter the `jobApplications` based on search and status.
- Place the companion queue panel inside a collapsible header/panel with summary `Companion Queue: X ready, Y pending, Z failed. Click to expand/collapse.`.
- Wire `onConvert` inside the ready jobs map to create the application, save the fitBrief, delete the companion job, and navigate.
- Render `<PipelineIntegrityPanel />` below the collapsible companion queue.
- Render the list of filtered job applications in a grid of `JobApplicationCard`s.

- [ ] **Step 2: Run tests to verify**
Run: `pnpm web:test --run`
Expected: PASS

---

### Task 4: Restore manual application entry in `NewJobApplicationModal.tsx`
**Files:**
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.tsx`

- [ ] **Step 1: Implement tab switching and manual form**
- Add state for `activeTab` ("crawl" | "manual").
- Add fields for company name, job title, location, source URL, job description.
- Render the tab selectors at the top in neobrutalist style.
- Render form for crawl URL or manual fields.
- On manual form submit, call `createJobApplication` in `useJobApplicationStore`, close modal, and navigate to `/jobs/$id`.

- [ ] **Step 2: Update `NewJobApplicationModal.test.tsx`**
- Import `useJobApplicationStore` and mock `useNavigate`.
- Verify tab switching and manual form submission, validation, and redirection.
Run: `pnpm web:test --run`
Expected: PASS
