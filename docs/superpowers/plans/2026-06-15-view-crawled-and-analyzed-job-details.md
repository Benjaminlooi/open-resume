# View Crawled and Analyzed Job Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to view the raw crawled job description and AI fit analysis for any companion job queue card in a clean tabbed modal before converting it to an application.

**Architecture:** Create a new dialog component `<CompanionJobDetailsDialog>` that imports `<Dialog>` from Shadcn UI. State tracks the active tab ('ai' | 'scraped'). Integrate this dialog in `<CompanionJobCard>` and expose a "View Details" button.

**Tech Stack:** React 19, Lucide React, Shadcn UI (Dialog), Tailwind CSS

---

### Task 1: Create [CompanionJobDetailsDialog](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/components/jobs/CompanionJobDetailsDialog.tsx)

**Files:**
- Create: `apps/web/src/components/jobs/CompanionJobDetailsDialog.tsx`
- Test: `apps/web/src/components/jobs/CompanionJobDetailsDialog.test.tsx`

- [ ] **Step 1: Write the details dialog component**

Write the code exactly as designed:

```tsx
import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Loader2,
	Sparkles,
	CheckCircle2,
	AlertTriangle,
	ArrowRight,
	ExternalLink,
} from "lucide-react";
import type { LocalCompanionJob } from "#/lib/local-companion-client";

interface CompanionJobDetailsDialogProps {
	job: LocalCompanionJob;
	isOpen: boolean;
	onClose: () => void;
	onConvert?: (job: LocalCompanionJob) => void;
	onRetry?: (id: string) => void;
	onRetryAnalyze?: (id: string) => void;
}

export default function CompanionJobDetailsDialog({
	job,
	isOpen,
	onClose,
	onConvert,
	onRetry,
	onRetryAnalyze,
}: CompanionJobDetailsDialogProps) {
	const [activeTab, setActiveTab] = useState<"ai" | "scraped">("ai");

	// Reset default tab when job changes
	useEffect(() => {
		if (job.crawlStatus === "ready") {
			setActiveTab("ai");
		} else {
			setActiveTab("scraped");
		}
	}, [job.id, job.crawlStatus]);

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
	let fitBrief: any = null;
	if (job.fitBriefJson) {
		try {
			fitBrief = JSON.parse(job.fitBriefJson);
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
							<DialogTitle className="text-2xl font-heading break-all">{title}</DialogTitle>
							{company && (
								<p className="font-bold text-sm text-gray-700 break-all">
									{company}
									{job.parsedLocation && ` • ${job.parsedLocation}`}
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
							{isReady && job.fitScore !== null && job.fitScore !== undefined && (
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
				<div className="flex border-b-2 border-border shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("ai")}
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
						onClick={() => setActiveTab("scraped")}
						className={`px-4 py-2 font-bold text-sm border-b-4 -mb-[2px] transition-colors ${
							activeTab === "scraped"
								? "border-main text-main-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						📄 Raw Scraped Text
					</button>
				</div>

				{/* Tab Content */}
				<div className="flex-1 overflow-y-auto py-4 pr-1 min-h-0">
					{activeTab === "ai" && (
						<div className="flex flex-col gap-6">
							{job.crawlStatus === "analyzing" && (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<Loader2 className="size-8 animate-spin text-main mb-3" />
									<p className="font-bold text-muted-foreground">AI is currently analyzing this job description...</p>
								</div>
							)}

							{job.crawlStatus === "failed" && (
								<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold flex gap-2 items-center">
									<AlertTriangle className="size-5 shrink-0" />
									<span>
										AI Analysis failed: {job.crawlError ?? "Analysis failed."}
										<br />
										You can review the raw scraped text in the other tab or click Retry AI Analysis below.
									</span>
								</div>
							)}

							{isReady && !fitBrief && (
								<p className="text-muted-foreground py-6 text-center">No fit analysis data available.</p>
							)}

							{isReady && fitBrief && (
								<div className="flex flex-col gap-6">
									{/* Role Summary */}
									<div className="border-2 border-border rounded-base p-4 bg-white shadow-light">
										<h3 className="text-md font-heading mb-1.5">Role Summary</h3>
										<p className="text-sm leading-relaxed">{fitBrief.roleSummary}</p>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Requirements */}
										<div className="border-2 border-border rounded-base p-4 bg-white shadow-light flex flex-col">
											<h3 className="text-md font-heading mb-2.5 flex items-center gap-2 border-b border-border pb-1.5">
												<CheckCircle2 className="size-4 text-[#0EA5E9]" />
												Key Requirements
											</h3>
											<ul className="flex flex-col gap-1.5 list-none pl-0">
												{fitBrief.requirements?.map((req: string, i: number) => (
													<li key={i} className="flex gap-2 text-xs leading-relaxed">
														<ArrowRight className="size-3.5 text-[#0EA5E9] shrink-0 mt-0.5" />
														<span>{req}</span>
													</li>
												))}
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
													<li key={i} className="flex gap-1.5 text-xs leading-relaxed">
														<span className="text-[#16A34A] font-bold shrink-0">•</span>
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
												{fitBrief.gaps?.length > 0 && (
													<div>
														<h4 className="text-[10px] font-bold uppercase text-[#9F1239] mb-0.5">
															Gaps
														</h4>
														<ul className="flex flex-col gap-1 list-none pl-0 text-[#881337]">
															{fitBrief.gaps.map((gap: string, i: number) => (
																<li key={i} className="flex gap-1.5 text-xs leading-relaxed">
																	<span className="text-[#E11D48] font-bold shrink-0">•</span>
																	<span>{gap}</span>
																</li>
															))}
														</ul>
													</div>
												)}
												{fitBrief.risks?.length > 0 && (
													<div>
														<h4 className="text-[10px] font-bold uppercase text-[#9F1239] mb-0.5">
															Risks & Concerns
														</h4>
														<ul className="flex flex-col gap-1 list-none pl-0 text-[#881337]">
															{fitBrief.risks.map((risk: string, i: number) => (
																<li key={i} className="flex gap-1.5 text-xs leading-relaxed">
																	<span className="text-[#E11D48] font-bold shrink-0">•</span>
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
											{fitBrief.nextActions?.map((action: string, i: number) => (
												<li key={i} className="flex gap-1.5 text-xs leading-relaxed">
													<span className="text-[#D97706] font-bold shrink-0">{i + 1}.</span>
													<span>{action}</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</div>
					)}

					{activeTab === "scraped" && (
						<div className="h-full flex flex-col">
							{job.cleanedText ? (
								<pre className="flex-1 min-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-base border-2 border-border p-4 bg-gray-50 font-sans text-sm leading-relaxed">
									{job.cleanedText}
								</pre>
							) : (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<AlertTriangle className="size-8 text-amber-500 mb-3" />
									<p className="font-bold text-muted-foreground">No crawled job description text available.</p>
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
								className="inline-flex items-center gap-1 rounded-base border-2 border-border bg-main px-4 py-2 font-bold text-sm text-main-foreground shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer bg-main"
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
```

- [ ] **Step 2: Write basic tests for the details dialog**

Write `apps/web/src/components/jobs/CompanionJobDetailsDialog.test.tsx`:

```tsx
// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CompanionJobDetailsDialog from "./CompanionJobDetailsDialog";

const mockJob = {
	id: "job-1",
	sourceUrl: "https://example.com/job",
	crawlStatus: "ready" as const,
	crawlError: null,
	cleanedText: "This is a React frontend engineer position.",
	createdAt: Date.now(),
	updatedAt: Date.now(),
	crawledAt: Date.now(),
	parsedTitle: "React Engineer",
	parsedCompany: "Example Corp",
	parsedLocation: "Remote",
	fitScore: 85,
	fitBriefJson: JSON.stringify({
		roleSummary: "Mock summary of the role",
		requirements: ["React experience", "TypeScript"],
		keywords: ["React", "TypeScript"],
		strengths: ["Strong React background"],
		gaps: ["No cloud experience"],
		risks: [],
		nextActions: ["Brush up on AWS"],
		generatedAt: Date.now(),
	}),
};

describe("CompanionJobDetailsDialog", () => {
	it("renders details correctly when open", () => {
		render(
			<CompanionJobDetailsDialog
				job={mockJob}
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		expect(screen.getByText("React Engineer")).toBeInTheDocument();
		expect(screen.getByText("Example Corp • Remote")).toBeInTheDocument();
		expect(screen.getByText("85% Match")).toBeInTheDocument();
		expect(screen.getByText("Mock summary of the role")).toBeInTheDocument();
	});
});
```

- [ ] **Step 3: Run web tests**

Run: `pnpm --filter @open-resume/web test run CompanionJobDetailsDialog`
Expected: PASS

- [ ] **Step 4: Commit new component**

```bash
git add apps/web/src/components/jobs/CompanionJobDetailsDialog.tsx apps/web/src/components/jobs/CompanionJobDetailsDialog.test.tsx
git commit -m "feat: add CompanionJobDetailsDialog component and test"
```

---

### Task 2: Integrate Dialog into [CompanionJobCard](file:///Users/ben/ghq/github.com/Benjaminlooi/resume-builder/.worktrees/job-application-ai-helper/apps/web/src/components/jobs/CompanionJobCard.tsx)

**Files:**
- Modify: `apps/web/src/components/jobs/CompanionJobCard.tsx`
- Modify: `apps/web/src/components/jobs/CompanionJobCard.test.tsx`

- [ ] **Step 1: Modify card component to support details modal**

Replace the contents of `apps/web/src/components/jobs/CompanionJobCard.tsx` with:

```tsx
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
```

- [ ] **Step 2: Update card component tests**

Modify `apps/web/src/components/jobs/CompanionJobCard.test.tsx` to:
1. Include `Eye` in the mocked `lucide-react` functions.
2. Add a new test verification checking the "View Details" button behavior.

Here are the target changes for `apps/web/src/components/jobs/CompanionJobCard.test.tsx`:

Lines 12-15 target content:
```typescript
vi.mock("lucide-react", () => ({
	RotateCcw: () => <span data-testid="rotate-ccw">RotateCcw</span>,
	Trash2: () => <span data-testid="trash-2">Trash2</span>,
}));
```

Replacement content:
```typescript
vi.mock("lucide-react", () => ({
	RotateCcw: () => <span data-testid="rotate-ccw">RotateCcw</span>,
	Trash2: () => <span data-testid="trash-2">Trash2</span>,
	Eye: () => <span data-testid="eye">Eye</span>,
}));
```

And add the following test case at the end of the file:

```typescript
	it("renders View Details button and opens details dialog on click", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "ready",
				cleanedText: "This is some job description.",
			},
			onRetry: vi.fn(),
			onDelete: vi.fn(),
		});

		const viewDetailsBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent?.includes("View Details"),
		);
		expect(viewDetailsBtn).not.toBeUndefined();

		await act(async () => {
			viewDetailsBtn?.click();
		});

		// Radix Dialog content is rendered in a portal at document.body level
		expect(document.body.innerHTML).toContain("This is some job description.");

		await act(async () => {
			root.unmount();
		});
	});
```

- [ ] **Step 3: Run web tests**

Run: `pnpm --filter @open-resume/web test run CompanionJobCard`
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add apps/web/src/components/jobs/CompanionJobCard.tsx apps/web/src/components/jobs/CompanionJobCard.test.tsx
git commit -m "feat: integrate CompanionJobDetailsDialog into CompanionJobCard"
```

---

### Task 3: Build and Typecheck Workspace Verification

- [ ] **Step 1: Run full verification suite**

Run: `pnpm typecheck`
Expected: PASS

Run: `pnpm build`
Expected: PASS

Run: `pnpm test`
Expected: PASS
