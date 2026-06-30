# Backend Job Store & Feature-Based Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor backend job queue management to use a new Zustand store, resolving callback prop-drilling, and migrate all jobs-related code to a new feature folder (`src/features/jobs`).

**Architecture:** Colocate job components, stores, schemas, and helpers inside `src/features/jobs/`. Create `useBackendJobStore` in `src/features/jobs/backend-job-store.ts`.

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
  - Change `import BackendJobCard from "#/components/jobs/BackendJobCard";` to `import BackendJobCard from "#/features/jobs/components/BackendJobCard";`
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

### Task 2: Create useBackendJobStore

**Files:**
- Create: [backend-job-store.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/backend-job-store.ts)
- Test: [backend-job-store.test.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/backend-job-store.test.ts)

- [ ] **Step 1: Write failing unit tests for the store**

Create `apps/web/src/features/jobs/backend-job-store.test.ts`:
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBackendJobStore } from "./backend-job-store";
import {
	deleteBackendJob,
	listBackendJobs,
	retryBackendJobAnalyze,
	retryBackendJobCrawl,
} from "#/lib/local-backend-client";
import { useJobApplicationStore } from "./job-application-store";

vi.mock("#/lib/local-backend-client", () => ({
	listBackendJobs: vi.fn(),
	deleteBackendJob: vi.fn(),
	retryBackendJobCrawl: vi.fn(),
	retryBackendJobAnalyze: vi.fn(),
}));

const listBackendJobsMock = vi.mocked(listBackendJobs);
const deleteBackendJobMock = vi.mocked(deleteBackendJob);
const retryBackendJobCrawlMock = vi.mocked(retryBackendJobCrawl);
const retryBackendJobAnalyzeMock = vi.mocked(retryBackendJobAnalyze);

const initialBackendState = JSON.parse(JSON.stringify(useBackendJobStore.getState()));
const initialJobAppState = JSON.parse(JSON.stringify(useJobApplicationStore.getState()));

describe("useBackendJobStore", () => {
	beforeEach(() => {
		useBackendJobStore.setState(JSON.parse(JSON.stringify(initialBackendState)));
		useJobApplicationStore.setState(JSON.parse(JSON.stringify(initialJobAppState)));
		vi.clearAllMocks();
	});

	it("should fetch jobs and update store", async () => {
		const mockJobs = [{ id: "1", sourceUrl: "https://example.com", crawlStatus: "ready" as const }];
		listBackendJobsMock.mockResolvedValue(mockJobs);

		await useBackendJobStore.getState().fetchJobs();

		expect(listBackendJobsMock).toHaveBeenCalled();
		expect(useBackendJobStore.getState().backendJobs).toEqual(mockJobs);
	});

	it("should retry crawl and refresh jobs", async () => {
		retryBackendJobCrawlMock.mockResolvedValue({ id: "1", sourceUrl: "https://example.com", crawlStatus: "crawling" as const });
		listBackendJobsMock.mockResolvedValue([]);

		await useBackendJobStore.getState().retryJobCrawl("1");

		expect(retryBackendJobCrawlMock).toHaveBeenCalledWith("1");
		expect(listBackendJobsMock).toHaveBeenCalled();
	});

	it("should retry analyze and refresh jobs", async () => {
		retryBackendJobAnalyzeMock.mockResolvedValue({ id: "1", sourceUrl: "https://example.com", crawlStatus: "analyzing" as const });
		listBackendJobsMock.mockResolvedValue([]);

		await useBackendJobStore.getState().retryJobAnalyze("1");

		expect(retryBackendJobAnalyzeMock).toHaveBeenCalledWith("1");
		expect(listBackendJobsMock).toHaveBeenCalled();
	});

	it("should delete job and refresh jobs", async () => {
		deleteBackendJobMock.mockResolvedValue({ deleted: true });
		listBackendJobsMock.mockResolvedValue([]);

		await useBackendJobStore.getState().deleteJob("1");

		expect(deleteBackendJobMock).toHaveBeenCalledWith("1");
		expect(listBackendJobsMock).toHaveBeenCalled();
	});

	it("should convert job to application and delete from backend", async () => {
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

		deleteBackendJobMock.mockResolvedValue({ deleted: true });
		listBackendJobsMock.mockResolvedValue([]);

		const appId = await useBackendJobStore.getState().convertJobToApplication(mockJob);

		expect(appId).toBeTypeOf("string");
		expect(deleteBackendJobMock).toHaveBeenCalledWith("1");
		
		const app = useJobApplicationStore.getState().jobApplications.find((a) => a.id === appId);
		expect(app).toBeDefined();
		expect(app?.company).toBe("Test Co");
		expect(app?.fitBrief).toEqual({ roleSummary: "Great role" });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-resume/web test run src/features/jobs/backend-job-store.test.ts`
Expected: Failures due to missing store file.

- [ ] **Step 3: Implement useBackendJobStore**

Create `apps/web/src/features/jobs/backend-job-store.ts`:
```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
	deleteBackendJob,
	type LocalBackendJob,
	listBackendJobs,
	retryBackendJobAnalyze,
	retryBackendJobCrawl,
} from "#/lib/local-backend-client";
import { useJobApplicationStore } from "./job-application-store";

interface BackendJobState {
	backendJobs: LocalBackendJob[];
	isLoading: boolean;
	error: string | null;

	fetchJobs: () => Promise<void>;
	retryJobCrawl: (id: string) => Promise<void>;
	retryJobAnalyze: (id: string) => Promise<void>;
	deleteJob: (id: string) => Promise<void>;
	convertJobToApplication: (job: LocalBackendJob) => Promise<string>;
}

function getHostname(sourceUrl: string) {
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return sourceUrl;
	}
}

export const useBackendJobStore = create<BackendJobState>()(
	devtools(
		(set, get) => ({
			backendJobs: [],
			isLoading: false,
			error: null,

			fetchJobs: async () => {
				set({ isLoading: true, error: null });
				try {
					const jobs = await listBackendJobs();
					set({ backendJobs: jobs, isLoading: false });
				} catch (err) {
					set({
						error: err instanceof Error ? err.message : "Failed to load jobs",
						isLoading: false,
					});
				}
			},

			retryJobCrawl: async (id) => {
				try {
					await retryBackendJobCrawl(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to retry crawl" });
				}
			},

			retryJobAnalyze: async (id) => {
				try {
					await retryBackendJobAnalyze(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to retry analysis" });
				}
			},

			deleteJob: async (id) => {
				try {
					await deleteBackendJob(id);
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
					await deleteBackendJob(job.id);
					await get().fetchJobs();
				} catch (err) {
					console.error("Failed to delete backend job during conversion", err);
				}

				return appId;
			},
		}),
		{ name: "backend-job-store" },
	),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-resume/web test run src/features/jobs/backend-job-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/jobs/backend-job-store.ts apps/web/src/features/jobs/backend-job-store.test.ts
git commit -m "feat: add useBackendJobStore and tests"
```

---

### Task 3: Refactor BackendJobDetailsDialog

**Files:**
- Modify: [BackendJobDetailsDialog.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/BackendJobDetailsDialog.tsx)
- Modify: [BackendJobDetailsDialog.test.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/BackendJobDetailsDialog.test.tsx)

- [ ] **Step 1: Update BackendJobDetailsDialogProps in test file**

Open `apps/web/src/features/jobs/components/BackendJobDetailsDialog.test.tsx`.
Remove `onConvert`, `onRetry`, `onRetryAnalyze` from the test configurations, and add mocks/assertions for `useBackendJobStore`.

- [ ] **Step 2: Modify BackendJobDetailsDialog.tsx**

Update `apps/web/src/features/jobs/components/BackendJobDetailsDialog.tsx`:
- Remove `onConvert`, `onRetry`, `onRetryAnalyze` from props interface and component parameters.
- Import `useBackendJobStore` from `#/features/jobs/backend-job-store` and `useNavigate` from `@tanstack/react-router`.
- Use actions from `useBackendJobStore`:
  ```typescript
  const { convertJobToApplication, retryJobCrawl, retryJobAnalyze } = useBackendJobStore();
  const navigate = useNavigate();
  ```
- Replace callback calls in click handlers with the store calls, ensuring we handle async navigation properly.

- [ ] **Step 3: Update and run BackendJobDetailsDialog tests**

Update `apps/web/src/features/jobs/components/BackendJobDetailsDialog.test.tsx` and run the tests.
Run: `pnpm --filter @open-resume/web test run BackendJobDetailsDialog`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/jobs/components/BackendJobDetailsDialog.tsx apps/web/src/features/jobs/components/BackendJobDetailsDialog.test.tsx
git commit -m "refactor: update BackendJobDetailsDialog to use useBackendJobStore"
```

---

### Task 4: Refactor BackendJobCard

**Files:**
- Modify: [BackendJobCard.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/BackendJobCard.tsx)
- Modify: [BackendJobCard.test.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/features/jobs/components/BackendJobCard.test.tsx)

- [ ] **Step 1: Modify BackendJobCard.tsx**

Update `apps/web/src/features/jobs/components/BackendJobCard.tsx`:
- Remove callback props: `onRetry`, `onRetryAnalyze`, `onDelete`, `onConvert`.
- Import `useBackendJobStore` from `#/features/jobs/backend-job-store` and `useNavigate` from `@tanstack/react-router`.
- Update button handlers to call `convertJobToApplication`, `retryJobCrawl`, `retryJobAnalyze`, and `deleteJob`.
- Update the `<BackendJobDetailsDialog>` instantiation (no longer passing action callbacks).

- [ ] **Step 2: Update and run BackendJobCard tests**

Update `apps/web/src/features/jobs/components/BackendJobCard.test.tsx` to remove callback mock assertions, and instead mock `useBackendJobStore` to assert store action triggers.
Run: `pnpm --filter @open-resume/web test run BackendJobCard`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/jobs/components/BackendJobCard.tsx apps/web/src/features/jobs/components/BackendJobCard.test.tsx
git commit -m "refactor: update BackendJobCard to use useBackendJobStore"
```

---

### Task 5: Refactor Jobs Route Dashboard

**Files:**
- Modify: [jobs.tsx](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/routes/jobs.tsx)

- [ ] **Step 1: Refactor jobs.tsx**

Update `apps/web/src/routes/jobs.tsx`:
- Import `useBackendJobStore` from `#/features/jobs/backend-job-store`.
- Delete states: `backendJobs`, `loadError`.
- Delete local handlers: `handleRetry`, `handleRetryAnalyze`, `handleDelete`, `handleConvert`.
- Use selectors for state:
  ```typescript
  const { backendJobs, fetchJobs, error: loadError } = useBackendJobStore();
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
- Remove all handler props from `<BackendJobCard>` calls in the JSX.

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
git commit -m "refactor: update JobsDashboard route component to use useBackendJobStore"
```
