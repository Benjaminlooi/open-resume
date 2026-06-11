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

		await act(async () => {
			root.render(<CompanionJobCard {...props} />);
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

	it("renders failed crawl retry action", async () => {
		const { container, root } = await renderCard({
			job: {
				...baseJob,
				crawlStatus: "failed",
				crawlError: "Blocked by site",
			},
			onRetry: vi.fn(),
			onDelete: vi.fn(),
		});

		const html = container.innerHTML;
		expect(html).toContain("Blocked by site");
		expect(html.toLowerCase()).toContain("retry");

		await act(async () => {
			root.unmount();
		});
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
