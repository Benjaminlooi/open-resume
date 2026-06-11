// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewJobApplicationModal from "./NewJobApplicationModal";
import * as localCompanion from "#/lib/local-companion-client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
	.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("#/lib/local-companion-client", () => ({
	createCompanionJob: vi.fn(),
}));

describe("NewJobApplicationModal", () => {
	async function renderModal(onClose = vi.fn(), onCreated = vi.fn()) {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<NewJobApplicationModal onClose={onClose} onCreated={onCreated} />);
		});

		return { container, root };
	}

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("renders modal header, input field, and buttons", async () => {
		const { container, root } = await renderModal();
		const html = container.innerHTML;

		expect(html).toContain("Add Job URL");
		expect(html).toContain("Job URL");
		expect(html).toContain("Cancel");
		expect(html).toContain("Add Job");

		await act(async () => {
			root.unmount();
		});
	});

	it("submits only a URL to the local companion", async () => {
		const createCompanionJob = vi.mocked(localCompanion.createCompanionJob);
		createCompanionJob.mockResolvedValue({
			id: "job-1",
			sourceUrl: "https://example.com/job",
			crawlStatus: "pending",
			crawlError: null,
			cleanedText: "",
			createdAt: 1,
			updatedAt: 1,
			crawledAt: null,
		});

		const onClose = vi.fn();
		const onCreated = vi.fn();
		const { container, root } = await renderModal(onClose, onCreated);

		const urlInput = container.querySelector<HTMLInputElement>("#job-url");
		expect(urlInput).not.toBeNull();

		await act(async () => {
			if (!urlInput) return;
			const valueSetter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			valueSetter?.call(urlInput, "https://example.com/job");
			urlInput.dispatchEvent(new Event("input", { bubbles: true }));
		});

		const form = container.querySelector("form");
		expect(form).not.toBeNull();

		await act(async () => {
			form?.dispatchEvent(new Event("submit", { bubbles: true }));
		});

		expect(createCompanionJob).toHaveBeenCalledWith("https://example.com/job");
		expect(onCreated).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();

		await act(async () => {
			root.unmount();
		});
	});
});
