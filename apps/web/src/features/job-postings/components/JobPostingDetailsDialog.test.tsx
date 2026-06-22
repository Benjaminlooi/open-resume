// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import JobPostingDetailsDialog from "./JobPostingDetailsDialog";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("lucide-react", () => ({
	Loader2: () => <span data-testid="loader2">Loader2</span>,
	Sparkles: () => <span data-testid="sparkles">Sparkles</span>,
	CheckCircle2: () => <span data-testid="check-circle-2">CheckCircle2</span>,
	AlertTriangle: () => <span data-testid="alert-triangle">AlertTriangle</span>,
	ArrowRight: () => <span data-testid="arrow-right">ArrowRight</span>,
	ExternalLink: () => <span data-testid="external-link">ExternalLink</span>,
}));

const convertJobToApplicationMock = vi.fn();
const retryJobCrawlMock = vi.fn();
const retryJobAnalyzeMock = vi.fn();

vi.mock("#/features/job-postings/job-posting-store", () => ({
	useJobPostingStore: () => ({
		convertJobToApplication: convertJobToApplicationMock,
		retryJobCrawl: retryJobCrawlMock,
		retryJobAnalyze: retryJobAnalyzeMock,
	}),
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
}));

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

describe("JobPostingDetailsDialog", () => {
	async function renderDialog(
		props: Partial<ComponentProps<typeof JobPostingDetailsDialog>>,
	) {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		const defaultProps = {
			job: mockJob,
			isOpen: true,
			onClose: () => {},
		};

		await act(async () => {
			root.render(<JobPostingDetailsDialog {...defaultProps} {...props} />);
		});

		return { container, root };
	}

	afterEach(() => {
		document.body.innerHTML = "";
		vi.clearAllMocks();
	});

	it("renders details correctly when open", async () => {
		const { container, root } = await renderDialog({});

		const html = container.innerHTML;
		expect(html).toContain("React Engineer");
		expect(html).toContain("Example Corp");
		expect(html).toContain("Remote");
		expect(html).toContain("85% Match");
		expect(html).toContain("Mock summary of the role");

		await act(async () => {
			root.unmount();
		});
	});

	it("switches to Raw Scraped Text tab when clicked", async () => {
		const { container, root } = await renderDialog({});

		const rawTabBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent?.includes("Raw Scraped Text"),
		);
		expect(rawTabBtn).not.toBeUndefined();

		await act(async () => {
			rawTabBtn?.click();
		});

		const html = container.innerHTML;
		expect(html).toContain("This is a React frontend engineer position.");

		await act(async () => {
			root.unmount();
		});
	});

	it("calls convertJobToApplication and navigates when Convert to Application button is clicked", async () => {
		convertJobToApplicationMock.mockResolvedValue("app-123");
		const { container, root } = await renderDialog({});

		const convertBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent?.includes("Convert to Application"),
		);
		expect(convertBtn).not.toBeUndefined();

		await act(async () => {
			convertBtn?.click();
		});

		expect(convertJobToApplicationMock).toHaveBeenCalledWith(mockJob);
		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/jobs/$id",
			params: { id: "app-123" },
		});

		await act(async () => {
			root.unmount();
		});
	});

	it("renders failed status and handles retry callbacks", async () => {
		const onClose = vi.fn();

		const failedJob = {
			...mockJob,
			crawlStatus: "failed" as const,
			crawlError: "Server error",
			cleanedText: "Some scraped text",
		};

		const { container, root } = await renderDialog({
			job: failedJob,
			onClose,
		});

		const html = container.innerHTML;
		expect(html).toContain("FAILED (ANALYSIS)");
		expect(html).toContain("Retry Scrape");
		expect(html).toContain("Retry AI Analysis");

		const retryScrapeBtn = Array.from(
			container.querySelectorAll("button"),
		).find((btn) => btn.textContent?.includes("Retry Scrape"));
		const retryAnalyzeBtn = Array.from(
			container.querySelectorAll("button"),
		).find((btn) => btn.textContent?.includes("Retry AI Analysis"));

		expect(retryScrapeBtn).not.toBeUndefined();
		expect(retryAnalyzeBtn).not.toBeUndefined();

		await act(async () => {
			retryScrapeBtn?.click();
		});
		expect(retryJobCrawlMock).toHaveBeenCalledWith("job-1");
		expect(onClose).toHaveBeenCalled();

		await act(async () => {
			retryAnalyzeBtn?.click();
		});
		expect(retryJobAnalyzeMock).toHaveBeenCalledWith("job-1");

		await act(async () => {
			root.unmount();
		});
	});

	it("renders and switches to Screenshot tab when clicked", async () => {
		const { container, root } = await renderDialog({});

		const screenshotTabBtn = Array.from(
			container.querySelectorAll("button"),
		).find((btn) => btn.textContent?.includes("Screenshot"));
		expect(screenshotTabBtn).not.toBeUndefined();

		await act(async () => {
			screenshotTabBtn?.click();
		});

		const img = container.querySelector("img");
		expect(img).not.toBeNull();
		expect(img?.getAttribute("src")).toContain(
			`/job-postings/${mockJob.id}/screenshot`,
		);

		await act(async () => {
			root.unmount();
		});
	});
});
