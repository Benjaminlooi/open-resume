import { Link } from "@tanstack/react-router";
import { Calendar, FileText } from "lucide-react";
import type { JobApplication } from "#/lib/job-application-schema";
import { cn } from "#/lib/utils";

const statusLabels: Record<JobApplication["status"], string> = {
	saved: "Saved",
	analyzing: "Analyzing",
	tailoring: "Tailoring",
	applied: "Applied",
	interviewing: "Interviewing",
	offer: "Offer",
	rejected: "Rejected",
	archived: "Archived",
};

interface JobApplicationCardProps {
	job: JobApplication;
}

export function JobApplicationCard({ job }: JobApplicationCardProps) {
	const resumeLabel =
		job.sourceResumeName ??
		(job.tailoredResume ? "Tailored resume ready" : "Default resume needed");

	return (
		<Link
			to="/jobs/$id"
			params={{ id: job.id }}
			className="block rounded-base border-2 border-border bg-white p-4 shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:shadow-dark"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate font-heading text-xl">{job.title || "Untitled role"}</p>
					<p className="truncate text-muted-foreground text-sm">
						{job.company || "Company needed"}
					</p>
				</div>
				<span
					className={cn(
						"shrink-0 rounded-base border-2 border-border px-2 py-1 font-bold text-xs",
						job.status === "rejected" || job.status === "archived"
							? "bg-muted text-muted-foreground"
							: "bg-main text-main-foreground",
					)}
				>
					{statusLabels[job.status]}
				</span>
			</div>
			<div className="mt-4 grid gap-2 text-sm">
				<div className="flex items-center gap-2 text-muted-foreground">
					<FileText className="size-4" aria-hidden="true" />
					<span className="truncate">{resumeLabel}</span>
				</div>
				<div className="flex items-center gap-2 text-muted-foreground">
					<Calendar className="size-4" aria-hidden="true" />
					<span>Updated {new Date(job.updatedAt).toLocaleDateString()}</span>
				</div>
			</div>
		</Link>
	);
}
