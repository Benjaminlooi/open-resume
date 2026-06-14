// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompanionJobCard from "./CompanionJobCard";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("lucide-react", () => ({
	RotateCcw: () => <span data-testid="rotate-ccw">RotateCcw</span>,
	Trash2: () => <span data-testid="trash-2">Trash2</span>,
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
	async function renderCard(props: any) {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		const defaultProps = {
			onRetry: vi.fn(),
			onDelete: vi.fn(),
			onRetryAnalyze: vi.fn(),
		};

		await act(async () => {
			root.render(<CompanionJobCard {...defaultProps} {...props} />);
		});

		return { container, root };
	}

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("renders pending jobs without company or title", async () => {
		const { container, root } = await renderCard({
			job: baseJob,
			onRetry: vi.fn(),
			onDelete: vi.fn(),
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
			onRetry: vi.fn(),
			onDelete: vi.fn(),
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
		expect(retryScrapeBtn?.querySelector('[data-testid="rotate-ccw"]')).not.toBeNull();

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

	it("calls onRetry when Retry Scrape is clicked, and onRetryAnalyze when Retry AI Analysis is clicked", async () => {
		const onRetry = vi.fn();
		const onRetryAnalyze = vi.fn();
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "failed",
				cleanedText: "Some scraped job text content.",
			},
			onRetry,
			onRetryAnalyze,
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
		expect(onRetry).toHaveBeenCalledWith("job-1");

		await act(async () => {
			retryAnalyzeBtn?.click();
		});
		expect(onRetryAnalyze).toHaveBeenCalledWith("job-1");

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
				expect(html).toContain("Scraping succeeded. Analyzing job description with AI...");
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
			onRetry: vi.fn(),
			onDelete: vi.fn(),
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

	it("calls onConvert when Convert to Application is clicked", async () => {
		const onConvert = vi.fn();
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "ready",
				parsedTitle: "AI Specialist",
				parsedCompany: "SuperTech Inc",
				fitScore: 85,
			},
			onRetry: vi.fn(),
			onDelete: vi.fn(),
			onConvert,
		});

		const convertBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent?.includes("Convert to Application"),
		);
		expect(convertBtn).not.toBeUndefined();

		await act(async () => {
			convertBtn?.click();
		});

		expect(onConvert).toHaveBeenCalledTimes(1);

		await act(async () => {
			root.unmount();
		});
	});
});
