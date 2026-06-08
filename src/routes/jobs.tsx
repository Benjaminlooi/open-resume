import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { JobApplicationCard } from "#/components/jobs/JobApplicationCard";
import { NewJobApplicationModal } from "#/components/jobs/NewJobApplicationModal";
import { Button } from "#/components/ui/button";
import type { JobApplicationStatus } from "#/lib/job-application-schema";
import { useJobApplicationStore } from "#/lib/job-application-store";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/jobs")({
	component: JobsDashboard,
});

const filters: Array<{ label: string; value: JobApplicationStatus | "all" }> = [
	{ label: "All", value: "all" },
	{ label: "Saved", value: "saved" },
	{ label: "Tailoring", value: "tailoring" },
	{ label: "Applied", value: "applied" },
	{ label: "Interviewing", value: "interviewing" },
	{ label: "Archived", value: "archived" },
];

function JobsDashboard() {
	const jobs = useJobApplicationStore((state) => state.jobs);
	const [filter, setFilter] = useState<JobApplicationStatus | "all">("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const visibleJobs = useMemo(
		() =>
			jobs
				.filter((job) => filter === "all" || job.status === filter)
				.sort((a, b) => b.updatedAt - a.updatedAt),
		[jobs, filter],
	);

	return (
		<main className="min-h-screen bg-secondary-background pt-[92px]">
			<div className="container mx-auto px-5 py-8">
				<div className="flex flex-wrap items-center justify-between gap-4 border-border border-b-2 pb-6">
					<div>
						<h1 className="font-heading text-4xl">Job applications</h1>
						<p className="mt-2 text-muted-foreground">
							Track each role with its job description, tailored resume, letter,
							and follow-up notes.
						</p>
					</div>
					<Button onClick={() => setIsModalOpen(true)} className="gap-2">
						<Plus className="size-4" aria-hidden="true" />
						New job
					</Button>
				</div>

				<div className="mt-6 flex flex-wrap gap-2">
					{filters.map((item) => (
						<button
							key={item.value}
							type="button"
							onClick={() => setFilter(item.value)}
							className={cn(
								"rounded-base border-2 border-border px-3 py-2 font-bold text-sm transition-colors",
								filter === item.value
									? "bg-main text-main-foreground"
									: "bg-white text-foreground hover:bg-main/10",
							)}
						>
							{item.label}
						</button>
					))}
				</div>

				{visibleJobs.length === 0 ? (
					<div className="mt-10 flex min-h-80 flex-col items-center justify-center rounded-base border-2 border-dashed border-border bg-white p-8 text-center">
						<BriefcaseBusiness
							className="size-10 text-muted-foreground"
							aria-hidden="true"
						/>
						<h2 className="mt-4 font-heading text-2xl">
							{jobs.length === 0 ? "No jobs yet" : "No jobs in this filter"}
						</h2>
						<p className="mt-2 max-w-md text-muted-foreground">
							{jobs.length === 0
								? "Create a job packet to analyze fit, tailor a resume snapshot, draft a cover letter, and track status."
								: "Change filters or update a job status from its workspace."}
						</p>
						{jobs.length === 0 && (
							<Button
								type="button"
								onClick={() => setIsModalOpen(true)}
								className="mt-5 gap-2"
							>
								<Plus className="size-4" aria-hidden="true" />
								New job
							</Button>
						)}
					</div>
				) : (
					<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{visibleJobs.map((job) => (
							<JobApplicationCard key={job.id} job={job} />
						))}
					</div>
				)}
			</div>
			{isModalOpen && (
				<NewJobApplicationModal onClose={() => setIsModalOpen(false)} />
			)}
		</main>
	);
}
