# Migrate Backend to Drizzle ORM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the SQLite database layer in the backend app to Drizzle ORM to replace raw SQL strings with type-safe query builders, while maintaining compatibility with the existing repository interface and database data.

**Architecture:** We will define Drizzle schemas in `apps/backend/src/db/schema.ts`, configure Drizzle Kit, generate migrations, execute migrations on server startup, and refactor the repository methods in `apps/backend/src/jobs/repository.ts` to use Drizzle queries.

**Tech Stack:** Drizzle ORM, Drizzle Kit, Fastify, TypeScript, Vitest

---

### Task 1: Add Dependencies & Configuration

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/drizzle.config.ts`

- [ ] **Step 1: Install Drizzle dependencies**
  Add `drizzle-orm` to dependencies and `drizzle-kit` to devDependencies.
  
  Replace the dependencies section in [package.json](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/package.json#L22-L36):
  ```json
  	"dependencies": {
  		"@ai-sdk/anthropic": "^3.0.81",
  		"@ai-sdk/google": "^3.0.80",
  		"@ai-sdk/openai": "^3.0.67",
  		"@fastify/cors": "^11.1.0",
  		"@fastify/swagger": "^9.7.0",
  		"@fastify/swagger-ui": "^5.2.6",
  		"@open-resume/contracts": "workspace:*",
  		"ai": "^6.0.193",
  		"drizzle-orm": "^0.39.3",
  		"fastify": "^5.8.0",
  		"fastify-plugin": "^6.0.0",
  		"fastify-type-provider-zod": "^6.1.0",
  		"playwright": "^1.57.0",
  		"zod": "^4.4.3"
  	},
  ```
  
  And add `drizzle-kit` to devDependencies in [package.json](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/package.json#L37-L45):
  ```json
  	"devDependencies": {
  		"@biomejs/biome": "2.4.5",
  		"@redocly/cli": "^2.31.6",
  		"@types/node": "^22.19.19",
  		"drizzle-kit": "^0.30.4",
  		"tsup": "^8.5.0",
  		"tsx": "^4.20.6",
  		"typescript": "^5.9.3",
  		"vitest": "^3.2.4"
  	}
  ```

- [ ] **Step 2: Install workspace packages**
  Run: `pnpm install` in the monorepo root.
  Expected: Installation finishes successfully and generates updated `pnpm-lock.yaml`.

- [ ] **Step 3: Create drizzle.config.ts**
  Create the Drizzle Kit config file [drizzle.config.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/drizzle.config.ts):
  ```typescript
  import { defineConfig } from "drizzle-kit";

  export default defineConfig({
  	out: "./drizzle",
  	schema: "./src/db/schema.ts",
  	dialect: "sqlite",
  	dbCredentials: {
  		url: process.env.OPEN_RESUME_BACKEND_DATABASE_PATH ?? ".open-resume-backend/jobs.sqlite",
  	},
  });
  ```

---

### Task 2: Define Declarative Schema

**Files:**
- Create: `apps/backend/src/db/schema.ts`

- [ ] **Step 1: Create schema.ts**
  Define Drizzle tables matching the existing SQLite tables [schema.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/src/db/schema.ts):
  ```typescript
  import { eq } from "drizzle-orm";
  import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

  export const jobs = sqliteTable(
  	"jobs",
  	{
  		id: text("id").primaryKey(),
  		sourceUrl: text("source_url").notNull(),
  		crawlStatus: text("crawl_status", {
  			enum: ["pending", "crawling", "analyzing", "ready", "failed"],
  		}).notNull(),
  		crawlError: text("crawl_error"),
  		cleanedText: text("cleaned_text").notNull().default(""),
  		createdAt: integer("created_at").notNull(),
  		updatedAt: integer("updated_at").notNull(),
  		crawledAt: integer("crawled_at"),
  		parsedTitle: text("parsed_title"),
  		parsedCompany: text("parsed_company"),
  		parsedLocation: text("parsed_location"),
  		parsedDescription: text("parsed_description"),
  		fitScore: real("fit_score"),
  		fitBriefJson: text("fit_brief_json"),
  	},
  	(table) => [
  		index("jobs_updated_at_idx").on(table.updatedAt.desc()),
  		index("jobs_runnable_idx").on(table.crawlStatus, table.createdAt.asc()),
  	]
  );

  export const resumes = sqliteTable(
  	"resumes",
  	{
  		id: text("id").primaryKey(),
  		name: text("name").notNull(),
  		templateId: text("template_id").notNull(),
  		lastModified: integer("last_modified").notNull(),
  		isDefault: integer("is_default").notNull().default(0),
  		contentJson: text("content_json").notNull(),
  	},
  	(table) => [
  		uniqueIndex("resumes_default_idx").on(table.isDefault).where(eq(table.isDefault, 1)),
  		index("resumes_last_modified_idx").on(table.lastModified.desc()),
  	]
  );

  export const jobApplications = sqliteTable(
  	"job_applications",
  	{
  		id: text("id").primaryKey(),
  		company: text("company").notNull(),
  		title: text("title").notNull(),
  		location: text("location").notNull(),
  		sourceUrl: text("source_url").notNull(),
  		description: text("description").notNull(),
  		status: text("status").notNull(),
  		sourceResumeId: text("source_resume_id"),
  		sourceResumeName: text("source_resume_name"),
  		sourceResumeSnapshotJson: text("source_resume_snapshot_json"),
  		tailoredResumeJson: text("tailored_resume_json"),
  		fitBriefJson: text("fit_brief_json"),
  		resumeEditProposalsJson: text("resume_edit_proposals_json"),
  		coverLetterDraftJson: text("cover_letter_draft_json"),
  		notes: text("notes").notNull().default(""),
  		followUpAt: integer("follow_up_at"),
  		createdAt: integer("created_at").notNull(),
  		updatedAt: integer("updated_at").notNull(),
  	},
  	(table) => [
  		index("job_applications_updated_at_idx").on(table.updatedAt.desc()),
  	]
  );
  ```

- [ ] **Step 2: Format files**
  Run: `pnpm format` in the monorepo root.
  Expected: Biome formats `schema.ts` and `drizzle.config.ts`.

---

### Task 3: Generate Migration Files

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/drizzle/*` (Generated)

- [ ] **Step 1: Generate initial migration**
  Run: `pnpm --filter @open-resume/backend drizzle-kit generate`
  Expected: Creates a folder `apps/backend/drizzle` containing an SQL migration script (e.g. `0000_init.sql`) and a meta directory.

- [ ] **Step 2: Add IF NOT EXISTS to the migration file**
  Open the newly generated `.sql` file in `apps/backend/drizzle/` and modify it:
  - Add `IF NOT EXISTS` to all `CREATE TABLE` statements.
  - Add `IF NOT EXISTS` to all `CREATE INDEX` and `CREATE UNIQUE INDEX` statements.
  
  Example format of the modified SQL:
  ```sql
  CREATE TABLE IF NOT EXISTS "job_applications" ( ... );
  CREATE TABLE IF NOT EXISTS "jobs" ( ... );
  CREATE TABLE IF NOT EXISTS "resumes" ( ... );
  CREATE INDEX IF NOT EXISTS "job_applications_updated_at_idx" ON "job_applications" ("updated_at");
  CREATE INDEX IF NOT EXISTS "jobs_updated_at_idx" ON "jobs" ("updated_at");
  CREATE INDEX IF NOT EXISTS "jobs_runnable_idx" ON "jobs" ("crawl_status","created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "resumes_default_idx" ON "resumes" ("is_default") WHERE "is_default" = 1;
  CREATE INDEX IF NOT EXISTS "resumes_last_modified_idx" ON "resumes" ("last_modified");
  ```

- [ ] **Step 3: Update backend build command in package.json**
  Update `"build"` in [package.json](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/package.json#L15) to copy the generated `drizzle` migrations directory into the build target directory.
  
  Replace:
  ```json
  		"build": "tsup src/index.ts --format esm --target node22 --dts && cp -r drizzle dist/drizzle",
  ```

---

### Task 4: Setup Startup Migration Runner in Repository

**Files:**
- Modify: `apps/backend/src/jobs/repository.ts`

- [ ] **Step 1: Refactor repository setup**
  Import Drizzle dependencies and set up migration execution. Keep the legacy schema migration check intact to upgrade pre-existing databases before initializing Drizzle.
  
  Modify [repository.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/src/jobs/repository.ts#L1-L14):
  ```typescript
  import { DatabaseSync } from "node:sqlite";
  import { drizzle } from "drizzle-orm/node-sqlite";
  import { migrate } from "drizzle-orm/node-sqlite/migrator";
  import { fileURLToPath } from "node:url";
  import path from "node:path";
  import { eq, desc, asc, inArray, and } from "drizzle-orm";
  import { jobs, resumes, jobApplications } from "../db/schema.js";
  import type {
  	BackendJob,
  	CrawlStatus,
  	ResumeContent,
  	ResumeDetails,
  	ResumeSummary,
  	JobApplication,
  	JobApplicationStatus,
  	JobFitBrief,
  	ResumeEditProposal,
  	CoverLetterDraft,
  } from "../schema.js";

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  ```

  Modify the setup logic inside `createJobRepository` in [repository.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/src/jobs/repository.ts#L129-L254):
  ```typescript
  export function createJobRepository(dbPath: string) {
  	const database = new DatabaseSync(dbPath);

  	// 1. Run Legacy checks (schema verification for very old clients)
  	const columns = database.prepare("PRAGMA table_info(jobs)").all() as Array<{
  		name: string;
  	}>;
  	const tableExists = columns.length > 0;
  	const missingColumns =
  		tableExists && !columns.some((col) => col.name === "parsed_title");

  	if (missingColumns) {
  		const oldJobs = database.prepare("select * from jobs").all() as any[];
  		database.exec("BEGIN TRANSACTION;");
  		try {
  			database.exec("drop table jobs;");
  			database.exec(`
  				create table jobs (
  					id text primary key,
  					source_url text not null,
  					crawl_status text not null check (
  						crawl_status in ('pending', 'crawling', 'analyzing', 'ready', 'failed')
  					),
  					crawl_error text,
  					cleaned_text text not null default '',
  					created_at integer not null,
  					updated_at integer not null,
  					crawled_at integer,
  					parsed_title text,
  					parsed_company text,
  					parsed_location text,
  					parsed_description text,
  					fit_score real,
  					fit_brief_json text
  				);
  			`);

  			const insertStmt = database.prepare(`
  				insert into jobs (
  					id, source_url, crawl_status, crawl_error, cleaned_text,
  					created_at, updated_at, crawled_at,
  					parsed_title, parsed_company, parsed_location, parsed_description,
  					fit_score, fit_brief_json
  				) values (?, ?, ?, ?, ?, ?, ?, ?, null, null, null, null, null, null)
  			`);

  			for (const job of oldJobs) {
  				insertStmt.run(
  					job.id,
  					job.source_url,
  					job.crawl_status,
  					job.crawl_error,
  					job.cleaned_text,
  					job.created_at,
  					job.updated_at,
  					job.crawled_at,
  				);
  			}

  			database.exec("COMMIT;");
  		} catch (error) {
  			database.exec("ROLLBACK;");
  			throw error;
  		}
  	}

  	// 2. Initialize Drizzle & execute migrations
  	const db = drizzle(database);
  	
  	// Migrate using the generated migration files
  	migrate(db, {
  		migrationsFolder: path.resolve(__dirname, "../../drizzle"),
  	});
  ```

---

### Task 5: Refactor Repository Methods to Drizzle

**Files:**
- Modify: `apps/backend/src/jobs/repository.ts`

- [ ] **Step 1: Refactor Job & Resume read/write methods**
  Rewrite the core SQL functions inside `createJobRepository` to use Drizzle builders.
  
  Replace the internal functions in [repository.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/src/jobs/repository.ts#L255-L407):
  ```typescript
  	function getJob(id: string) {
  		const row = db
  			.select()
  			.from(jobs)
  			.where(eq(jobs.id, id))
  			.get();
  		return row ? mapJob(row) : null;
  	}

  	function getResume(id: string) {
  		const row = db
  			.select()
  			.from(resumes)
  			.where(eq(resumes.id, id))
  			.get();
  		return row ? mapResumeDetails(row) : null;
  	}

  	function getJobApplication(id: string) {
  		const row = db
  			.select()
  			.from(jobApplications)
  			.where(eq(jobApplications.id, id))
  			.get();
  		return row ? mapJobApplication(row) : null;
  	}

  	return {
  		createJob(input: { id: string; sourceUrl: string; now: number }) {
  			db.insert(jobs)
  				.values({
  					id: input.id,
  					sourceUrl: input.sourceUrl,
  					crawlStatus: "pending",
  					cleanedText: "",
  					createdAt: input.now,
  					updatedAt: input.now,
  				})
  				.run();
  			return getJob(input.id) as BackendJob;
  		},

  		listJobs() {
  			return db
  				.select()
  				.from(jobs)
  				.orderBy(desc(jobs.updatedAt), desc(jobs.createdAt))
  				.all()
  				.map((row) => mapJob(row));
  		},

  		getJob,

  		listRunnableJobs() {
  			return db
  				.select()
  				.from(jobs)
  				.where(inArray(jobs.crawlStatus, ["pending", "crawling", "analyzing"]))
  				.orderBy(asc(jobs.createdAt))
  				.all()
  				.map((row) => mapJob(row));
  		},

  		markCrawling(id: string, now: number) {
  			db.update(jobs)
  				.set({
  					crawlStatus: "crawling",
  					crawlError: null,
  					updatedAt: now,
  				})
  				.where(eq(jobs.id, id))
  				.run();
  			return getJob(id);
  		},

  		markAnalyzing(id: string, cleanedText: string, now: number) {
  			db.update(jobs)
  				.set({
  					crawlStatus: "analyzing",
  					cleanedText,
  					updatedAt: now,
  				})
  				.where(eq(jobs.id, id))
  				.run();
  			return getJob(id);
  		},
  ```

- [ ] **Step 2: Refactor remaining Job & Resume methods**
  Replace functions in [repository.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/src/jobs/repository.ts#L321-L534):
  ```typescript
  		markCrawled(
  			id: string,
  			input: {
  				title: string | null;
  				company: string | null;
  				location: string | null;
  				description: string | null;
  				now: number;
  			},
  		) {
  			db.update(jobs)
  				.set({
  					crawlStatus: "ready",
  					parsedTitle: input.title,
  					parsedCompany: input.company,
  					parsedLocation: input.location,
  					parsedDescription: input.description,
  					updatedAt: input.now,
  					crawledAt: input.now,
  				})
  				.where(eq(jobs.id, id))
  				.run();
  			return getJob(id);
  		},

  		markFailed(id: string, error: string, now: number) {
  			db.update(jobs)
  				.set({
  					crawlStatus: "failed",
  					crawlError: error,
  					updatedAt: now,
  				})
  				.where(eq(jobs.id, id))
  				.run();
  			return getJob(id);
  		},

  		updateFit(
  			id: string,
  			input: { fitScore: number; fitBrief: JobFitBrief; now: number },
  		) {
  			db.update(jobs)
  				.set({
  					fitScore: input.fitScore,
  					fitBriefJson: JSON.stringify(input.fitBrief),
  					updatedAt: input.now,
  				})
  				.where(eq(jobs.id, id))
  				.run();
  			return getJob(id);
  		},

  		deleteJob(id: string) {
  			db.delete(jobs).where(eq(jobs.id, id)).run();
  		},

  		getResume,

  		listResumes() {
  			return db
  				.select()
  				.from(resumes)
  				.orderBy(desc(resumes.lastModified))
  				.all()
  				.map((row) => mapResumeSummary(row));
  		},

  		getDefaultResume() {
  			const row = db
  				.select()
  				.from(resumes)
  				.where(eq(resumes.isDefault, 1))
  				.get();
  			return row ? mapResumeDetails(row) : null;
  		},

  		createResume(resume: ResumeDetails) {
  			db.transaction((tx) => {
  				if (resume.isDefault) {
  					tx.update(resumes).set({ isDefault: 0 }).run();
  				}
  				tx.insert(resumes)
  					.values({
  						id: resume.id,
  						name: resume.name,
  						templateId: resume.templateId,
  						lastModified: resume.lastModified,
  						isDefault: resume.isDefault ? 1 : 0,
  						contentJson: JSON.stringify(resume.content),
  					})
  					.run();
  			});
  			return getResume(resume.id) as ResumeDetails;
  		},

  		updateResume(resume: ResumeDetails) {
  			db.transaction((tx) => {
  				if (resume.isDefault) {
  					tx.update(resumes)
  						.set({ isDefault: 0 })
  						.where(eq(resumes.isDefault, 1))
  						.run();
  				}
  				tx.update(resumes)
  					.set({
  						name: resume.name,
  						templateId: resume.templateId,
  						lastModified: resume.lastModified,
  						isDefault: resume.isDefault ? 1 : 0,
  						contentJson: JSON.stringify(resume.content),
  					})
  					.where(eq(resumes.id, resume.id))
  					.run();
  			});
  			return getResume(resume.id) as ResumeDetails;
  		},

  		deleteResume(id: string) {
  			db.delete(resumes).where(eq(resumes.id, id)).run();
  		},
  ```

- [ ] **Step 3: Refactor Job Applications methods**
  Replace functions in [repository.ts](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/backend/src/jobs/repository.ts#L535-L751):
  ```typescript
  		getJobApplication,

  		listJobApplications() {
  			return db
  				.select()
  				.from(jobApplications)
  				.orderBy(desc(jobApplications.updatedAt), desc(jobApplications.createdAt))
  				.all()
  				.map((row) => mapJobApplication(row));
  		},

  		createJobApplication(input: {
  			id: string;
  			company: string;
  			title: string;
  			location: string;
  			sourceUrl: string;
  			description: string;
  			now: number;
  		}) {
  			db.insert(jobApplications)
  				.values({
  					id: input.id,
  					company: input.company,
  					title: input.title,
  					location: input.location,
  					sourceUrl: input.sourceUrl,
  					description: input.description,
  					status: "saved",
  					createdAt: input.now,
  					updatedAt: input.now,
  				})
  				.run();
  			return getJobApplication(input.id) as JobApplication;
  		},

  		updateJobApplication(
  			id: string,
  			input: {
  				company?: string;
  				title?: string;
  				location?: string;
  				sourceUrl?: string;
  				description?: string;
  				status?: JobApplicationStatus;
  				sourceResumeId?: string | null;
  				sourceResumeName?: string | null;
  				sourceResumeSnapshot?: ResumeContent | null;
  				tailoredResume?: ResumeContent | null;
  				fitBrief?: JobFitBrief | null;
  				resumeEditProposals?: ResumeEditProposal[];
  				coverLetterDraft?: CoverLetterDraft | null;
  				notes?: string;
  				followUpAt?: number | null;
  				now: number;
  			},
  		) {
  			const existing = getJobApplication(id);
  			if (!existing) {
  				throw new Error(`Job application not found: ${id}`);
  			}

  			const updates: Record<string, any> = {
  				updatedAt: input.now,
  			};

  			if (input.company !== undefined) updates.company = input.company;
  			if (input.title !== undefined) updates.title = input.title;
  			if (input.location !== undefined) updates.location = input.location;
  			if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl;
  			if (input.description !== undefined) updates.description = input.description;
  			if (input.status !== undefined) updates.status = input.status;
  			if (input.sourceResumeId !== undefined) updates.sourceResumeId = input.sourceResumeId;
  			if (input.sourceResumeName !== undefined) updates.sourceResumeName = input.sourceResumeName;
  			if (input.sourceResumeSnapshot !== undefined) {
  				updates.sourceResumeSnapshotJson = input.sourceResumeSnapshot
  					? JSON.stringify(input.sourceResumeSnapshot)
  					: null;
  			}
  			if (input.tailoredResume !== undefined) {
  				updates.tailoredResumeJson = input.tailoredResume
  					? JSON.stringify(input.tailoredResume)
  					: null;
  			}
  			if (input.fitBrief !== undefined) {
  				updates.fitBriefJson = input.fitBrief
  					? JSON.stringify(input.fitBrief)
  					: null;
  			}
  			if (input.resumeEditProposals !== undefined) {
  				updates.resumeEditProposalsJson = JSON.stringify(
  					input.resumeEditProposals,
  				);
  			}
  			if (input.coverLetterDraft !== undefined) {
  				updates.coverLetterDraftJson = input.coverLetterDraft
  					? JSON.stringify(input.coverLetterDraft)
  					: null;
  			}
  			if (input.notes !== undefined) updates.notes = input.notes;
  			if (input.followUpAt !== undefined) updates.followUpAt = input.followUpAt;

  			db.update(jobApplications)
  				.set(updates)
  				.where(eq(jobApplications.id, id))
  				.run();

  			return getJobApplication(id);
  		},

  		deleteJobApplication(id: string) {
  			db.delete(jobApplications).where(eq(jobApplications.id, id)).run();
  		},

  		close() {
  			database.close();
  		},
  	};
  }
  ```

---

### Task 6: Verification

**Files:**
- Test: `apps/backend/src/jobs/repository.test.ts`

- [ ] **Step 1: Run compilation check**
  Run: `pnpm typecheck`
  Expected: TypeScript compiles with no semantic errors in `@open-resume/backend`.

- [ ] **Step 2: Run test suite**
  Run: `pnpm backend:test`
  Expected: All 18 repository test suites and backend tests pass successfully.

- [ ] **Step 3: Run full verification build**
  Run: `pnpm verify`
  Expected: Linting, formatting, tests, and builds for all packages in the monorepo pass without errors.
