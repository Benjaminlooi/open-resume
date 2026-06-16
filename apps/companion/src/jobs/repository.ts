import { DatabaseSync } from "node:sqlite";
import type {
	CompanionJob,
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

interface JobRow {
	id: string;
	source_url: string;
	crawl_status: CrawlStatus;
	crawl_error: string | null;
	cleaned_text: string;
	created_at: number;
	updated_at: number;
	crawled_at: number | null;
	parsed_title: string | null;
	parsed_company: string | null;
	parsed_location: string | null;
	parsed_description: string | null;
	fit_score: number | null;
	fit_brief_json: string | null;
}

interface ResumeRow {
	id: string;
	name: string;
	template_id: string;
	last_modified: number;
	is_default: 0 | 1;
	content_json: string;
}

function mapJob(row: JobRow): CompanionJob {
	return {
		id: row.id,
		sourceUrl: row.source_url,
		crawlStatus: row.crawl_status,
		crawlError: row.crawl_error,
		cleanedText: row.cleaned_text,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		crawledAt: row.crawled_at,
		parsedTitle: row.parsed_title,
		parsedCompany: row.parsed_company,
		parsedLocation: row.parsed_location,
		parsedDescription: row.parsed_description,
		fitScore: row.fit_score,
		fitBriefJson: row.fit_brief_json,
	};
}

function mapResumeSummary(row: ResumeRow): ResumeSummary {
	return {
		id: row.id,
		name: row.name,
		templateId: row.template_id,
		lastModified: row.last_modified,
		isDefault: row.is_default === 1,
	};
}

function mapResumeDetails(row: ResumeRow): ResumeDetails {
	return {
		...mapResumeSummary(row),
		content: JSON.parse(row.content_json) as ResumeContent,
	};
}

interface JobApplicationRow {
	id: string;
	company: string;
	title: string;
	location: string;
	source_url: string;
	description: string;
	status: string;
	source_resume_id: string | null;
	source_resume_name: string | null;
	source_resume_snapshot_json: string | null;
	tailored_resume_json: string | null;
	fit_brief_json: string | null;
	resume_edit_proposals_json: string | null;
	cover_letter_draft_json: string | null;
	notes: string;
	follow_up_at: number | null;
	created_at: number;
	updated_at: number;
}

function mapJobApplication(row: JobApplicationRow): JobApplication {
	return {
		id: row.id,
		company: row.company,
		title: row.title,
		location: row.location,
		sourceUrl: row.source_url,
		description: row.description,
		status: row.status as JobApplicationStatus,
		sourceResumeId: row.source_resume_id,
		sourceResumeName: row.source_resume_name,
		sourceResumeSnapshot: row.source_resume_snapshot_json
			? JSON.parse(row.source_resume_snapshot_json)
			: null,
		tailoredResume: row.tailored_resume_json
			? JSON.parse(row.tailored_resume_json)
			: null,
		fitBrief: row.fit_brief_json ? JSON.parse(row.fit_brief_json) : null,
		resumeEditProposals: row.resume_edit_proposals_json
			? JSON.parse(row.resume_edit_proposals_json)
			: [],
		coverLetterDraft: row.cover_letter_draft_json
			? JSON.parse(row.cover_letter_draft_json)
			: null,
		notes: row.notes,
		followUpAt: row.follow_up_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function createJobRepository(path: string) {
	const database = new DatabaseSync(path);

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

	database.exec(`
		create table if not exists jobs (
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
		create index if not exists jobs_updated_at_idx on jobs(updated_at desc);
		create index if not exists jobs_runnable_idx
			on jobs(crawl_status, created_at asc);
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

		create table if not exists job_applications (
			id text primary key,
			company text not null,
			title text not null,
			location text not null,
			source_url text not null,
			description text not null,
			status text not null,
			source_resume_id text,
			source_resume_name text,
			source_resume_snapshot_json text,
			tailored_resume_json text,
			fit_brief_json text,
			resume_edit_proposals_json text,
			cover_letter_draft_json text,
			notes text not null default '',
			follow_up_at integer,
			created_at integer not null,
			updated_at integer not null
		);
		create index if not exists job_applications_updated_at_idx on job_applications(updated_at desc);
	`);

	function getJob(id: string) {
		const row = database
			.prepare("select * from jobs where id = ?")
			.get(id) as unknown as JobRow | undefined;
		return row ? mapJob(row) : null;
	}

	function getResume(id: string) {
		const row = database
			.prepare("select * from resumes where id = ?")
			.get(id) as unknown as ResumeRow | undefined;
		return row ? mapResumeDetails(row) : null;
	}

	function getJobApplication(id: string) {
		const row = database
			.prepare("select * from job_applications where id = ?")
			.get(id) as unknown as JobApplicationRow | undefined;
		return row ? mapJobApplication(row) : null;
	}

	return {
		createJob(input: { id: string; sourceUrl: string; now: number }) {
			database
				.prepare(`
					insert into jobs (
						id, source_url, crawl_status, crawl_error, cleaned_text,
						created_at, updated_at, crawled_at
					) values (?, ?, 'pending', null, '', ?, ?, null)
				`)
				.run(input.id, input.sourceUrl, input.now, input.now);
			return getJob(input.id) as CompanionJob;
		},

		listJobs() {
			return database
				.prepare("select * from jobs order by updated_at desc, created_at desc")
				.all()
				.map((row) => mapJob(row as unknown as JobRow));
		},

		getJob,

		listRunnableJobs() {
			return database
				.prepare(`
					select * from jobs
					where crawl_status in ('pending', 'crawling', 'analyzing')
					order by created_at asc
				`)
				.all()
				.map((row) => mapJob(row as unknown as JobRow));
		},

		markCrawling(id: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'crawling', crawl_error = null, updated_at = ?
					where id = ?
				`)
				.run(now, id);
			return getJob(id);
		},

		markAnalyzing(id: string, cleanedText: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'analyzing', crawl_error = null, cleaned_text = ?, updated_at = ?
					where id = ?
				`)
				.run(cleanedText, now, id);
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
			database
				.prepare(`
					update jobs
					set crawl_status = 'ready',
						crawl_error = null,
						cleaned_text = ?,
						updated_at = ?,
						crawled_at = ?,
						parsed_title = ?,
						parsed_company = ?,
						parsed_location = ?,
						parsed_description = ?,
						fit_score = ?,
						fit_brief_json = ?
					where id = ?
				`)
				.run(
					input.cleanedText,
					input.now,
					input.now,
					input.parsedTitle ?? null,
					input.parsedCompany ?? null,
					input.parsedLocation ?? null,
					input.parsedDescription ?? null,
					input.fitScore ?? null,
					input.fitBriefJson ?? null,
					id,
				);
			return getJob(id);
		},

		markFailed(id: string, input: { error: string; now: number }) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'failed', crawl_error = ?, updated_at = ?
					where id = ?
				`)
				.run(input.error, input.now, id);
			return getJob(id);
		},

		resetForRetry(id: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'pending', crawl_error = null, cleaned_text = '', updated_at = ?
					where id = ?
				`)
				.run(now, id);
			return getJob(id);
		},

		resetForAnalysisRetry(id: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'analyzing', crawl_error = null, updated_at = ?
					where id = ?
				`)
				.run(now, id);
			return getJob(id);
		},

		deleteJob(id: string) {
			const result = database.prepare("delete from jobs where id = ?").run(id);
			return result.changes > 0;
		},

		createResume(input: {
			id: string;
			name: string;
			templateId: string;
			content: ResumeContent;
			now: number;
		}) {
			database
				.prepare(`
					insert into resumes (
						id, name, template_id, last_modified, is_default, content_json
					) values (?, ?, ?, ?, 0, ?)
				`)
				.run(
					input.id,
					input.name,
					input.templateId,
					input.now,
					JSON.stringify(input.content),
				);
			return getResume(input.id) as ResumeDetails;
		},

		listResumes() {
			return database
				.prepare("select * from resumes order by last_modified desc, name asc")
				.all()
				.map((row) => mapResumeSummary(row as unknown as ResumeRow));
		},

		getResume,

		updateResume(
			id: string,
			input: {
				name?: string;
				templateId?: string;
				content?: ResumeContent;
				now: number;
			},
		) {
			const existing = getResume(id);
			if (!existing) {
				return null;
			}

			database
				.prepare(`
					update resumes
					set name = ?,
						template_id = ?,
						content_json = ?,
						last_modified = ?
					where id = ?
				`)
				.run(
					input.name ?? existing.name,
					input.templateId ?? existing.templateId,
					JSON.stringify(input.content ?? existing.content),
					input.now,
					id,
				);
			return getResume(id);
		},

		deleteResume(id: string) {
			const result = database
				.prepare("delete from resumes where id = ?")
				.run(id);
			return result.changes > 0;
		},

		setDefaultResume(id: string, now: number) {
			const existing = getResume(id);
			if (!existing) {
				return null;
			}

			database.exec("BEGIN TRANSACTION;");
			try {
				database
					.prepare("update resumes set is_default = 0 where is_default = 1")
					.run();
				database
					.prepare(
						"update resumes set is_default = 1, last_modified = ? where id = ?",
					)
					.run(now, id);
				database.exec("COMMIT;");
			} catch (error) {
				database.exec("ROLLBACK;");
				throw error;
			}

			return getResume(id);
		},

		clearDefaultResume(now: number) {
			database
				.prepare(
					"update resumes set is_default = 0, last_modified = ? where is_default = 1",
				)
				.run(now);
		},

		getDefaultResume() {
			const row = database
				.prepare("select * from resumes where is_default = 1 limit 1")
				.get() as unknown as ResumeRow | undefined;
			return row ? mapResumeDetails(row) : null;
		},

		listJobApplications() {
			return database
				.prepare(
					"select * from job_applications order by updated_at desc, created_at desc",
				)
				.all()
				.map((row) => mapJobApplication(row as unknown as JobApplicationRow));
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
			database
				.prepare(`
					insert into job_applications (
						id, company, title, location, source_url, description,
						status, source_resume_id, source_resume_name,
						source_resume_snapshot_json, tailored_resume_json,
						fit_brief_json, resume_edit_proposals_json,
						cover_letter_draft_json, notes, follow_up_at,
						created_at, updated_at
					) values (?, ?, ?, ?, ?, ?, 'saved', null, null, null, null, null, '[]', null, '', null, ?, ?)
				`)
				.run(
					input.id,
					input.company,
					input.title,
					input.location,
					input.sourceUrl,
					input.description,
					input.now,
					input.now,
				);
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

			const company =
				input.company !== undefined ? input.company : existing.company;
			const title = input.title !== undefined ? input.title : existing.title;
			const location =
				input.location !== undefined ? input.location : existing.location;
			const sourceUrl =
				input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl;
			const description =
				input.description !== undefined
					? input.description
					: existing.description;
			const status =
				input.status !== undefined ? input.status : existing.status;
			const sourceResumeId =
				input.sourceResumeId !== undefined
					? input.sourceResumeId
					: existing.sourceResumeId;
			const sourceResumeName =
				input.sourceResumeName !== undefined
					? input.sourceResumeName
					: existing.sourceResumeName;

			const sourceResumeSnapshot =
				input.sourceResumeSnapshot !== undefined
					? input.sourceResumeSnapshot
					: existing.sourceResumeSnapshot;
			const tailoredResume =
				input.tailoredResume !== undefined
					? input.tailoredResume
					: existing.tailoredResume;
			const fitBrief =
				input.fitBrief !== undefined ? input.fitBrief : existing.fitBrief;
			const resumeEditProposals =
				input.resumeEditProposals !== undefined
					? input.resumeEditProposals
					: existing.resumeEditProposals;
			const coverLetterDraft =
				input.coverLetterDraft !== undefined
					? input.coverLetterDraft
					: existing.coverLetterDraft;

			const notes = input.notes !== undefined ? input.notes : existing.notes;
			const followUpAt =
				input.followUpAt !== undefined ? input.followUpAt : existing.followUpAt;

			database
				.prepare(`
					update job_applications
					set company = ?,
						title = ?,
						location = ?,
						source_url = ?,
						description = ?,
						status = ?,
						source_resume_id = ?,
						source_resume_name = ?,
						source_resume_snapshot_json = ?,
						tailored_resume_json = ?,
						fit_brief_json = ?,
						resume_edit_proposals_json = ?,
						cover_letter_draft_json = ?,
						notes = ?,
						follow_up_at = ?,
						updated_at = ?
					where id = ?
				`)
				.run(
					company,
					title,
					location,
					sourceUrl,
					description,
					status,
					sourceResumeId,
					sourceResumeName,
					sourceResumeSnapshot ? JSON.stringify(sourceResumeSnapshot) : null,
					tailoredResume ? JSON.stringify(tailoredResume) : null,
					fitBrief ? JSON.stringify(fitBrief) : null,
					resumeEditProposals ? JSON.stringify(resumeEditProposals) : "[]",
					coverLetterDraft ? JSON.stringify(coverLetterDraft) : null,
					notes,
					followUpAt,
					input.now,
					id,
				);

			return getJobApplication(id);
		},

		deleteJobApplication(id: string) {
			const result = database
				.prepare("delete from job_applications where id = ?")
				.run(id);
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

			database.exec("BEGIN TRANSACTION;");
			try {
				database
					.prepare(`
						insert into job_applications (
							id, company, title, location, source_url, description,
							status, source_resume_id, source_resume_name,
							source_resume_snapshot_json, tailored_resume_json,
							fit_brief_json, resume_edit_proposals_json,
							cover_letter_draft_json, notes, follow_up_at,
							created_at, updated_at
						) values (?, ?, ?, ?, ?, ?, 'saved', null, null, null, null, ?, '[]', null, '', null, ?, ?)
					`)
					.run(
						job.id,
						company,
						title,
						location,
						job.sourceUrl,
						description,
						job.fitBriefJson ?? null,
						now,
						now,
					);

				database.prepare("delete from jobs where id = ?").run(job.id);
				database.exec("COMMIT;");
			} catch (error) {
				database.exec("ROLLBACK;");
				throw error;
			}

			return getJobApplication(job.id) as JobApplication;
		},

		close() {
			database.close();
		},
	};
}

export type JobRepository = ReturnType<typeof createJobRepository>;
