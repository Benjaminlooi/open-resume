import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CompanionJobCard from "./CompanionJobCard";

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
	it("renders pending jobs without company or title", () => {
		const html = renderToStaticMarkup(
			<CompanionJobCard
				job={baseJob}
				onRetry={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(html).toContain("example.com");
		expect(html.toLowerCase()).toContain("pending");
	});

	it("renders ready text previews", () => {
		const html = renderToStaticMarkup(
			<CompanionJobCard
				job={{
					...baseJob,
					crawlStatus: "ready",
					cleanedText: "This is a useful job description for an AI engineer.",
					crawledAt: 1791571300000,
				}}
				onRetry={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(html).toContain("This is a useful job description for an AI engineer.");
	});

	it("renders failed crawl retry action", () => {
		const html = renderToStaticMarkup(
			<CompanionJobCard
				job={{
					...baseJob,
					crawlStatus: "failed",
					crawlError: "Blocked by site",
				}}
				onRetry={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(html).toContain("Blocked by site");
		expect(html.toLowerCase()).toContain("retry");
	});
});
