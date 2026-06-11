import { DatabaseSync } from "node:sqlite";
import type { CompanionJob, CrawlStatus } from "../schema.js";

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

export function createJobRepository(path: string) {
	const database = new DatabaseSync(path);

	// Inspect existing table schema
	const columns = database
		.prepare("PRAGMA table_info(jobs)")
		.all() as Array<{ name: string }>;
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
	`);

	function getJob(id: string) {
		const row = database
			.prepare("select * from jobs where id = ?")
			.get(id) as unknown as JobRow | undefined;
		return row ? mapJob(row) : null;
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
					where crawl_status in ('pending', 'crawling')
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

		markAnalyzing(id: string, now: number) {
			database
				.prepare(`
					update jobs
					set crawl_status = 'analyzing', crawl_error = null, updated_at = ?
					where id = ?
				`)
				.run(now, id);
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
					set crawl_status = 'pending', crawl_error = null, updated_at = ?
					where id = ?
				`)
				.run(now, id);
			return getJob(id);
		},

		deleteJob(id: string) {
			const result = database.prepare("delete from jobs where id = ?").run(id);
			return result.changes > 0;
		},

		close() {
			database.close();
		},
	};
}

export type JobRepository = ReturnType<typeof createJobRepository>;
