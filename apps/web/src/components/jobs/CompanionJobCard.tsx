import { RotateCcw, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import type { LocalCompanionJob } from "#/lib/local-companion-client";
import CompanionJobDetailsDialog from "./CompanionJobDetailsDialog";

interface CompanionJobCardProps {
	job: LocalCompanionJob;
	onRetry: (id: string) => void;
	onRetryAnalyze: (id: string) => void;
	onDelete: (id: string) => void;
	onConvert?: (job: LocalCompanionJob) => void;
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

export default function CompanionJobCard({
	job,
	onRetry,
	onRetryAnalyze,
	onDelete,
	onConvert,
}: CompanionJobCardProps) {
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
							className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
						>
							<Eye className="size-4" />
							View Details
						</button>
					)}
					{isReady && onConvert && (
						<button
							type="button"
							onClick={() => onConvert(job)}
							className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-main px-3 py-1.5 font-bold text-sm text-main-foreground shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer bg-main"
						>
							Convert to Application
						</button>
					)}
					{job.crawlStatus === "failed" && (
						<>
							<button
								type="button"
								onClick={() => onRetry(job.id)}
								className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light"
							>
								<RotateCcw className="size-4" />
								Retry Scrape
							</button>
							{job.cleanedText && (
								<button
									type="button"
									onClick={() => onRetryAnalyze(job.id)}
									className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light"
								>
									<RotateCcw className="size-4" />
									Retry AI Analysis
								</button>
							)}
						</>
					)}
					<button
						type="button"
						onClick={() => onDelete(job.id)}
						className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm shadow-light"
						aria-label="Delete job"
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</article>

			{isDetailsOpen && (
				<CompanionJobDetailsDialog
					job={job}
					isOpen={isDetailsOpen}
					onClose={() => setIsDetailsOpen(false)}
					onConvert={onConvert}
					onRetry={onRetry}
					onRetryAnalyze={onRetryAnalyze}
				/>
			)}
		</>
	);
}
