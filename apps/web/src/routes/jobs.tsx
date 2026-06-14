import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import DashboardHeader from "#/components/dashboard/DashboardHeader";
import CompanionJobCard from "#/components/jobs/CompanionJobCard";
import JobApplicationCard from "#/components/jobs/JobApplicationCard";
import NewJobApplicationModal from "#/components/jobs/NewJobApplicationModal";
import PipelineIntegrityPanel from "#/components/jobs/PipelineIntegrityPanel";
import { useJobApplicationStore } from "#/lib/job-application-store";
import {
	deleteCompanionJob,
	type LocalCompanionJob,
	listCompanionJobs,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
} from "#/lib/local-companion-client";

export const Route = createFileRoute("/jobs")({
	component: JobsDashboard,
});

function getHostname(sourceUrl: string) {
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return sourceUrl;
	}
}

function JobsDashboard() {
	const navigate = useNavigate();
	const [companionJobs, setCompanionJobs] = useState<LocalCompanionJob[]>([]);
	const [loadError, setLoadError] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	// Collapsible state
	const [isQueueExpanded, setIsQueueExpanded] = useState(false);

	// Filter and search states
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("active");

	// Active job applications store
	const {
		jobApplications,
		createJobApplication,
		saveFitBrief,
		deleteJobApplication,
	} = useJobApplicationStore();

	const hasPendingJobs = companionJobs.some((job) =>
		["pending", "crawling", "analyzing"].includes(job.crawlStatus),
	);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isMounted) return;

		let active = true;

		async function loadJobs() {
			try {
				const jobs = await listCompanionJobs();
				if (active) {
					setCompanionJobs(jobs);
					setLoadError("");
				}
			} catch (err) {
				if (active) {
					setLoadError(
						err instanceof Error
							? err.message
							: "Failed to load jobs from companion",
					);
				}
			}
		}

		loadJobs();
		const intervalDelay = hasPendingJobs ? 2000 : 10000;
		const interval = setInterval(loadJobs, intervalDelay);

		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [isMounted, hasPendingJobs]);

	const handleRetry = async (id: string) => {
		try {
			await retryCompanionJobCrawl(id);
			const jobs = await listCompanionJobs();
			setCompanionJobs(jobs);
		} catch (err) {
			setLoadError(
				err instanceof Error ? err.message : "Failed to retry crawl",
			);
		}
	};

	const handleRetryAnalyze = async (id: string) => {
		try {
			await retryCompanionJobAnalyze(id);
			const jobs = await listCompanionJobs();
			setCompanionJobs(jobs);
		} catch (err) {
			setLoadError(
				err instanceof Error ? err.message : "Failed to retry analysis",
			);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteCompanionJob(id);
			const jobs = await listCompanionJobs();
			setCompanionJobs(jobs);
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : "Failed to delete job");
		}
	};

	const handleConvert = async (job: LocalCompanionJob) => {
		const hostname = getHostname(job.sourceUrl);
		const company = job.parsedCompany || hostname;
		const title = job.parsedTitle || "Untitled Job";
		const location = job.parsedLocation || "";
		const sourceUrl = job.sourceUrl;
		const description = job.parsedDescription || job.cleanedText;

		const appId = createJobApplication(
			company,
			title,
			location,
			sourceUrl,
			description,
		);

		if (job.fitBriefJson) {
			try {
				const fitBrief = JSON.parse(job.fitBriefJson);
				saveFitBrief(appId, fitBrief);
			} catch (e) {
				console.error("Failed to parse fitBriefJson", e);
			}
		}

		try {
			await deleteCompanionJob(job.id);
			// Refresh list of companion jobs
			const jobs = await listCompanionJobs();
			setCompanionJobs(jobs);
		} catch (err) {
			console.error("Failed to delete companion job during conversion", err);
		}

		navigate({ to: "/jobs/$id", params: { id: appId } });
	};

	const pendingJobs = companionJobs.filter((job) =>
		["pending", "crawling", "analyzing"].includes(job.crawlStatus),
	);
	const readyJobs = companionJobs.filter((job) => job.crawlStatus === "ready");
	const failedJobs = companionJobs.filter(
		(job) => job.crawlStatus === "failed",
	);

	// Filtering applications
	const filteredApplications = jobApplications.filter((app) => {
		const matchesSearch =
			app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
			app.title.toLowerCase().includes(searchQuery.toLowerCase());

		if (!matchesSearch) return false;

		if (statusFilter === "active") {
			return app.status !== "rejected" && app.status !== "archived";
		}
		if (statusFilter === "all") {
			return true;
		}
		return app.status === statusFilter;
	});

	const statuses: { value: string; label: string }[] = [
		{ value: "active", label: "Active" },
		{ value: "all", label: "All" },
		{ value: "saved", label: "Saved" },
		{ value: "analyzing", label: "Analyzing" },
		{ value: "tailoring", label: "Tailoring" },
		{ value: "applied", label: "Applied" },
		{ value: "interviewing", label: "Interviewing" },
		{ value: "offer", label: "Offer" },
		{ value: "rejected", label: "Rejected" },
		{ value: "archived", label: "Archived" },
	];

	return (
		<>
			<DashboardHeader />
			<main className="container mx-auto p-8 pt-[100px] text-[#082F49]">
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-4xl font-heading">Jobs Tracker</h1>
						<p className="text-muted-foreground mt-1">
							Manage your job applications pipeline and companion crawler queue.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-main px-4 py-2 font-base text-main-foreground text-sm shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none dark:shadow-dark cursor-pointer bg-main"
					>
						<Plus className="size-4" />
						Add Job URL
					</button>
				</div>

				{loadError && (
					<div className="mb-6 rounded-base border-2 border-border bg-red-100 p-4 font-bold text-red-900 text-sm">
						{loadError}
					</div>
				)}

				{/* Collapsible Companion Queue Panel */}
				{isMounted && (
					<div className="mb-8 border-2 border-border rounded-base bg-[#F0F9FF] shadow-shadow">
						<button
							type="button"
							onClick={() => setIsQueueExpanded(!isQueueExpanded)}
							className="w-full flex justify-between items-center p-4 font-heading text-md md:text-lg text-left cursor-pointer hover:bg-main/5 transition-colors"
						>
							<span>
								Companion Queue: {readyJobs.length} ready, {pendingJobs.length}{" "}
								pending, {failedJobs.length} failed. Click to{" "}
								{isQueueExpanded ? "collapse" : "expand"}.
							</span>
							<span className="text-2xl font-bold">
								{isQueueExpanded ? "−" : "+"}
							</span>
						</button>

						{isQueueExpanded && (
							<div className="border-t-2 border-border p-6 bg-white rounded-b-base">
								<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
									{/* Pending & Crawling Section */}
									<section className="flex flex-col gap-4">
										<div className="flex items-center justify-between rounded-base border-2 border-border bg-[#FEF08A] px-4 py-2 shadow-shadow">
											<h2 className="font-heading text-lg">
												Pending / Crawling
											</h2>
											<span className="rounded-full bg-white px-2 py-0.5 font-bold text-sm">
												{pendingJobs.length}
											</span>
										</div>
										{pendingJobs.length === 0 ? (
											<div className="rounded-base border-2 border-dashed border-border bg-white p-8 text-center text-muted-foreground text-sm">
												No pending crawls.
											</div>
										) : (
											<div className="flex flex-col gap-4">
												{pendingJobs.map((job) => (
													<CompanionJobCard
														key={job.id}
														job={job}
														onRetry={handleRetry}
														onRetryAnalyze={handleRetryAnalyze}
														onDelete={handleDelete}
													/>
												))}
											</div>
										)}
									</section>

									{/* Ready Section */}
									<section className="flex flex-col gap-4">
										<div className="flex items-center justify-between rounded-base border-2 border-border bg-[#BBF7D0] px-4 py-2 shadow-shadow">
											<h2 className="font-heading text-lg">Ready</h2>
											<span className="rounded-full bg-white px-2 py-0.5 font-bold text-sm">
												{readyJobs.length}
											</span>
										</div>
										{readyJobs.length === 0 ? (
											<div className="rounded-base border-2 border-dashed border-border bg-white p-8 text-center text-muted-foreground text-sm">
												No ready jobs.
											</div>
										) : (
											<div className="flex flex-col gap-4">
												{readyJobs.map((job) => (
													<CompanionJobCard
														key={job.id}
														job={job}
														onRetry={handleRetry}
														onRetryAnalyze={handleRetryAnalyze}
														onDelete={handleDelete}
														onConvert={handleConvert}
													/>
												))}
											</div>
										)}
									</section>

									{/* Failed Section */}
									<section className="flex flex-col gap-4">
										<div className="flex items-center justify-between rounded-base border-2 border-border bg-[#FECACA] px-4 py-2 shadow-shadow">
											<h2 className="font-heading text-lg">Failed</h2>
											<span className="rounded-full bg-white px-2 py-0.5 font-bold text-sm">
												{failedJobs.length}
											</span>
										</div>
										{failedJobs.length === 0 ? (
											<div className="rounded-base border-2 border-dashed border-border bg-white p-8 text-center text-muted-foreground text-sm">
												No failed crawls.
											</div>
										) : (
											<div className="flex flex-col gap-4">
												{failedJobs.map((job) => (
													<CompanionJobCard
														key={job.id}
														job={job}
														onRetry={handleRetry}
														onRetryAnalyze={handleRetryAnalyze}
														onDelete={handleDelete}
													/>
												))}
											</div>
										)}
									</section>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Pipeline Integrity Panel */}
				{isMounted && <PipelineIntegrityPanel />}

				{/* Active Job Applications List */}
				{isMounted && (
					<div className="mt-8">
						<div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
							<div className="w-full md:w-72">
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by company or title..."
									className="w-full rounded-base border-2 border-border bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-main"
								/>
							</div>
							<div className="flex flex-wrap gap-2 w-full md:w-auto">
								{statuses.map((status) => {
									const isActive = statusFilter === status.value;
									return (
										<button
											key={status.value}
											type="button"
											onClick={() => setStatusFilter(status.value)}
											className={`rounded-base border-2 border-border px-3 py-1 font-bold text-xs uppercase shadow-light transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer ${
												isActive
													? "bg-[#38BDF8] text-[#082F49] shadow-none"
													: "bg-white text-muted-foreground"
											}`}
										>
											{status.label}
										</button>
									);
								})}
							</div>
						</div>

						<h2 className="text-2xl font-heading mb-4 text-[#082F49]">
							Active Applications
						</h2>
						{filteredApplications.length === 0 ? (
							<div className="rounded-base border-2 border-dashed border-border bg-white p-12 text-center text-muted-foreground text-sm">
								No applications found.
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{filteredApplications.map((app) => (
									<JobApplicationCard
										key={app.id}
										application={app}
										onDelete={deleteJobApplication}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{isModalOpen && (
					<NewJobApplicationModal
						onClose={() => setIsModalOpen(false)}
						onCreated={async () => {
							try {
								const jobs = await listCompanionJobs();
								setCompanionJobs(jobs);
							} catch (err) {
								setLoadError(
									err instanceof Error ? err.message : "Failed to load jobs",
								);
							}
						}}
					/>
				)}
			</main>
		</>
	);
}
