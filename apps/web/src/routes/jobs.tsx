import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import CompanionJobCard from "#/components/jobs/CompanionJobCard";
import NewJobApplicationModal from "#/components/jobs/NewJobApplicationModal";
import DashboardHeader from "#/components/dashboard/DashboardHeader";
import {
	type LocalCompanionJob,
	deleteCompanionJob,
	listCompanionJobs,
	retryCompanionJobCrawl,
} from "#/lib/local-companion-client";

export const Route = createFileRoute("/jobs")({
	component: JobsDashboard,
});

function JobsDashboard() {
	const [companionJobs, setCompanionJobs] = useState<LocalCompanionJob[]>([]);
	const [loadError, setLoadError] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

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
					setLoadError(err instanceof Error ? err.message : "Failed to load jobs from companion");
				}
			}
		}

		loadJobs();
		const interval = setInterval(loadJobs, 2000);

		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [isMounted]);

	const handleRetry = async (id: string) => {
		try {
			await retryCompanionJobCrawl(id);
			const jobs = await listCompanionJobs();
			setCompanionJobs(jobs);
		} catch (err) {
			setLoadError(err instanceof Error ? err.message : "Failed to retry crawl");
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

	const pendingJobs = companionJobs.filter((job) =>
		["pending", "crawling"].includes(job.crawlStatus),
	);
	const readyJobs = companionJobs.filter((job) => job.crawlStatus === "ready");
	const failedJobs = companionJobs.filter((job) => job.crawlStatus === "failed");

	return (
		<>
			<DashboardHeader />
			<main className="container mx-auto p-8 pt-[100px] text-[#082F49]">
			<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-4xl font-heading">Jobs Tracker</h1>
					<p className="text-muted-foreground mt-1">
						Manage your companion-owned job crawler queue and status.
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

			{isMounted && (
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
					{/* Pending & Crawling Section */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center justify-between rounded-base border-2 border-border bg-[#FEF08A] px-4 py-2 shadow-shadow">
							<h2 className="font-heading text-lg">Pending / Crawling</h2>
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
										onDelete={handleDelete}
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
										onDelete={handleDelete}
									/>
								))}
							</div>
						)}
					</section>
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
							setLoadError(err instanceof Error ? err.message : "Failed to load jobs");
						}
					}}
				/>
			)}
		</main>
		</>
	);
}
