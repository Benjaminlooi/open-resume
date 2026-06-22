# Companion Job Store & Feature-Based Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor companion job queue management to use a new Zustand store, resolving callback prop-drilling, and migrate all jobs-related code to a new feature folder (`src/features/jobs`).

**Architecture:** Colocate job components, stores, schemas, and helpers inside `src/features/jobs/`. Create `useCompanionJobStore` in `src/features/jobs/companion-job-store.ts`.

**Tech Stack:** React 19, Zustand, Vitest, TanStack Router.

---

### Task 1: Migrate Files to `src/features/jobs`

**Files:**
- Create: Directory `apps/web/src/features/jobs/components`
- Modify: Imports in migrated files

- [ ] **Step 1: Move components and tests**

Move all files from `apps/web/src/components/jobs/` to `apps/web/src/features/jobs/components/`.
You can execute this via command line (running `git mv` is preferred to preserve history):
```bash
mkdir -p apps/web/src/features/jobs/components
git mv apps/web/src/components/jobs/* apps/web/src/features/jobs/components/
```

- [ ] **Step 2: Move library files and tests**

Move jobs-related library files from `apps/web/src/lib/` to `apps/web/src/features/jobs/`:
```bash
git mv apps/web/src/lib/job-application-store.ts apps/web/src/features/jobs/
git mv apps/web/src/lib/job-application-store.test.ts apps/web/src/features/jobs/
git mv apps/web/src/lib/job-application-schema.ts apps/web/src/features/jobs/
git mv apps/web/src/lib/job-application-export.ts apps/web/src/features/jobs/
git mv apps/web/src/lib/job-application-export.test.ts apps/web/src/features/jobs/
git mv apps/web/src/lib/job-ai.ts apps/web/src/features/jobs/
git mv apps/web/src/lib/job-ai.test.ts apps/web/src/features/jobs/
```

- [ ] **Step 3: Update imports in moved files**

We need to fix relative imports in the moved files:
- In `apps/web/src/features/jobs/job-application-store.ts`:
  Change `import { useResumeIndexStore } from "./resume-index-store";` to `import { useResumeIndexStore } from "#/lib/resume-index-store";`
  Change `import { type Resume, resumeSchema } from "./resume-schema";` to `import { type Resume, resumeSchema } from "#/lib/resume-schema";`
  Change `import { getResumeData } from "./resume-store";` to `import { getResumeData } from "#/lib/resume-store";`
  Change `import type { ... } from "./job-application-schema";` to `import type { ... } from "./job-application-schema";` (this remains relative since they are colocated now!)
- In components (e.g. `NewJobApplicationModal.tsx` etc.), replace:
  - `#/lib/job-application-store` with `#/features/jobs/job-application-store`
  - `#/lib/job-application-schema` with `#/features/jobs/job-application-schema`
  - `#/lib/job-ai` with `#/features/jobs/job-ai`

- [ ] **Step 4: Update other files importing moved files**

- Update `apps/web/src/routes/jobs.tsx`:
  - Change `import CompanionJobCard from "#/components/jobs/CompanionJobCard";` to `import CompanionJobCard from "#/features/jobs/components/CompanionJobCard";`
  - Change `import JobApplicationCard from "#/components/jobs/JobApplicationCard";` to `import JobApplicationCard from "#/features/jobs/components/JobApplicationCard";`
  - Change `import NewJobApplicationModal from "#/components/jobs/NewJobApplicationModal";` to `import NewJobApplicationModal from "#/features/jobs/components/NewJobApplicationModal";`
  - Change `import PipelineIntegrityPanel from "#/components/jobs/PipelineIntegrityPanel";` to `import PipelineIntegrityPanel from "#/features/jobs/components/PipelineIntegrityPanel";`
  - Change `import { useJobApplicationStore } from "#/lib/job-application-store";` to `import { useJobApplicationStore } from "#/features/jobs/job-application-store";`

- Update `apps/web/src/routes/jobs.$id.tsx` (if it exists) or others:
  Let's make sure we find and fix any other occurrences of `#/components/jobs/` or `#/lib/job-application-store` in routes.
  Let's verify everything compiles:
  `pnpm typecheck`

- [ ] **Step 5: Run Vitest to verify migration is correct**

Run: `pnpm --filter @open-resume/web test run`
Verify that the tests for job application store run and pass from their new locations.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/jobs/
git commit -m "refactor: migrate jobs files to src/features/jobs"
```

---

### Task 2: Create useCompanionJobStore

**Files:**
- Create: [companion-job-store.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/companion-job-store.ts)
- Test: [companion-job-store.test.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/companion-job-store.test.ts)

- [ ] **Step 1: Write failing unit tests for the store**

Create `apps/web/src/features/jobs/companion-job-store.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompanionJobStore } from "./companion-job-store";
import {
	deleteCompanionJob,
	listCompanionJobs,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
} from "#/lib/local-companion-client";
import { useJobApplicationStore } from "./job-application-store";

vi.mock("#/lib/local-companion-client", () => ({
	listCompanionJobs: vi.fn(),
	deleteCompanionJob: vi.fn(),
	retryCompanionJobCrawl: vi.fn(),
	retryCompanionJobAnalyze: vi.fn(),
}));

const listCompanionJobsMock = vi.mocked(listCompanionJobs);
const deleteCompanionJobMock = vi.mocked(deleteCompanionJob);
const retryCompanionJobCrawlMock = vi.mocked(retryCompanionJobCrawl);
const retryCompanionJobAnalyzeMock = vi.mocked(retryCompanionJobAnalyze);

const initialCompanionState = JSON.parse(JSON.stringify(useCompanionJobStore.getState()));
const initialJobAppState = JSON.parse(JSON.stringify(useJobApplicationStore.getState()));

describe("useCompanionJobStore", () => {
	beforeEach(() => {
		useCompanionJobStore.setState(JSON.parse(JSON.stringify(initialCompanionState)));
		useJobApplicationStore.setState(JSON.parse(JSON.stringify(initialJobAppState)));
		vi.clearAllMocks();
	});

	it("should fetch jobs and update store", async () => {
		const mockJobs = [{ id: "1", sourceUrl: "https://example.com", crawlStatus: "ready" as const }];
		listCompanionJobsMock.mockResolvedValue(mockJobs);

		await useCompanionJobStore.getState().fetchJobs();

		expect(listCompanionJobsMock).toHaveBeenCalled();
		expect(useCompanionJobStore.getState().companionJobs).toEqual(mockJobs);
	});

	it("should retry crawl and refresh jobs", async () => {
		retryCompanionJobCrawlMock.mockResolvedValue({ id: "1", sourceUrl: "https://example.com", crawlStatus: "crawling" as const });
		listCompanionJobsMock.mockResolvedValue([]);

		await useCompanionJobStore.getState().retryJobCrawl("1");

		expect(retryCompanionJobCrawlMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
	});

	it("should retry analyze and refresh jobs", async () => {
		retryCompanionJobAnalyzeMock.mockResolvedValue({ id: "1", sourceUrl: "https://example.com", crawlStatus: "analyzing" as const });
		listCompanionJobsMock.mockResolvedValue([]);

		await useCompanionJobStore.getState().retryJobAnalyze("1");

		expect(retryCompanionJobAnalyzeMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
	});

	it("should delete job and refresh jobs", async () => {
		deleteCompanionJobMock.mockResolvedValue({ deleted: true });
		listCompanionJobsMock.mockResolvedValue([]);

		await useCompanionJobStore.getState().deleteJob("1");

		expect(deleteCompanionJobMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
	});

	it("should convert job to application and delete from companion", async () => {
		const mockJob = {
			id: "1",
			sourceUrl: "https://example.com/job",
			crawlStatus: "ready" as const,
			parsedCompany: "Test Co",
			parsedTitle: "Dev",
			parsedLocation: "NY",
			cleanedText: "Description here",
			fitBriefJson: JSON.stringify({ roleSummary: "Great role" }),
		};

		deleteCompanionJobMock.mockResolvedValue({ deleted: true });
		listCompanionJobsMock.mockResolvedValue([]);

		const appId = await useCompanionJobStore.getState().convertJobToApplication(mockJob);

		expect(appId).toBeTypeOf("string");
		expect(deleteCompanionJobMock).toHaveBeenCalledWith("1");
		
		const app = useJobApplicationStore.getState().jobApplications.find((a) => a.id === appId);
		expect(app).toBeDefined();
		expect(app?.company).toBe("Test Co");
		expect(app?.fitBrief).toEqual({ roleSummary: "Great role" });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-resume/web test run src/features/jobs/companion-job-store.test.ts`
Expected: Failures due to missing store file.

- [ ] **Step 3: Implement useCompanionJobStore**

Create `apps/web/src/features/jobs/companion-job-store.ts`:
```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
	deleteCompanionJob,
	type LocalCompanionJob,
	listCompanionJobs,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
} from "#/lib/local-companion-client";
import { useJobApplicationStore } from "./job-application-store";

interface CompanionJobState {
	companionJobs: LocalCompanionJob[];
	isLoading: boolean;
	error: string | null;

	fetchJobs: () => Promise<void>;
	retryJobCrawl: (id: string) => Promise<void>;
	retryJobAnalyze: (id: string) => Promise<void>;
	deleteJob: (id: string) => Promise<void>;
	convertJobToApplication: (job: LocalCompanionJob) => Promise<string>;
}

function getHostname(sourceUrl: string) {
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return sourceUrl;
	}
}

export const useCompanionJobStore = create<CompanionJobState>()(
	devtools(
		(set, get) => ({
			companionJobs: [],
			isLoading: false,
			error: null,

			fetchJobs: async () => {
				set({ isLoading: true, error: null });
				try {
					const jobs = await listCompanionJobs();
					set({ companionJobs: jobs, isLoading: false });
				} catch (err) {
					set({
						error: err instanceof Error ? err.message : "Failed to load jobs",
						isLoading: false,
					});
				}
			},

			retryJobCrawl: async (id) => {
				try {
					await retryCompanionJobCrawl(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to retry crawl" });
				}
			},

			retryJobAnalyze: async (id) => {
				try {
					await retryCompanionJobAnalyze(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to retry analysis" });
				}
			},

			deleteJob: async (id) => {
				try {
					await deleteCompanionJob(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to delete job" });
				}
			},

			convertJobToApplication: async (job) => {
				const hostname = getHostname(job.sourceUrl);
				const company = job.parsedCompany || hostname;
				const title = job.parsedTitle || "Untitled Job";
				const location = job.parsedLocation || "";
				const sourceUrl = job.sourceUrl;
				const description = job.parsedDescription || job.cleanedText;

				const { createJobApplication, saveFitBrief } = useJobApplicationStore.getState();

				const appId = createJobApplication(
					company,
					title,
					location,
					sourceUrl,
					description,
				);

				if (job.fitBriefJson) {
					try {
						const fitBrief = JSON.parse(job.fitBriefJson);
						saveFitBrief(appId, fitBrief);
					} catch (e) {
						console.error("Failed to parse fitBriefJson", e);
					}
				}

				try {
					await deleteCompanionJob(job.id);
					await get().fetchJobs();
				} catch (err) {
					console.error("Failed to delete companion job during conversion", err);
				}

				return appId;
			},
		}),
		{ name: "companion-job-store" },
	),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-resume/web test run src/features/jobs/companion-job-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/jobs/companion-job-store.ts apps/web/src/features/jobs/companion-job-store.test.ts
git commit -m "feat: add useCompanionJobStore and tests"
```

---

### Task 3: Refactor CompanionJobDetailsDialog

**Files:**
- Modify: [CompanionJobDetailsDialog.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/CompanionJobDetailsDialog.tsx)
- Modify: [CompanionJobDetailsDialog.test.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/CompanionJobDetailsDialog.test.tsx)

- [ ] **Step 1: Update CompanionJobDetailsDialogProps in test file**

Open `apps/web/src/features/jobs/components/CompanionJobDetailsDialog.test.tsx`.
Remove `onConvert`, `onRetry`, `onRetryAnalyze` from the test configurations, and add mocks/assertions for `useCompanionJobStore`.

- [ ] **Step 2: Modify CompanionJobDetailsDialog.tsx**

Update `apps/web/src/features/jobs/components/CompanionJobDetailsDialog.tsx`:
- Remove `onConvert`, `onRetry`, `onRetryAnalyze` from props interface and component parameters.
- Import `useCompanionJobStore` from `#/features/jobs/companion-job-store` and `useNavigate` from `@tanstack/react-router`.
- Use actions from `useCompanionJobStore`:
  ```typescript
  const { convertJobToApplication, retryJobCrawl, retryJobAnalyze } = useCompanionJobStore();
  const navigate = useNavigate();
  ```
- Replace callback calls in click handlers with the store calls, ensuring we handle async navigation properly.

- [ ] **Step 3: Update and run CompanionJobDetailsDialog tests**

Update `apps/web/src/features/jobs/components/CompanionJobDetailsDialog.test.tsx` and run the tests.
Run: `pnpm --filter @open-resume/web test run CompanionJobDetailsDialog`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/jobs/components/CompanionJobDetailsDialog.tsx apps/web/src/features/jobs/components/CompanionJobDetailsDialog.test.tsx
git commit -m "refactor: update CompanionJobDetailsDialog to use useCompanionJobStore"
```

---

### Task 4: Refactor CompanionJobCard

**Files:**
- Modify: [CompanionJobCard.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/CompanionJobCard.tsx)
- Modify: [CompanionJobCard.test.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/CompanionJobCard.test.tsx)

- [ ] **Step 1: Modify CompanionJobCard.tsx**

Update `apps/web/src/features/jobs/components/CompanionJobCard.tsx`:
- Remove callback props: `onRetry`, `onRetryAnalyze`, `onDelete`, `onConvert`.
- Import `useCompanionJobStore` from `#/features/jobs/companion-job-store` and `useNavigate` from `@tanstack/react-router`.
- Update button handlers to call `convertJobToApplication`, `retryJobCrawl`, `retryJobAnalyze`, and `deleteJob`.
- Update the `<CompanionJobDetailsDialog>` instantiation (no longer passing action callbacks).

- [ ] **Step 2: Update and run CompanionJobCard tests**

Update `apps/web/src/features/jobs/components/CompanionJobCard.test.tsx` to remove callback mock assertions, and instead mock `useCompanionJobStore` to assert store action triggers.
Run: `pnpm --filter @open-resume/web test run CompanionJobCard`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/jobs/components/CompanionJobCard.tsx apps/web/src/features/jobs/components/CompanionJobCard.test.tsx
git commit -m "refactor: update CompanionJobCard to use useCompanionJobStore"
```

---

### Task 5: Refactor Jobs Route Dashboard

**Files:**
- Modify: [jobs.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/routes/jobs.tsx)

- [ ] **Step 1: Refactor jobs.tsx**

Update `apps/web/src/routes/jobs.tsx`:
- Import `useCompanionJobStore` from `#/features/jobs/companion-job-store`.
- Delete states: `companionJobs`, `loadError`.
- Delete local handlers: `handleRetry`, `handleRetryAnalyze`, `handleDelete`, `handleConvert`.
- Use selectors for state:
  ```typescript
  const { companionJobs, fetchJobs, error: loadError } = useCompanionJobStore();
  ```
- Update the effect hook that fetches and polls:
  ```typescript
  useEffect(() => {
  	if (!isMounted) return;

  	fetchJobs();
  	const intervalDelay = hasPendingJobs ? 2000 : 10000;
  	const interval = setInterval(fetchJobs, intervalDelay);

  	return () => {
  		clearInterval(interval);
  	};
  }, [isMounted, hasPendingJobs, fetchJobs]);
  ```
- Remove all handler props from `<CompanionJobCard>` calls in the JSX.

- [ ] **Step 2: Verify type checks and test suites**

Run type checks:
`pnpm typecheck`
Expected: PASS with zero errors.

Run all tests:
`pnpm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/jobs.tsx
git commit -m "refactor: update JobsDashboard route component to use useCompanionJobStore"
```
