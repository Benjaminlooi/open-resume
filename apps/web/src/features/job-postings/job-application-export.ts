import type {
	CoverLetterDraft,
	JobApplication,
} from "#/features/job-postings/job-application-schema";
import { exportResumeToMarkdown } from "#/lib/resume-markdown";
import type { Resume } from "#/lib/resume-schema";

/**
 * Serializes the tailored resume to a clean markdown document.
 */
export function exportTailoredResumeToMarkdown(tailoredResume: Resume): string {
	return exportResumeToMarkdown(tailoredResume);
}

/**
 * Formats the cover letter draft text with a nice title, date, and body in markdown.
 */
export function exportCoverLetterToMarkdown(
	coverLetter: CoverLetterDraft,
	jobTitle: string,
	company: string,
): string {
	const dateStr = new Date(
		coverLetter.updatedAt || coverLetter.generatedAt,
	).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return `# Cover Letter: ${jobTitle} at ${company}\n\n**Date:** ${dateStr}\n\n${coverLetter.content}\n`;
}

/**
 * Serializes the entire JobApplication object to JSON with 2-space formatting.
 */
export function exportApplicationPacketToJson(
	jobApplication: JobApplication,
): string {
	return JSON.stringify(jobApplication, null, 2);
}

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(
	content: string,
	filename: string,
	contentType: string,
): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}
	const blob = new Blob([content], { type: contentType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
