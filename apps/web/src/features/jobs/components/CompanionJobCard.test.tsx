// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompanionJobCard from "./CompanionJobCard";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("lucide-react", () => ({
	RotateCcw: () => <span data-testid="rotate-ccw">RotateCcw</span>,
	Trash2: () => <span data-testid="trash-2">Trash2</span>,
	Eye: () => <span data-testid="eye">Eye</span>,
	Loader2: () => <span data-testid="loader-2">Loader2</span>,
	Sparkles: () => <span data-testid="sparkles">Sparkles</span>,
	CheckCircle2: () => <span data-testid="check-circle-2">CheckCircle2</span>,
	AlertTriangle: () => <span data-testid="alert-triangle">AlertTriangle</span>,
	ArrowRight: () => <span data-testid="arrow-right">ArrowRight</span>,
	ExternalLink: () => <span data-testid="external-link">ExternalLink</span>,
}));

vi.mock("#/components/ui/dialog", () => {
	return {
		Dialog: ({ children, open }: any) => {
			if (!open) return null;
			return <div data-testid="mock-dialog">{children}</div>;
		},
		DialogContent: ({ children, className }: any) => (
			<div data-testid="mock-dialog-content" className={className}>
				{children}
			</div>
		),
		DialogHeader: ({ children, className }: any) => (
			<div data-testid="mock-dialog-header" className={className}>
				{children}
			</div>
		),
		DialogTitle: ({ children, className }: any) => (
			<h2 data-testid="mock-dialog-title" className={className}>
				{children}
			</h2>
		),
	};
});

const convertJobToApplicationMock = vi.fn();
const retryJobCrawlMock = vi.fn();
const retryJobAnalyzeMock = vi.fn();
const deleteJobMock = vi.fn();

vi.mock("#/features/jobs/companion-job-store", () => ({
	useCompanionJobStore: () => ({
		convertJobToApplication: convertJobToApplicationMock,
		retryJobCrawl: retryJobCrawlMock,
		retryJobAnalyze: retryJobAnalyzeMock,
		deleteJob: deleteJobMock,
	}),
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
}));

const baseJob = {
	id: "job-1",
	sourceUrl: "https://example.com/jobs/1",
	crawlStatus: "pending" as const,
	crawlError: null,
	cleanedText: "",
	createdAt: 1791571200000,
	updatedAt: 1791571200000,
	crawledAt: null,
};

describe("CompanionJobCard", () => {
	async function renderCard(
		props: Partial<ComponentProps<typeof CompanionJobCard>>,
	) {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		const defaultProps = {
			job: baseJob,
		};

		await act(async () => {
			root.render(<CompanionJobCard {...defaultProps} {...props} />);
		});

		return { container, root };
	}

	afterEach(() => {
		document.body.innerHTML = "";
		vi.clearAllMocks();
	});

	it("renders pending jobs without company or title", async () => {
		const { container, root } = await renderCard({
			job: baseJob,
		});

		const html = container.innerHTML;
		expect(html).toContain("example.com");
		expect(html.toLowerCase()).toContain("pending");

		await act(async () => {
			root.unmount();
		});
	});

	it("renders ready text previews", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "ready",
				cleanedText: "This is a useful job description for an AI engineer.",
				crawledAt: 1791571300000,
			},
		});

		const html = container.innerHTML;
		expect(html).toContain(
			"This is a useful job description for an AI engineer.",
		);

		await act(async () => {
			root.unmount();
		});
	});

	it("renders failed crawl status with empty cleanedText as FAILED (SCRAPE) and shows Retry Scrape", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "failed",
				crawlError: "Blocked by site",
				cleanedText: "",
			},
		});

		const html = container.innerHTML;
		expect(html).toContain("FAILED (SCRAPE)");
		expect(html).toContain("Scrape failed: Blocked by site");
		expect(html).toContain("Retry Scrape");
		expect(html).not.toContain("Retry AI Analysis");

		// verify RotateCcw is in Retry Scrape button
		const buttons = Array.from(container.querySelectorAll("button"));
		const retryScrapeBtn = buttons.find((btn) =>
			btn.textContent?.includes("Retry Scrape"),
		);
		expect(
			retryScrapeBtn?.querySelector('[data-testid="rotate-ccw"]'),
		).not.toBeNull();

		await act(async () => {
			root.unmount();
		});
	});

	it("renders failed crawl status with non-empty cleanedText as FAILED (ANALYSIS) and shows both buttons", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "failed",
				crawlError: "Model timeout",
				cleanedText: "Some scraped job text content.",
			},
		});

		const html = container.innerHTML;
		expect(html).toContain("FAILED (ANALYSIS)");
		expect(html).toContain("AI Analysis failed: Model timeout");
		expect(html).toContain("Retry Scrape");
		expect(html).toContain("Retry AI Analysis");

		await act(async () => {
			root.unmount();
		});
	});

	it("calls retryJobCrawl and retryJobAnalyze store actions when retry buttons are clicked", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "failed",
				cleanedText: "Some scraped job text content.",
			},
		});

		const buttons = Array.from(container.querySelectorAll("button"));
		const retryScrapeBtn = buttons.find((btn) =>
			btn.textContent?.includes("Retry Scrape"),
		);
		const retryAnalyzeBtn = buttons.find((btn) =>
			btn.textContent?.includes("Retry AI Analysis"),
		);

		expect(retryScrapeBtn).not.toBeUndefined();
		expect(retryAnalyzeBtn).not.toBeUndefined();

		await act(async () => {
			retryScrapeBtn?.click();
		});
		expect(retryJobCrawlMock).toHaveBeenCalledWith("job-1");

		await act(async () => {
			retryAnalyzeBtn?.click();
		});
		expect(retryJobAnalyzeMock).toHaveBeenCalledWith("job-1");

		await act(async () => {
			root.unmount();
		});
	});

	it("renders status in uppercase for pending, crawling, and analyzing states", async () => {
		const statuses = ["pending", "crawling", "analyzing"] as const;
		for (const status of statuses) {
			const { container, root } = await renderCard({
				job: {
					...baseJob,
					crawlStatus: status,
				},
			});

			const badge = container.querySelector(".uppercase");
			expect(badge?.textContent?.trim()).toBe(status.toUpperCase());

			// Also verify the progress message text matches the spec:
			const html = container.innerHTML;
			if (status === "pending") {
				expect(html).toContain("Job added to queue. Scrape is pending...");
			} else if (status === "crawling") {
				expect(html).toContain("Scraping job description from URL...");
			} else if (status === "analyzing") {
				expect(html).toContain(
					"Scraping succeeded. Analyzing job description with AI...",
				);
			}

			await act(async () => {
				root.unmount();
			});
		}
	});

	it("renders parsed company, title, and score badge for ready jobs", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "ready",
				parsedTitle: "AI Specialist",
				parsedCompany: "SuperTech Inc",
				fitScore: 85,
			},
		});

		const html = container.innerHTML;
		expect(html).toContain("AI Specialist");
		expect(html).toContain("SuperTech Inc");
		expect(html).toContain("85% Match");
		expect(html).toContain("bg-[#BBF7D0]");

		await act(async () => {
			root.unmount();
		});
	});

	it("calls convertJobToApplication and navigates when Convert to Application is clicked", async () => {
		convertJobToApplicationMock.mockResolvedValue("app-123");
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "ready",
				parsedTitle: "AI Specialist",
				parsedCompany: "SuperTech Inc",
				fitScore: 85,
			},
		});

		const convertBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent?.includes("Convert to Application"),
		);
		expect(convertBtn).not.toBeUndefined();

		await act(async () => {
			convertBtn?.click();
		});

		expect(convertJobToApplicationMock).toHaveBeenCalledWith({
			...baseJob,
			crawlStatus: "ready",
			parsedTitle: "AI Specialist",
			parsedCompany: "SuperTech Inc",
			fitScore: 85,
		});
		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/jobs/$id",
			params: { id: "app-123" },
		});

		await act(async () => {
			root.unmount();
		});
	});

	it("renders View Details button and opens details dialog on click", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "ready",
				cleanedText: "This is some job description.",
			},
		});

		const viewDetailsBtn = Array.from(
			container.querySelectorAll("button"),
		).find((btn) => btn.textContent?.includes("View Details"));
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
});
