# Design Spec: Migrating Companion Backend to Drizzle ORM

## Overview

This design outlines the migration of the SQLite database layer in the Fastify companion app (`apps/companion`) to Drizzle ORM. The migration focuses on improving type safety, maintainability, and query structure while preserving the existing **Repository Pattern** boundary, existing data compatibility, and shared frontend/backend typescript types.

---

## Architectural Boundaries

1. **Contracts (`packages/contracts`)**: Unchanged. The Zod schemas and TypeScript interfaces (like `CompanionJob`, `JobApplication`, etc.) remain the source of truth shared by both `apps/web` (frontend) and `apps/companion` (backend).
2. **Repository (`apps/companion/src/jobs/repository.ts`)**: Serves as the mapping layer. Internally, it uses Drizzle to query the database and maps the resulting Drizzle entities back to the shared domain models before returning them.
3. **Database Schema (`apps/companion/src/db/schema.ts`)**: New declarative definitions of the three SQLite tables (`jobs`, `resumes`, `job_applications`).

---

## Configuration & Dependencies

### `apps/companion/package.json`
Add the following packages:
- `drizzle-orm` (Runtime ORM client)
- `drizzle-kit` (Dev dependency for generating migration files)

### `apps/companion/drizzle.config.ts`
Drizzle Kit configuration for SQLite:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: process.env.OPEN_RESUME_COMPANION_DATABASE_PATH ?? ".open-resume-companion/jobs.sqlite",
	},
});
```

---

## Database Schema (`apps/companion/src/db/schema.ts`)

```typescript
import { eq } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// 1. Jobs Table
export const jobs = sqliteTable(
	"jobs",
	{
		id: text("id").primaryKey(),
		sourceUrl: text("source_url").notNull(),
		crawlStatus: text("crawl_status", { 
			enum: ["pending", "crawling", "analyzing", "ready", "failed"] 
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

// 2. Resumes Table
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

// 3. Job Applications Table
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

---

## Migration Strategy

1. **Generation**:
   Run `pnpm --filter @open-resume/companion drizzle-kit generate` to generate the initial migration in `apps/companion/drizzle/`.
   
2. **Startup Runner**:
   In `apps/companion/src/jobs/repository.ts`, we run migrations programmatically when setting up the repository:
   ```typescript
   import { migrate } from "drizzle-orm/node-sqlite/migrator";
   
   // In createJobRepository:
   const database = new DatabaseSync(path);
   const db = drizzle(database);
   await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
   ```

3. **Build Step update**:
   Ensure migration files are copied into the `dist` directory by changing the build script in `package.json`:
   ```json
   "build": "tsup src/index.ts --format esm --target node22 --dts && cp -r drizzle dist/drizzle"
   ```

---

## Code Transformations

The repository functions will be rewritten using the Drizzle instance `db`. Because Drizzle returns columns as typed properties based on the schema (camelCase matches), mapping functions like `mapJob` will be simplified to handle only JSON parsing.

### Example: Finding a job application
```typescript
import { eq } from "drizzle-orm";

function getJobApplication(id: string) {
	const row = db
		.select()
		.from(jobApplications)
		.where(eq(jobApplications.id, id))
		.get();
	return row ? mapJobApplication(row) : null;
}
```

### Example: Creating a job application
```typescript
createJobApplication(input: { ... }) {
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
}
```

---

## Verification Plan

### Automated Verification
1. **Compilation Check**: Run `pnpm typecheck` to verify TypeScript compile status.
2. **Unit Tests**: Run `pnpm companion:test` to ensure all existing repository unit tests pass. Since the repository public API remains identical, all test assertions should pass unmodified.
3. **Workspace Check**: Run `pnpm verify` to confirm builds and formatting rules pass.
