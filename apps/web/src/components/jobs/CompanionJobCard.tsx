import { RotateCcw, Trash2 } from "lucide-react";
import type { LocalCompanionJob } from "#/lib/local-companion-client";

interface CompanionJobCardProps {
	job: LocalCompanionJob;
	onRetry: (id: string) => void;
	onDelete: (id: string) => void;
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
	onDelete,
}: CompanionJobCardProps) {
	return (
		<article className="flex min-h-52 flex-col gap-3 rounded-base border-2 border-border bg-white p-4 shadow-shadow">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="break-all font-heading text-lg">
						{getHostname(job.sourceUrl)}
					</h3>
					<p className="break-all text-muted-foreground text-xs">
						{job.sourceUrl}
					</p>
				</div>
				<span className="rounded-base border-2 border-border bg-[#F0F9FF] px-2 py-1 font-bold text-xs uppercase">
					{job.crawlStatus}
				</span>
			</div>

			{job.crawlStatus === "ready" && (
				<p className="line-clamp-4 text-sm">{getPreview(job.cleanedText)}</p>
			)}

			{job.crawlStatus === "failed" && (
				<p className="rounded-base border-2 border-border bg-red-100 p-2 text-red-900 text-sm">
					{job.crawlError ?? "Crawl failed."}
				</p>
			)}

			{(job.crawlStatus === "pending" || job.crawlStatus === "crawling") && (
				<p className="text-muted-foreground text-sm">
					Crawl is queued locally. This card will update when the companion
					finishes.
				</p>
			)}

			<div className="mt-auto flex justify-end gap-2">
				{job.crawlStatus === "failed" && (
					<button
						type="button"
						onClick={() => onRetry(job.id)}
						className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm"
					>
						<RotateCcw className="size-4" />
						Retry
					</button>
				)}
				<button
					type="button"
					onClick={() => onDelete(job.id)}
					className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm"
					aria-label="Delete job"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
		</article>
	);
}
