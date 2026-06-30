CREATE TABLE IF NOT EXISTS `job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`source_url` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`source_resume_id` text,
	`source_resume_name` text,
	`source_resume_snapshot_json` text,
	`tailored_resume_json` text,
	`fit_brief_json` text,
	`resume_edit_proposals_json` text,
	`cover_letter_draft_json` text,
	`notes` text DEFAULT '' NOT NULL,
	`follow_up_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_applications_updated_at_idx` ON `job_applications` (`updated_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`crawl_status` text NOT NULL,
	`crawl_error` text,
	`cleaned_text` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`crawled_at` integer,
	`parsed_title` text,
	`parsed_company` text,
	`parsed_location` text,
	`parsed_description` text,
	`fit_score` real,
	`fit_brief_json` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_postings_updated_at_idx` ON `job_postings` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `job_postings_runnable_idx` ON `job_postings` (`crawl_status`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`template_id` text NOT NULL,
	`last_modified` integer NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`content_json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `resumes_default_idx` ON `resumes` (`is_default`) WHERE "resumes"."is_default" = 1;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `resumes_last_modified_idx` ON `resumes` (`last_modified`);