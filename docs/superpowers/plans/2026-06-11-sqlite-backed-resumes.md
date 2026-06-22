# SQLite-Backed Resumes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move resume persistence from browser `localStorage` and `resume.json` to the companion SQLite database.

**Architecture:** Add resume CRUD methods to the existing companion `JobRepository`, then expose them through Fastify routes and local companion client helpers. The web Zustand stores become async API-backed stores; editor routes wait for backend data before rendering.

**Tech Stack:** TypeScript, Fastify, Zod 4, `node:sqlite`, React 19, Zustand, Vitest.

---

## File Structure

- Modify `apps/companion/src/schema.ts`: add resume schemas and OpenAPI registry entries.
- Modify `apps/companion/src/jobs/repository.ts`: create the `resumes` table and add resume repository methods.
- Modify `apps/companion/src/jobs/repository.test.ts`: cover SQLite resume CRUD, default handling, and persistence.
- Modify `apps/companion/src/server.ts`: add `/resumes` routes and move `/profile/resume` to SQLite.
- Modify `apps/companion/src/server.test.ts`: cover resume routes and `/profile/resume` compatibility.
- Modify `apps/web/src/lib/local-companion-client.ts`: add resume client schemas and helpers.
- Modify `apps/web/src/lib/local-companion-client.test.ts`: cover resume helper requests.
- Modify `apps/web/src/lib/resume-index-store.ts`: replace localStorage persistence with backend index actions.
- Modify `apps/web/src/lib/resume-index-store.test.ts`: cover async index load/create/delete/default behavior.
- Modify `apps/web/src/lib/resume-store.ts`: replace localStorage load/save with async backend load and debounced backend updates.
- Modify `apps/web/src/lib/resume-store.test.ts`: cover async loading, name updates, and save payloads.
- Modify `apps/web/src/routes/resumes.tsx`: load backend index on mount and create imported resumes through backend.
- Modify `apps/web/src/routes/editor/$id.tsx`: await async resume load and handle missing backend rows.
- Modify `apps/web/src/components/dashboard/ResumeCard.tsx`: load preview data through backend helper/store and add `shrink-0`.
- Modify `apps/web/src/components/editor/EditorHeader.tsx`: make the name input editable.

---

### Task 1: Companion Resume Repository

**Files:**
- Modify: `apps/companion/src/schema.ts`
- Modify: `apps/companion/src/jobs/repository.ts`
- Test: `apps/companion/src/jobs/repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Add tests like:

```ts
it("creates, lists, updates, and deletes resumes", () => {
	const repository = createTestRepository();

	const created = repository.createResume({
		id: "resume-1",
		name: "Backend Resume",
		templateId: "modern",
		content: { personalInfo: { fullName: "Jane Doe" } },
		now: 1000,
	});

	expect(created).toMatchObject({
		id: "resume-1",
		name: "Backend Resume",
		templateId: "modern",
		lastModified: 1000,
		isDefault: false,
		content: { personalInfo: { fullName: "Jane Doe" } },
	});
	expect(repository.listResumes()).toEqual([
		{
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			lastModified: 1000,
			isDefault: false,
		},
	]);

	expect(
		repository.updateResume("resume-1", {
			name: "Renamed Resume",
			templateId: "demo",
			content: { summary: "Updated" },
			now: 1100,
		}),
	).toMatchObject({
		name: "Renamed Resume",
		templateId: "demo",
		lastModified: 1100,
		content: { summary: "Updated" },
	});

	expect(repository.deleteResume("resume-1")).toBe(true);
	expect(repository.getResume("resume-1")).toBeNull();
});

it("allows at most one default resume and can clear it", () => {
	const repository = createTestRepository();
	repository.createResume({
		id: "resume-1",
		name: "One",
		templateId: "demo",
		content: { summary: "One" },
		now: 1000,
	});
	repository.createResume({
		id: "resume-2",
		name: "Two",
		templateId: "modern",
		content: { summary: "Two" },
		now: 1000,
	});

	expect(repository.setDefaultResume("resume-1", 1100)?.isDefault).toBe(true);
	expect(repository.setDefaultResume("resume-2", 1200)?.isDefault).toBe(true);
	expect(repository.getDefaultResume()?.id).toBe("resume-2");
	expect(repository.getResume("resume-1")?.isDefault).toBe(false);

	repository.clearDefaultResume(1300);
	expect(repository.getDefaultResume()).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm --filter @open-resume/companion test -- src/jobs/repository.test.ts`

Expected: FAIL because resume repository methods do not exist.

- [ ] **Step 3: Add resume schemas**

In `apps/companion/src/schema.ts`, add:

```ts
export const resumeContentSchema = z.record(z.string(), z.unknown());

export const resumeSummarySchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		templateId: z.string().min(1),
		lastModified: z.number(),
		isDefault: z.boolean(),
	})
	.strict();

export const resumeDetailsSchema = resumeSummarySchema
	.extend({
		content: resumeContentSchema,
	})
	.strict();

export const resumesResponseSchema = z
	.object({
		resumes: z.array(resumeSummarySchema),
	})
	.strict();

export const createResumeRequestSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		templateId: z.string().min(1),
		content: resumeContentSchema,
	})
	.strict();

export const updateResumeRequestSchema = z
	.object({
		name: z.string().min(1).optional(),
		templateId: z.string().min(1).optional(),
		content: resumeContentSchema.optional(),
	})
	.strict();
```

- [ ] **Step 4: Add repository implementation**

In `apps/companion/src/jobs/repository.ts`, add row mapping and methods:

```ts
interface ResumeRow {
	id: string;
	name: string;
	template_id: string;
	last_modified: number;
	is_default: 0 | 1;
	content_json: string;
}

function mapResumeSummary(row: ResumeRow) {
	return {
		id: row.id,
		name: row.name,
		templateId: row.template_id,
		lastModified: row.last_modified,
		isDefault: row.is_default === 1,
	};
}

function mapResumeDetails(row: ResumeRow) {
	return {
		...mapResumeSummary(row),
		content: JSON.parse(row.content_json) as Record<string, unknown>,
	};
}
```

Create the table and index during repository initialization:

```sql
create table if not exists resumes (
	id text primary key,
	name text not null,
	template_id text not null,
	last_modified integer not null,
	is_default integer not null default 0 check(is_default in (0, 1)),
	content_json text not null
);
create unique index if not exists resumes_default_idx
	on resumes(is_default)
	where is_default = 1;
create index if not exists resumes_last_modified_idx
	on resumes(last_modified desc);
```

Add public methods: `createResume`, `listResumes`, `getResume`, `updateResume`, `deleteResume`, `setDefaultResume`, `clearDefaultResume`, and `getDefaultResume`.

- [ ] **Step 5: Run repository tests to verify GREEN**

Run: `pnpm --filter @open-resume/companion test -- src/jobs/repository.test.ts`

Expected: PASS.

---

### Task 2: Companion Resume Routes

**Files:**
- Modify: `apps/companion/src/server.ts`
- Test: `apps/companion/src/server.test.ts`

- [ ] **Step 1: Write failing route tests**

Add tests for `/resumes` and SQLite-backed `/profile/resume`:

```ts
it("serves resume CRUD routes from SQLite", async () => {
	const { server } = createTestServer();

	const createResponse = await server.inject({
		method: "POST",
		url: "/resumes",
		payload: {
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			content: { personalInfo: { fullName: "Jane Doe" } },
		},
	});
	expect(createResponse.statusCode).toBe(201);

	expect((await server.inject({ method: "GET", url: "/resumes" })).json()).toEqual({
		resumes: [
			expect.objectContaining({
				id: "resume-1",
				name: "Backend Resume",
				templateId: "modern",
				isDefault: false,
			}),
		],
	});

	const defaultResponse = await server.inject({
		method: "PUT",
		url: "/resumes/resume-1/default",
	});
	expect(defaultResponse.statusCode).toBe(200);
	expect(defaultResponse.json()).toMatchObject({ id: "resume-1", isDefault: true });

	const deleteDefaultResponse = await server.inject({
		method: "DELETE",
		url: "/resumes/default",
	});
	expect(deleteDefaultResponse.statusCode).toBe(200);
	expect(deleteDefaultResponse.json()).toEqual({ ok: true });
});

it("reads and writes profile resume through SQLite", async () => {
	const { server } = createTestServer();

	expect(
		(await server.inject({ method: "GET", url: "/profile/resume" })).statusCode,
	).toBe(404);

	const syncResponse = await server.inject({
		method: "PUT",
		url: "/profile/resume",
		payload: { resume: { personalInfo: { fullName: "Jane Doe" } } },
	});
	expect(syncResponse.statusCode).toBe(200);

	const getResponse = await server.inject({
		method: "GET",
		url: "/profile/resume",
	});
	expect(getResponse.statusCode).toBe(200);
	expect(getResponse.json()).toEqual({
		personalInfo: { fullName: "Jane Doe" },
	});
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm --filter @open-resume/companion test -- src/server.test.ts`

Expected: FAIL because `/resumes` routes do not exist and `/profile/resume` is still file-backed.

- [ ] **Step 3: Implement routes**

Import the new schemas, add `resumeIdParamsSchema`, and register:

```ts
typedServer.get("/resumes", async () => ({
	resumes: jobRepository.listResumes(),
}));

typedServer.get("/resumes/:id", async (request, reply) => {
	const resume = jobRepository.getResume(request.params.id);
	if (!resume) return reply.status(404).send({ error: "Resume not found" });
	return reply.send(resume);
});

typedServer.post("/resumes", async (request, reply) => {
	const resume = jobRepository.createResume({
		...request.body,
		now: Date.now(),
	});
	return reply.status(201).send(resume);
});

typedServer.put("/resumes/:id", async (request, reply) => {
	const resume = jobRepository.updateResume(request.params.id, {
		...request.body,
		now: Date.now(),
	});
	if (!resume) return reply.status(404).send({ error: "Resume not found" });
	return reply.send(resume);
});

typedServer.delete("/resumes/:id", async (request) => ({
	deleted: jobRepository.deleteResume(request.params.id),
}));

typedServer.put("/resumes/:id/default", async (request, reply) => {
	const resume = jobRepository.setDefaultResume(request.params.id, Date.now());
	if (!resume) return reply.status(404).send({ error: "Resume not found" });
	return reply.send(resume);
});

typedServer.delete("/resumes/default", async () => {
	jobRepository.clearDefaultResume(Date.now());
	return { ok: true };
});
```

Update `/profile/resume`:

```ts
const defaultResume = jobRepository.getDefaultResume();
if (!defaultResume) {
	return reply.status(404).send({ error: "Synced resume not found" });
}
return defaultResume.content;
```

Update `PUT /profile/resume` to call a repository upsert helper or create/update a stable `profile-resume` record and mark it default.

- [ ] **Step 4: Run server tests to verify GREEN**

Run: `pnpm --filter @open-resume/companion test -- src/server.test.ts`

Expected: PASS.

---

### Task 3: Web Companion Client

**Files:**
- Modify: `apps/web/src/lib/local-companion-client.ts`
- Test: `apps/web/src/lib/local-companion-client.test.ts`

- [ ] **Step 1: Write failing client tests**

Add tests that verify request paths and response parsing:

```ts
it("lists, gets, creates, updates, deletes, and defaults resumes", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init?: RequestInit) => {
			if (url.endsWith("/resumes") && !init) {
				return { ok: true, json: async () => ({ resumes: [] }) };
			}
			if (url.endsWith("/resumes/resume-1") && !init) {
				return {
					ok: true,
					json: async () => ({
						id: "resume-1",
						name: "Resume",
						templateId: "demo",
						lastModified: 1000,
						isDefault: false,
						content: { summary: "Hi" },
					}),
				};
			}
			return { ok: true, json: async () => ({ ok: true, deleted: true }) };
		}),
	);

	await expect(listResumes()).resolves.toEqual([]);
	await expect(getResume("resume-1")).resolves.toMatchObject({ id: "resume-1" });
	await createResume("resume-1", "Resume", "demo", { summary: "Hi" });
	await updateResume("resume-1", { name: "Updated" });
	await deleteResume("resume-1");
	await setDefaultResume("resume-1");
	await clearDefaultResume();

	expect(fetch).toHaveBeenCalledWith(
		"http://127.0.0.1:47321/resumes/resume-1/default",
		expect.objectContaining({ method: "PUT" }),
	);
	expect(fetch).toHaveBeenCalledWith(
		"http://127.0.0.1:47321/resumes/default",
		expect.objectContaining({ method: "DELETE" }),
	);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm --filter @open-resume/web test -- src/lib/local-companion-client.test.ts`

Expected: FAIL because resume client helpers do not exist.

- [ ] **Step 3: Add client helpers**

Add `resumeSummarySchema`, `resumeDetailsSchema`, `resumesResponseSchema`, types, and helpers:

```ts
export async function listResumes(): Promise<ResumeSummary[]> {
	const response = await companionFetch("/resumes");
	const parsed = await parseCompanionResponse(
		response,
		resumesResponseSchema,
		"Local companion could not list resumes.",
	);
	return parsed.resumes;
}

export async function getResume(id: string): Promise<ResumeDetails> {
	const response = await companionFetch(`/resumes/${id}`);
	return parseCompanionResponse(
		response,
		resumeDetailsSchema,
		"Local companion could not retrieve this resume.",
	);
}
```

Add `createResume`, `updateResume`, `deleteResume`, `setDefaultResume`, and `clearDefaultResume` with matching paths.

- [ ] **Step 4: Run client tests to verify GREEN**

Run: `pnpm --filter @open-resume/web test -- src/lib/local-companion-client.test.ts`

Expected: PASS.

---

### Task 4: Web Resume Stores and Routes

**Files:**
- Modify: `apps/web/src/lib/resume-index-store.ts`
- Modify: `apps/web/src/lib/resume-store.ts`
- Modify: `apps/web/src/routes/resumes.tsx`
- Modify: `apps/web/src/routes/editor/$id.tsx`
- Modify: `apps/web/src/components/dashboard/ResumeCard.tsx`
- Modify: `apps/web/src/components/editor/EditorHeader.tsx`
- Test: `apps/web/src/lib/resume-index-store.test.ts`
- Test: `apps/web/src/lib/resume-store.test.ts`

- [ ] **Step 1: Write failing store tests**

For `resume-index-store.test.ts`, replace localStorage expectations with mocked client behavior:

```ts
vi.mock("./local-companion-client", () => ({
	listResumes: vi.fn(),
	createResume: vi.fn(),
	deleteResume: vi.fn(),
	setDefaultResume: vi.fn(),
	clearDefaultResume: vi.fn(),
}));

it("loads index from the companion", async () => {
	vi.mocked(listResumes).mockResolvedValue([
		{
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			lastModified: 1000,
			isDefault: true,
		},
	]);

	await useResumeIndexStore.getState().loadIndex();

	expect(useResumeIndexStore.getState().resumes).toHaveLength(1);
	expect(useResumeIndexStore.getState().defaultResumeId).toBe("resume-1");
});
```

For `resume-store.test.ts`, add async load/name tests:

```ts
vi.mock("./local-companion-client", () => ({
	getResume: vi.fn(),
	updateResume: vi.fn(),
}));

it("loads a resume from the companion", async () => {
	vi.mocked(getResume).mockResolvedValue({
		id: "resume-1",
		name: "Backend Resume",
		templateId: "modern",
		lastModified: 1000,
		isDefault: false,
		content: {
			personalInfo: { fullName: "Jane Doe", email: "", phone: "", location: "", contactLinks: [] },
			summary: "Backend summary",
			sections: [],
			experience: [],
			education: [],
			skills: [],
			projects: [],
			certifications: [],
			languages: [],
		},
	});

	await expect(useResumeStore.getState().loadResume("resume-1")).resolves.toBe(true);
	expect(useResumeStore.getState()).toMatchObject({
		id: "resume-1",
		name: "Backend Resume",
		templateId: "modern",
		summary: "Backend summary",
	});
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
pnpm --filter @open-resume/web test -- src/lib/resume-index-store.test.ts src/lib/resume-store.test.ts
```

Expected: FAIL because stores are still localStorage-backed and `updateResumeName` does not exist.

- [ ] **Step 3: Implement index store**

Expose async actions:

```ts
interface ResumeIndexState {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
	loadIndex: () => Promise<void>;
	createResumeIndexEntry: (id: string, name: string, templateId: string, content?: Resume) => Promise<void>;
	deleteResumeIndexEntry: (id: string) => Promise<void>;
	setDefaultResumeId: (id: string | null) => Promise<void>;
}
```

`loadIndex()` calls `listResumes()`, maps `isDefault` to `defaultResumeId`, and stores summaries without `isDefault`.

- [ ] **Step 4: Implement resume store**

Change `loadResume` to:

```ts
loadResume: async (id: string) => {
	try {
		const resume = await getResume(id);
		set(() => ({
			...migrateResume(resume.content),
			id: resume.id,
			name: resume.name,
			templateId: resume.templateId,
			activeSection: "personalInfo",
		}));
		return true;
	} catch (_error) {
		return false;
	}
}
```

Add:

```ts
updateResumeName: (name: string) =>
	set(() => ({
		name,
	}));
```

Replace the localStorage subscriber with a debounced `updateResume(state.id, payload)` subscriber that omits functions and sends `{ name, templateId, content }`.

- [ ] **Step 5: Update routes and components**

In `apps/web/src/routes/resumes.tsx`, call `loadIndex()` on mount and create imported resumes via `createResumeIndexEntry(id, name, templateId, parsed.resume)`.

In `apps/web/src/routes/editor/$id.tsx`, await `loadResume(id)`:

```ts
useEffect(() => {
	let cancelled = false;

	async function load() {
		setIsLoading(true);
		const success = await loadResume(id);
		if (cancelled) return;
		if (!success) {
			const indexEntry = useResumeIndexStore
				.getState()
				.resumes.find((r) => r.id === id);
			useResumeStore
				.getState()
				.initNewResume(
					id,
					indexEntry?.name || "My Resume",
					indexEntry?.templateId || "demo",
				);
		}
		setIsLoading(false);
	}

	void load();
	return () => {
		cancelled = true;
	};
}, [id, loadResume]);
```

In `EditorHeader.tsx`, wire the input:

```tsx
<Input
	type="text"
	value={resumeName}
	onChange={(event) => updateResumeName(event.target.value)}
	className="max-w-[200px] hidden md:inline-flex"
/>
```

- [ ] **Step 6: Run web store tests to verify GREEN**

Run:

```bash
pnpm --filter @open-resume/web test -- src/lib/resume-index-store.test.ts src/lib/resume-store.test.ts
```

Expected: PASS.

---

### Task 5: Full Verification

**Files:**
- Modify if needed: any file touched by Tasks 1-4.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm --filter @open-resume/companion test -- src/jobs/repository.test.ts src/server.test.ts
pnpm --filter @open-resume/web test -- src/lib/local-companion-client.test.ts src/lib/resume-index-store.test.ts src/lib/resume-store.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript checks**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run: `pnpm dev`

Open the web app and verify:

- Dashboard loads from an empty SQLite-backed index.
- Creating a resume creates a backend row.
- Editing resume name in `EditorHeader` updates UI immediately and persists after navigation.
- Setting and clearing default resume updates the dashboard star state.
- `/profile/resume` returns `404` before a default exists and returns the default resume content after one is set.

---

## Self-Review

- Spec coverage: covers SQLite schema, companion routes, `/profile/resume` compatibility, client helpers, async stores, dashboard/editor route changes, and verification.
- Placeholder scan: no `TBD`, `TODO`, or deferred edge handling remains.
- Type consistency: resume API uses `templateId`/`lastModified` externally and `template_id`/`last_modified` only in SQLite rows.
