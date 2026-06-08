import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { ApplicationTrackerStep } from "#/components/jobs/ApplicationTrackerStep";
import { CoverLetterStep } from "#/components/jobs/CoverLetterStep";
import { FitBriefStep } from "#/components/jobs/FitBriefStep";
import { JobDetailsStep } from "#/components/jobs/JobDetailsStep";
import { ResumeTailoringStep } from "#/components/jobs/ResumeTailoringStep";
import { Button } from "#/components/ui/button";
import type { JobApplication } from "#/lib/job-application-schema";
import {
	exportJobApplicationToJson,
	exportJobApplicationToMarkdown,
} from "#/lib/job-application-export";
import { useJobApplicationStore } from "#/lib/job-application-store";

export const Route = createFileRoute("/jobs/$id")({
	component: JobWorkspace,
});

function JobWorkspace() {
	const { id } = Route.useParams();
	const job = useJobApplicationStore((state) =>
		state.jobs.find((item) => item.id === id),
	);

	if (!job) {
		return (
			<main className="container mx-auto min-h-screen px-5 pt-[110px]">
				<Button asChild variant="neutral">
					<Link to="/jobs">
						<ArrowLeft className="size-4" aria-hidden="true" />
						Back to jobs
					</Link>
				</Button>
				<div className="mt-8 rounded-base border-2 border-border bg-white p-6">
					<h1 className="font-heading text-3xl">Job not found</h1>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-secondary-background pt-[92px]">
			<div className="container mx-auto grid gap-6 px-5 py-8">
				<div className="flex flex-wrap items-start justify-between gap-4 border-border border-b-2 pb-6">
					<div>
						<Button asChild variant="neutral" size="sm">
							<Link to="/jobs">
								<ArrowLeft className="size-4" aria-hidden="true" />
								Back
							</Link>
						</Button>
						<h1 className="mt-4 font-heading text-4xl">
							{job.title || "Untitled role"}
						</h1>
						<p className="mt-1 text-muted-foreground">
							{job.company || "Company needed"}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<ExportButton job={job} type="json" />
						<ExportButton job={job} type="markdown" />
					</div>
				</div>

				<div className="rounded-base border-2 border-border bg-main p-4 text-main-foreground">
					<p className="font-heading text-lg">Next action</p>
					<p className="text-sm">{getNextAction(job)}</p>
				</div>

				<div className="grid gap-6">
					<JobDetailsStep job={job} />
					<FitBriefStep job={job} />
					<ResumeTailoringStep job={job} />
					<CoverLetterStep job={job} />
					<ApplicationTrackerStep job={job} />
				</div>
			</div>
		</main>
	);
}

function getNextAction(job: JobApplication) {
	if (!job.company.trim() || !job.title.trim()) {
		return "Add the company and title.";
	}
	if (!job.description.trim()) {
		return "Paste the job description.";
	}
	if (!job.fitBrief) {
		return "Generate a fit brief before tailoring.";
	}
	if (!job.tailoredResume) {
		return "Create a tailored resume snapshot.";
	}
	if (job.resumeEditProposals.some((proposal) => proposal.status === "pending")) {
		return "Review pending resume edit proposals.";
	}
	if (!job.coverLetterDraft) {
		return "Generate or draft a cover letter.";
	}
	if (job.status === "saved" || job.status === "tailoring") {
		return "Update the tracker when you apply.";
	}
	return "Keep notes and follow-up dates current.";
}

function ExportButton({
	job,
	type,
}: {
	job: JobApplication;
	type: "json" | "markdown";
}) {
	const handleExport = () => {
		const content =
			type === "json"
				? exportJobApplicationToJson(job)
				: exportJobApplicationToMarkdown(job);
		const blob = new Blob([content], {
			type:
				type === "json"
					? "application/json;charset=utf-8"
					: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${toFilename(`${job.company}-${job.title}`)}.${type === "json" ? "json" : "md"}`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Button type="button" variant="neutral" onClick={handleExport}>
			<Download className="size-4" aria-hidden="true" />
			{type === "json" ? "JSON" : "Markdown"}
		</Button>
	);
}

function toFilename(value: string) {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "job-application"
	);
}
