import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { jobApplications, jobs, resumes } from "../db/schema.js";
import type {
	CompanionJob,
	CoverLetterDraft,
	JobApplication,
	JobApplicationStatus,
	JobFitBrief,
	ResumeContent,
	ResumeDetails,
	ResumeEditProposal,
	ResumeSummary,
} from "../schema.js";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
	DatabaseSync: typeof import("node:sqlite").DatabaseSync;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mapResumeSummary(row: typeof resumes.$inferSelect): ResumeSummary {
	return {
		id: row.id,
		name: row.name,
		templateId: row.templateId,
		lastModified: row.lastModified,
		isDefault: row.isDefault === 1,
	};
}

function mapResumeDetails(row: typeof resumes.$inferSelect): ResumeDetails {
	return {
		...mapResumeSummary(row),
		content: JSON.parse(row.contentJson) as ResumeContent,
	};
}

function mapJobApplication(
	row: typeof jobApplications.$inferSelect,
): JobApplication {
	return {
		id: row.id,
		company: row.company,
		title: row.title,
		location: row.location,
		sourceUrl: row.sourceUrl,
		description: row.description,
		status: row.status as JobApplicationStatus,
		sourceResumeId: row.sourceResumeId,
		sourceResumeName: row.sourceResumeName,
		sourceResumeSnapshot: row.sourceResumeSnapshotJson
			? JSON.parse(row.sourceResumeSnapshotJson)
			: null,
		tailoredResume: row.tailoredResumeJson
			? JSON.parse(row.tailoredResumeJson)
			: null,
		fitBrief: row.fitBriefJson ? JSON.parse(row.fitBriefJson) : null,
		resumeEditProposals: row.resumeEditProposalsJson
			? JSON.parse(row.resumeEditProposalsJson)
			: [],
		coverLetterDraft: row.coverLetterDraftJson
			? JSON.parse(row.coverLetterDraftJson)
			: null,
		notes: row.notes,
		followUpAt: row.followUpAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createJobRepository(dbPath: string) {
	const database = new DatabaseSync(dbPath);

	// Inspect existing table schema
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

			// Restore backup
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

	// Initialize Drizzle with node:sqlite driver
	const db = drizzle({ client: database });

	// Run migrations
	const isBundled = __dirname.endsWith("dist");
	const migrationsFolder = isBundled
		? path.resolve(__dirname, "./drizzle")
		: path.resolve(__dirname, "../../drizzle");

	migrate(db, { migrationsFolder });

	function getJob(id: string): CompanionJob | null {
		const row = db.select().from(jobs).where(eq(jobs.id, id)).get();
		return row ?? null;
	}

	function getResume(id: string): ResumeDetails | null {
		const row = db.select().from(resumes).where(eq(resumes.id, id)).get();
		return row ? mapResumeDetails(row) : null;
	}

	function getJobApplication(id: string): JobApplication | null {
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
					createdAt: input.now,
					updatedAt: input.now,
				})
				.run();
			return getJob(input.id) as CompanionJob;
		},

		listJobs() {
			return db
				.select()
				.from(jobs)
				.orderBy(desc(jobs.updatedAt), desc(jobs.createdAt))
				.all();
		},

		getJob,

		listRunnableJobs() {
			return db
				.select()
				.from(jobs)
				.where(inArray(jobs.crawlStatus, ["pending", "crawling", "analyzing"]))
				.orderBy(asc(jobs.createdAt))
				.all();
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
					crawlError: null,
					cleanedText,
					updatedAt: now,
				})
				.where(eq(jobs.id, id))
				.run();
			return getJob(id);
		},

		markReady(
			id: string,
			input: {
				cleanedText: string;
				parsedTitle?: string | null;
				parsedCompany?: string | null;
				parsedLocation?: string | null;
				parsedDescription?: string | null;
				fitScore?: number | null;
				fitBriefJson?: string | null;
				now: number;
			},
		) {
			db.update(jobs)
				.set({
					crawlStatus: "ready",
					crawlError: null,
					cleanedText: input.cleanedText,
					updatedAt: input.now,
					crawledAt: input.now,
					parsedTitle: input.parsedTitle ?? null,
					parsedCompany: input.parsedCompany ?? null,
					parsedLocation: input.parsedLocation ?? null,
					parsedDescription: input.parsedDescription ?? null,
					fitScore: input.fitScore ?? null,
					fitBriefJson: input.fitBriefJson ?? null,
				})
				.where(eq(jobs.id, id))
				.run();
			return getJob(id);
		},

		markFailed(id: string, input: { error: string; now: number }) {
			db.update(jobs)
				.set({
					crawlStatus: "failed",
					crawlError: input.error,
					updatedAt: input.now,
				})
				.where(eq(jobs.id, id))
				.run();
			return getJob(id);
		},

		resetForRetry(id: string, now: number) {
			db.update(jobs)
				.set({
					crawlStatus: "pending",
					crawlError: null,
					cleanedText: "",
					updatedAt: now,
				})
				.where(eq(jobs.id, id))
				.run();
			return getJob(id);
		},

		resetForAnalysisRetry(id: string, now: number) {
			db.update(jobs)
				.set({
					crawlStatus: "analyzing",
					crawlError: null,
					updatedAt: now,
				})
				.where(eq(jobs.id, id))
				.run();
			return getJob(id);
		},

		deleteJob(id: string) {
			const result = db.delete(jobs).where(eq(jobs.id, id)).run();
			return result.changes > 0;
		},

		createResume(input: {
			id: string;
			name: string;
			templateId: string;
			content: ResumeContent;
			now: number;
			isDefault?: boolean;
		}) {
			db.transaction((tx) => {
				if (input.isDefault) {
					tx.update(resumes).set({ isDefault: 0 }).run();
				}
				tx.insert(resumes)
					.values({
						id: input.id,
						name: input.name,
						templateId: input.templateId,
						lastModified: input.now,
						isDefault: input.isDefault ? 1 : 0,
						contentJson: JSON.stringify(input.content),
					})
					.run();
			});
			return getResume(input.id) as ResumeDetails;
		},

		listResumes() {
			return db
				.select()
				.from(resumes)
				.orderBy(desc(resumes.lastModified), asc(resumes.name))
				.all()
				.map((row) => mapResumeSummary(row));
		},

		getResume,

		updateResume(
			id: string,
			input: {
				name?: string;
				templateId?: string;
				content?: ResumeContent;
				now: number;
				isDefault?: boolean;
			},
		) {
			const existing = getResume(id);
			if (!existing) {
				return null;
			}

			db.transaction((tx) => {
				if (input.isDefault) {
					tx.update(resumes)
						.set({ isDefault: 0 })
						.where(eq(resumes.isDefault, 1))
						.run();
				}
				tx.update(resumes)
					.set({
						name: input.name ?? existing.name,
						templateId: input.templateId ?? existing.templateId,
						lastModified: input.now,
						isDefault:
							input.isDefault !== undefined
								? input.isDefault
									? 1
									: 0
								: existing.isDefault
									? 1
									: 0,
						contentJson: JSON.stringify(input.content ?? existing.content),
					})
					.where(eq(resumes.id, id))
					.run();
			});
			return getResume(id);
		},

		deleteResume(id: string) {
			const result = db.delete(resumes).where(eq(resumes.id, id)).run();
			return result.changes > 0;
		},

		setDefaultResume(id: string, now: number) {
			const existing = getResume(id);
			if (!existing) {
				return null;
			}

			db.transaction((tx) => {
				tx.update(resumes).set({ isDefault: 0 }).run();
				tx.update(resumes)
					.set({ isDefault: 1, lastModified: now })
					.where(eq(resumes.id, id))
					.run();
			});

			return getResume(id);
		},

		clearDefaultResume(now: number) {
			db.update(resumes)
				.set({ isDefault: 0, lastModified: now })
				.where(eq(resumes.isDefault, 1))
				.run();
		},

		getDefaultResume() {
			const row = db
				.select()
				.from(resumes)
				.where(eq(resumes.isDefault, 1))
				.get();
			return row ? mapResumeDetails(row) : null;
		},

		listJobApplications() {
			return db
				.select()
				.from(jobApplications)
				.orderBy(
					desc(jobApplications.updatedAt),
					desc(jobApplications.createdAt),
				)
				.all()
				.map((row) => mapJobApplication(row));
		},

		getJobApplication,

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
					resumeEditProposalsJson: "[]",
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
				return null;
			}

			const updates: Record<string, any> = {
				updatedAt: input.now,
			};

			if (input.company !== undefined) updates.company = input.company;
			if (input.title !== undefined) updates.title = input.title;
			if (input.location !== undefined) updates.location = input.location;
			if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl;
			if (input.description !== undefined)
				updates.description = input.description;
			if (input.status !== undefined) updates.status = input.status;
			if (input.sourceResumeId !== undefined)
				updates.sourceResumeId = input.sourceResumeId;
			if (input.sourceResumeName !== undefined)
				updates.sourceResumeName = input.sourceResumeName;
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
			const result = db
				.delete(jobApplications)
				.where(eq(jobApplications.id, id))
				.run();
			return result.changes > 0;
		},

		convertJobToApplication(jobId: string, now: number) {
			const job = getJob(jobId);
			if (!job) {
				throw new Error(`Job with id ${jobId} not found`);
			}

			let company = job.parsedCompany;
			if (!company) {
				try {
					company = new URL(job.sourceUrl).hostname;
				} catch {
					company = "Unknown Company";
				}
			}
			const title = job.parsedTitle || "Untitled Job";
			const location = job.parsedLocation || "";
			const description = job.parsedDescription || job.cleanedText;

			db.transaction((tx) => {
				tx.insert(jobApplications)
					.values({
						id: job.id,
						company,
						title,
						location,
						sourceUrl: job.sourceUrl,
						description,
						status: "saved",
						fitBriefJson: job.fitBriefJson ?? null,
						resumeEditProposalsJson: "[]",
						createdAt: now,
						updatedAt: now,
					})
					.run();

				tx.delete(jobs).where(eq(jobs.id, job.id)).run();
			});

			return getJobApplication(job.id) as JobApplication;
		},

		close() {
			database.close();
		},
	};
}

export type JobRepository = ReturnType<typeof createJobRepository>;
