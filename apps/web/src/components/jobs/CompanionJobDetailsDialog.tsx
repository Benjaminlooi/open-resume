import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { LocalCompanionJob } from "#/lib/local-companion-client";
import { companionBaseUrl } from "#/lib/local-companion-client";

interface CompanionJobDetailsDialogProps {
	job: LocalCompanionJob;
	isOpen: boolean;
	onClose: () => void;
	onConvert?: (job: LocalCompanionJob) => void;
	onRetry?: (id: string) => void;
	onRetryAnalyze?: (id: string) => void;
}

interface FitBrief {
	roleSummary: string;
	requirements?: string[];
	keywords?: string[];
	strengths?: string[];
	gaps?: string[];
	risks?: string[];
	nextActions?: string[];
}

export default function CompanionJobDetailsDialog({
	job,
	isOpen,
	onClose,
	onConvert,
	onRetry,
	onRetryAnalyze,
}: CompanionJobDetailsDialogProps) {
	const [activeTab, setActiveTab] = useState<"ai" | "scraped" | "screenshot">(
		"ai",
	);
	const [screenshotError, setScreenshotError] = useState(false);

	// Reset default tab when job changes
	useEffect(() => {
		setScreenshotError(false);
		if (job.crawlStatus === "ready") {
			setActiveTab("ai");
		} else {
			setActiveTab("scraped");
		}
		// biome-ignore lint/correctness/useExhaustiveDependencies: reset tab on job change or dialog open
	}, [job.id, job.crawlStatus, isOpen]);

	const hostname = (() => {
		try {
			return new URL(job.sourceUrl).hostname;
		} catch {
			return job.sourceUrl;
		}
	})();

	const title = job.parsedTitle || hostname;
	const company = job.parsedCompany || null;
	const isReady = job.crawlStatus === "ready";

	// Parse fitBriefJson if it exists
	let fitBrief: FitBrief | null = null;
	if (job.fitBriefJson) {
		try {
			fitBrief = JSON.parse(job.fitBriefJson) as FitBrief;
		} catch (e) {
			console.error("Failed to parse fitBriefJson", e);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
				<DialogHeader className="border-b-2 border-border pb-4 shrink-0">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div className="space-y-1">
							<DialogTitle className="text-2xl font-heading break-all">
								{title}
							</DialogTitle>
							{(company || job.parsedLocation) && (
								<p className="font-bold text-sm text-gray-700 break-all">
									{company}
									{company && job.parsedLocation && " • "}
									{job.parsedLocation}
								</p>
							)}
							<a
								href={job.sourceUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:underline break-all"
							>
								{job.sourceUrl}
								<ExternalLink className="size-3" />
							</a>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<span className="rounded-base border-2 border-border bg-[#F0F9FF] px-2 py-1 font-bold text-xs uppercase">
								{job.crawlStatus === "failed"
									? job.cleanedText
										? "FAILED (ANALYSIS)"
										: "FAILED (SCRAPE)"
									: job.crawlStatus.toUpperCase()}
							</span>
							{isReady &&
								job.fitScore !== null &&
								job.fitScore !== undefined && (
									<span
										className={`rounded-base border-2 border-border px-2 py-1 font-bold text-xs uppercase ${
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
				</DialogHeader>

				{/* Tabs Header */}
				<div className="flex border-b-2 border-border shrink-0" role="tablist">
					<button
						type="button"
						id="details-tab-ai"
						aria-controls="details-panel-ai"
						onClick={() => setActiveTab("ai")}
						role="tab"
						aria-selected={activeTab === "ai"}
						className={`px-4 py-2 font-bold text-sm border-b-4 -mb-[2px] transition-colors ${
							activeTab === "ai"
								? "border-main text-main-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						✨ AI Fit Analysis
					</button>
					<button
						type="button"
						id="details-tab-scraped"
						aria-controls="details-panel-scraped"
						onClick={() => setActiveTab("scraped")}
						role="tab"
						aria-selected={activeTab === "scraped"}
						className={`px-4 py-2 font-bold text-sm border-b-4 -mb-[2px] transition-colors ${
							activeTab === "scraped"
								? "border-main text-main-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						📄 Raw Scraped Text
					</button>
					{job.crawlStatus !== "pending" && job.crawlStatus !== "crawling" && (
						<button
							type="button"
							id="details-tab-screenshot"
							aria-controls="details-panel-screenshot"
							onClick={() => setActiveTab("screenshot")}
							role="tab"
							aria-selected={activeTab === "screenshot"}
							className={`px-4 py-2 font-bold text-sm border-b-4 -mb-[2px] transition-colors ${
								activeTab === "screenshot"
									? "border-main text-main-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground"
							}`}
						>
							📸 Screenshot
						</button>
					)}
				</div>

				{/* Tab Content */}
				<div className="flex-1 overflow-y-auto py-4 pr-1 min-h-0">
					{activeTab === "ai" && (
						<div
							id="details-panel-ai"
							aria-labelledby="details-tab-ai"
							role="tabpanel"
							className="flex flex-col gap-6"
						>
							{job.crawlStatus === "analyzing" && (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<Loader2 className="size-8 animate-spin text-main mb-3" />
									<p className="font-bold text-muted-foreground">
										AI is currently analyzing this job description...
									</p>
								</div>
							)}

							{job.crawlStatus === "failed" && (
								<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold flex gap-2 items-center">
									<AlertTriangle className="size-5 shrink-0" />
									<span>
										AI Analysis failed: {job.crawlError ?? "Analysis failed."}
										<br />
										You can review the raw scraped text in the other tab or
										click Retry AI Analysis below.
									</span>
								</div>
							)}

							{isReady && !fitBrief && (
								<p className="text-muted-foreground py-6 text-center">
									No fit analysis data available.
								</p>
							)}

							{isReady && fitBrief && (
								<div className="flex flex-col gap-6">
									{/* Role Summary */}
									<div className="border-2 border-border rounded-base p-4 bg-white shadow-light">
										<h3 className="text-md font-heading mb-1.5">
											Role Summary
										</h3>
										<p className="text-sm leading-relaxed">
											{fitBrief.roleSummary}
										</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Requirements */}
										<div className="border-2 border-border rounded-base p-4 bg-white shadow-light flex flex-col">
											<h3 className="text-md font-heading mb-2.5 flex items-center gap-2 border-b border-border pb-1.5">
												<CheckCircle2 className="size-4 text-[#0EA5E9]" />
												Key Requirements
											</h3>
											<ul className="flex flex-col gap-1.5 list-none pl-0">
												{fitBrief.requirements?.map(
													(req: string, i: number) => (
														<li
															key={i}
															className="flex gap-2 text-xs leading-relaxed"
														>
															<ArrowRight className="size-3.5 text-[#0EA5E9] shrink-0 mt-0.5" />
															<span>{req}</span>
														</li>
													),
												)}
											</ul>
										</div>

										{/* Keywords */}
										<div className="border-2 border-border rounded-base p-4 bg-white shadow-light flex flex-col">
											<h3 className="text-md font-heading mb-2.5 flex items-center gap-2 border-b border-border pb-1.5">
												<Sparkles className="size-4 text-[#8B5CF6]" />
												Target Keywords
											</h3>
											<div className="flex flex-wrap gap-1.5">
												{fitBrief.keywords?.map((kw: string, i: number) => (
													<span
														key={i}
														className="px-2 py-0.5 text-[10px] font-bold bg-[#F0F9FF] border-2 border-[#B9E6FE] rounded-base text-[#0369A1]"
													>
														{kw}
													</span>
												))}
											</div>
										</div>
									</div>

									{/* Strengths & Matches vs Gaps & Risks */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Strengths */}
										<div className="border-2 border-border rounded-base p-4 bg-[#F0FDF4] border-[#BBF7D0] shadow-light flex flex-col">
											<h3 className="text-md font-heading mb-2.5 text-[#15803D] flex items-center gap-2 border-b border-[#BBF7D0] pb-1.5">
												<CheckCircle2 className="size-4 text-[#16A34A]" />
												Strengths & Matches
											</h3>
											<ul className="flex flex-col gap-1.5 list-none pl-0 text-[#14532D]">
												{fitBrief.strengths?.map((str: string, i: number) => (
													<li
														key={i}
														className="flex gap-1.5 text-xs leading-relaxed"
													>
														<span className="text-[#16A34A] font-bold shrink-0">
															•
														</span>
														<span>{str}</span>
													</li>
												))}
											</ul>
										</div>

										{/* Gaps / Risks */}
										<div className="border-2 border-border rounded-base p-4 bg-[#FFF1F2] border-[#FECDD3] shadow-light flex flex-col">
											<h3 className="text-md font-heading mb-2.5 text-[#B91C1C] flex items-center gap-2 border-b border-[#FECDD3] pb-1.5">
												<AlertTriangle className="size-4 text-[#E11D48]" />
												Gaps & Risks
											</h3>
											<div className="flex flex-col gap-3">
												{fitBrief.gaps && fitBrief.gaps.length > 0 && (
													<div>
														<h4 className="text-[10px] font-bold uppercase text-[#9F1239] mb-0.5">
															Gaps
														</h4>
														<ul className="flex flex-col gap-1 list-none pl-0 text-[#881337]">
															{fitBrief.gaps.map((gap: string, i: number) => (
																<li
																	key={i}
																	className="flex gap-1.5 text-xs leading-relaxed"
																>
																	<span className="text-[#E11D48] font-bold shrink-0">
																		•
																	</span>
																	<span>{gap}</span>
																</li>
															))}
														</ul>
													</div>
												)}
												{fitBrief.risks && fitBrief.risks.length > 0 && (
													<div>
														<h4 className="text-[10px] font-bold uppercase text-[#9F1239] mb-0.5">
															Risks & Concerns
														</h4>
														<ul className="flex flex-col gap-1 list-none pl-0 text-[#881337]">
															{fitBrief.risks.map((risk: string, i: number) => (
																<li
																	key={i}
																	className="flex gap-1.5 text-xs leading-relaxed"
																>
																	<span className="text-[#E11D48] font-bold shrink-0">
																		•
																	</span>
																	<span>{risk}</span>
																</li>
															))}
														</ul>
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Next Actions */}
									<div className="border-2 border-border rounded-base p-4 bg-[#FFFBEB] border-[#FEF3C7] shadow-light">
										<h3 className="text-md font-heading mb-2.5 text-[#B45309] flex items-center gap-2 border-b border-[#FDE68A] pb-1.5">
											💡 Recommended Next Actions
										</h3>
										<ul className="flex flex-col gap-1.5 list-none pl-0 text-[#78350F]">
											{fitBrief.nextActions?.map(
												(action: string, i: number) => (
													<li
														key={i}
														className="flex gap-1.5 text-xs leading-relaxed"
													>
														<span className="text-[#D97706] font-bold shrink-0">
															{i + 1}.
														</span>
														<span>{action}</span>
													</li>
												),
											)}
										</ul>
									</div>
								</div>
							)}
						</div>
					)}

					{activeTab === "scraped" && (
						<div
							id="details-panel-scraped"
							aria-labelledby="details-tab-scraped"
							role="tabpanel"
							className="h-full flex flex-col"
						>
							{job.cleanedText ? (
								<pre className="flex-1 min-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-base border-2 border-border p-4 bg-gray-50 font-sans text-sm leading-relaxed">
									{job.cleanedText}
								</pre>
							) : (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<AlertTriangle className="size-8 text-amber-500 mb-3" />
									<p className="font-bold text-muted-foreground">
										No crawled job description text available.
									</p>
								</div>
							)}
						</div>
					)}

					{activeTab === "screenshot" && (
						<div
							id="details-panel-screenshot"
							aria-labelledby="details-tab-screenshot"
							role="tabpanel"
							className="h-full flex flex-col"
						>
							{!screenshotError ? (
								<div className="flex-1 min-h-[400px] overflow-y-auto rounded-base border-2 border-border p-2 bg-gray-50 flex justify-center shadow-light">
									<img
										src={`${companionBaseUrl}/jobs/${job.id}/screenshot`}
										alt="Crawl Screenshot"
										onError={() => setScreenshotError(true)}
										className="max-w-full h-auto object-contain border border-border rounded-base"
									/>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<AlertTriangle className="size-8 text-amber-500 mb-3" />
									<p className="font-bold text-muted-foreground">
										No screenshot available for this job crawl.
									</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t-2 border-border pt-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
					<div>
						{job.crawlStatus === "failed" && (
							<div className="flex gap-2">
								{onRetry && (
									<button
										type="button"
										onClick={() => {
											onRetry(job.id);
											onClose();
										}}
										className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer shadow-light"
									>
										Retry Scrape
									</button>
								)}
								{job.cleanedText && onRetryAnalyze && (
									<button
										type="button"
										onClick={() => {
											onRetryAnalyze(job.id);
											onClose();
										}}
										className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-3 py-1.5 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer shadow-light"
									>
										Retry AI Analysis
									</button>
								)}
							</div>
						)}
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-white px-4 py-2 font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
						>
							Close
						</button>
						{isReady && onConvert && (
							<button
								type="button"
								onClick={() => {
									onConvert(job);
									onClose();
								}}
								className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-main px-4 py-2 font-bold text-sm text-main-foreground shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
							>
								Convert to Application
							</button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
