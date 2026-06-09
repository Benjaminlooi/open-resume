import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import JobApplicationCard from "#/components/jobs/JobApplicationCard";
import NewJobApplicationModal from "#/components/jobs/NewJobApplicationModal";
import PipelineIntegrityPanel from "#/components/jobs/PipelineIntegrityPanel";
import { useJobApplicationStore } from "#/lib/job-application-store";

export const Route = createFileRoute("/jobs")({
	component: JobsDashboard,
});

const FILTERS = [
	"All",
	"Saved",
	"Analyzing",
	"Tailoring",
	"Applied",
	"Interviewing",
	"Offer",
	"Rejected",
	"Archived",
] as const;

type FilterType = (typeof FILTERS)[number];

function JobsDashboard() {
	const { jobApplications, deleteJobApplication } = useJobApplicationStore();
	const [activeFilter, setActiveFilter] = useState<FilterType>("All");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const filteredApplications = jobApplications.filter((app) => {
		if (activeFilter === "All") return true;
		return app.status === activeFilter.toLowerCase();
	});

	return (
		<main className="container mx-auto p-8 pt-[100px] text-[#082F49]">
			<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-4xl font-heading">Jobs Tracker</h1>
					<p className="text-muted-foreground mt-1">
						Manage, analyze, and tailor your job applications.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsModalOpen(true)}
					className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-main px-4 py-2 font-base text-main-foreground text-sm shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:shadow-dark cursor-pointer bg-main"
				>
					<Plus className="size-4" />
					New Job Application
				</button>
			</div>

			{isMounted && <PipelineIntegrityPanel />}

			{/* Filters */}
			<div className="mb-8 flex flex-wrap gap-2">
				{FILTERS.map((filter) => {
					const count = jobApplications.filter((app) => {
						if (filter === "All") return true;
						return app.status === filter.toLowerCase();
					}).length;

					const isActive = activeFilter === filter;

					return (
						<button
							key={filter}
							type="button"
							onClick={() => setActiveFilter(filter)}
							className={`px-3 py-1.5 rounded-base border-2 font-bold text-sm transition-all cursor-pointer ${
								isActive
									? "bg-[#38BDF8] text-[#082F49] border-border shadow-shadow"
									: "bg-white text-muted-foreground border-border/60 hover:border-border hover:shadow-light"
							}`}
						>
							{filter} ({count})
						</button>
					);
				})}
			</div>

			{/* Job List / Grid */}
			{isMounted && (
				<>
					{filteredApplications.length === 0 ? (
						<div className="border-2 border-dashed border-border rounded-base p-12 bg-white flex flex-col items-center justify-center text-center">
							<div className="size-16 rounded-full border-2 border-border bg-[#F0F9FF] flex items-center justify-center mb-4 text-main">
								<Briefcase className="size-8 text-[#0EA5E9]" />
							</div>
							<h3 className="text-xl font-heading mb-1">
								No job applications found
							</h3>
							<p className="text-muted-foreground max-w-md mb-6">
								{activeFilter === "All"
									? "Get started by adding your first job application target."
									: `You don't have any job applications with status "${activeFilter}".`}
							</p>
							<button
								type="button"
								onClick={() => setIsModalOpen(true)}
								className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-main px-4 py-2 font-base text-main-foreground text-sm shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:shadow-dark cursor-pointer bg-main"
							>
								<Plus className="size-4" />
								Add Job Application
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{filteredApplications.map((app) => (
								<JobApplicationCard
									key={app.id}
									application={app}
									onDelete={deleteJobApplication}
								/>
							))}
						</div>
					)}
				</>
			)}

			{isModalOpen && (
				<NewJobApplicationModal onClose={() => setIsModalOpen(false)} />
			)}
		</main>
	);
}
