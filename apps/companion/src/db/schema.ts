import { sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const jobPostings = sqliteTable(
	"job_postings",
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
		index("job_postings_updated_at_idx").on(table.updatedAt),
		index("job_postings_runnable_idx").on(table.crawlStatus, table.createdAt),
	],
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
		uniqueIndex("resumes_default_idx")
			.on(table.isDefault)
			.where(sql`${table.isDefault} = 1`),
		index("resumes_last_modified_idx").on(table.lastModified),
	],
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
	(table) => [index("job_applications_updated_at_idx").on(table.updatedAt)],
);
