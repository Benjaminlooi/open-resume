import type { JobApplication } from "./job-application-schema";

export const exportJobApplicationToJson = (job: JobApplication) =>
	JSON.stringify(job, null, 2);

export const exportJobApplicationToMarkdown = (job: JobApplication) => {
	const lines = [
		`# ${job.title || "Untitled role"} at ${job.company || "Unknown company"}`,
		"",
		`Status: ${job.status}`,
		job.location ? `Location: ${job.location}` : null,
		job.sourceUrl ? `Source: ${job.sourceUrl}` : null,
		"",
		"## Job Description",
		job.description || "_No job description saved._",
		"",
		"## Fit Brief",
		job.fitBrief
			? [
					job.fitBrief.roleSummary,
					"",
					"### Strengths",
					...job.fitBrief.strengths.map((item) => `- ${item}`),
					"",
					"### Gaps",
					...job.fitBrief.gaps.map((item) => `- ${item}`),
					"",
					"### Next Actions",
					...job.fitBrief.nextActions.map((item) => `- ${item}`),
				].join("\n")
			: "_No fit brief generated._",
		"",
		"## Cover Letter",
		job.coverLetterDraft?.content || "_No cover letter drafted._",
		"",
		"## Notes",
		job.notes || "_No notes._",
	].filter((line): line is string => line !== null);

	return lines.join("\n");
};
