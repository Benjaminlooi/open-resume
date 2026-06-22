import { useNavigate } from "@tanstack/react-router";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useJobPostingStore } from "#/features/job-postings/job-posting-store";
import type { LocalJobPosting } from "#/lib/local-companion-client";
import JobPostingDetailsDialog from "./JobPostingDetailsDialog";

interface JobPostingCardProps {
	job: LocalJobPosting;
}

function getHostname(sourceUrl: string) {
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return sourceUrl;
	}
}

function getPreview(text: string) {
	return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

export default function JobPostingCard({ job }: JobPostingCardProps) {
	const { convertJobToApplication, retryJobCrawl, retryJobAnalyze, deleteJob } =
		useJobPostingStore();
	const navigate = useNavigate();
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const hostname = getHostname(job.sourceUrl);
	const isReady = job.crawlStatus === "ready";
	const title = isReady ? job.parsedTitle || hostname : hostname;
	const company = isReady ? job.parsedCompany || hostname : null;

	const hasCleanedText = !!job.cleanedText;

	return (
		<>
			<article className="flex min-h-52 flex-col gap-3 rounded-base border-2 border-border bg-white p-4 shadow-shadow">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h3 className="break-all font-heading text-lg">{title}</h3>
						{isReady && company && (
							<p className="break-all font-bold text-sm text-gray-700">
								{company}
							</p>
						)}
						<p className="break-all text-muted-foreground text-xs">
							{job.sourceUrl}
						</p>
					</div>
					<div className="flex flex-col items-end gap-1.5 shrink-0">
						<span className="rounded-base border-2 border-border bg-[#F0F9FF] px-2 py-1 font-bold text-xs uppercase">
							{job.crawlStatus === "failed"
								? job.cleanedText
									? "FAILED (ANALYSIS)"
									: "FAILED (SCRAPE)"
								: job.crawlStatus.toUpperCase()}
						</span>
						{isReady && job.fitScore !== null && job.fitScore !== undefined && (
							<span
								className={`rounded-base border-2 border-border px-2 py-0.5 font-bold text-xs uppercase ${
									job.fitScore >= 80
										? "bg-[#BBF7D0]"
										: job.fitScore >= 60
											? "bg-[#FEF08A]"
											: "bg-[#FECACA]"
								}`}
							>
								{job.fitScore}% Match
							</span>
						)}
					</div>
				</div>

				{job.crawlStatus === "ready" && (
					<p className="line-clamp-4 text-sm">{getPreview(job.cleanedText)}</p>
				)}

				{job.crawlStatus === "failed" && (
					<p className="rounded-base border-2 border-border bg-red-100 p-2 text-red-900 text-sm">
						{job.cleanedText
							? `AI Analysis failed: ${job.crawlError ?? "Analysis failed."}`
							: `Scrape failed: ${job.crawlError ?? "Crawl failed."}`}
					</p>
				)}

				{job.crawlStatus === "pending" && (
					<p className="text-muted-foreground text-sm">
						Job added to queue. Scrape is pending...
					</p>
				)}

				{job.crawlStatus === "crawling" && (
					<p className="text-muted-foreground text-sm">
						Scraping job description from URL...
					</p>
				)}

				{job.crawlStatus === "analyzing" && (
					<p className="text-muted-foreground text-sm">
						Scraping succeeded. Analyzing job description with AI...
					</p>
				)}

				<div className="mt-auto flex justify-end gap-2">
					{hasCleanedText && (
						<button
							type="button"
							onClick={() => setIsDetailsOpen(true)}
							className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
						>
							<Eye className="size-4" />
							View Details
						</button>
					)}
					{isReady && (
						<button
							type="button"
							onClick={async () => {
								const appId = await convertJobToApplication(job);
								navigate({ to: "/jobs/$id", params: { id: appId } });
							}}
							className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-main px-3 py-1.5 font-bold text-sm text-main-foreground shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer bg-main"
						>
							Convert to Application
						</button>
					)}
					{job.crawlStatus === "failed" && (
						<>
							<button
								type="button"
								onClick={() => retryJobCrawl(job.id)}
								className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
							>
								<RotateCcw className="size-4" />
								Retry Scrape
							</button>
							{job.cleanedText && (
								<button
									type="button"
									onClick={() => retryJobAnalyze(job.id)}
									className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
								>
									<RotateCcw className="size-4" />
									Retry AI Analysis
								</button>
							)}
						</>
					)}
					<button
						type="button"
						onClick={() => deleteJob(job.id)}
						className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
						aria-label="Delete job posting"
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</article>

			{isDetailsOpen && (
				<JobPostingDetailsDialog
					job={job}
					isOpen={isDetailsOpen}
					onClose={() => setIsDetailsOpen(false)}
				/>
			)}
		</>
	);
}
