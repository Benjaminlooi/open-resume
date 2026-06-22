// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as localCompanion from "#/lib/local-companion-client";
import NewJobApplicationModal from "./NewJobApplicationModal";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockCreateJobApplication = vi.fn().mockReturnValue("mock-app-id");

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
}));

vi.mock("#/features/job-postings/job-application-store", () => ({
	useJobApplicationStore: (selector?: (state: any) => any) => {
		const state = {
			createJobApplication: mockCreateJobApplication,
		};
		return selector ? selector(state) : state;
	},
}));

vi.mock("#/lib/local-companion-client", () => ({
	createJobPosting: vi.fn(),
}));

describe("NewJobApplicationModal", () => {
	async function renderModal(onClose = vi.fn(), onCreated = vi.fn()) {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<NewJobApplicationModal onClose={onClose} onCreated={onCreated} />,
			);
		});

		return { container, root };
	}

	afterEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	it("renders modal header, input field, and buttons", async () => {
		const { container, root } = await renderModal();
		const html = container.innerHTML;

		expect(html).toContain("Add Job");
		expect(html).toContain("Crawl Job URL");
		expect(html).toContain("Manual Entry");
		expect(html).toContain("Job URL");
		expect(html).toContain("Cancel");
		expect(html).toContain("Add Job");

		await act(async () => {
			root.unmount();
		});
	});

	it("submits only a URL to the local companion in Crawl tab", async () => {
		const mockCreateJobPosting = vi.mocked(localCompanion.createJobPosting);
		mockCreateJobPosting.mockResolvedValue({
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

		expect(mockCreateJobPosting).toHaveBeenCalledWith("https://example.com/job");
		expect(onCreated).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();

		await act(async () => {
			root.unmount();
		});
	});

	it("switches to Manual Entry tab and renders form fields", async () => {
		const { container, root } = await renderModal();

		const manualTabBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent === "Manual Entry",
		);
		expect(manualTabBtn).not.toBeUndefined();

		await act(async () => {
			manualTabBtn?.click();
		});

		const html = container.innerHTML;
		expect(html).toContain("Company Name");
		expect(html).toContain("Job Title");
		expect(html).toContain("Location");
		expect(html).toContain("Source URL");
		expect(html).toContain("Job Description");
		expect(html).toContain("Create Application");

		await act(async () => {
			root.unmount();
		});
	});

	it("submits manual form, calls store, and navigates", async () => {
		const onClose = vi.fn();
		const onCreated = vi.fn();
		const { container, root } = await renderModal(onClose, onCreated);

		// Switch to manual tab
		const manualTabBtn = Array.from(container.querySelectorAll("button")).find(
			(btn) => btn.textContent === "Manual Entry",
		);
		await act(async () => {
			manualTabBtn?.click();
		});

		// Fill in inputs
		const companyInput =
			container.querySelector<HTMLInputElement>("#company-name");
		const titleInput = container.querySelector<HTMLInputElement>("#job-title");
		const locationInput =
			container.querySelector<HTMLInputElement>("#location");
		const urlInput =
			container.querySelector<HTMLInputElement>("#manual-source-url");
		const descriptionTextarea =
			container.querySelector<HTMLTextAreaElement>("#job-description");

		await act(async () => {
			if (companyInput) {
				const setter = Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					"value",
				)?.set;
				setter?.call(companyInput, "Google");
				companyInput.dispatchEvent(new Event("input", { bubbles: true }));
			}
			if (titleInput) {
				const setter = Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					"value",
				)?.set;
				setter?.call(titleInput, "Staff SWE");
				titleInput.dispatchEvent(new Event("input", { bubbles: true }));
			}
			if (locationInput) {
				const setter = Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					"value",
				)?.set;
				setter?.call(locationInput, "NYC");
				locationInput.dispatchEvent(new Event("input", { bubbles: true }));
			}
			if (urlInput) {
				const setter = Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					"value",
				)?.set;
				setter?.call(urlInput, "https://careers.google.com/job");
				urlInput.dispatchEvent(new Event("input", { bubbles: true }));
			}
			if (descriptionTextarea) {
				const setter = Object.getOwnPropertyDescriptor(
					HTMLTextAreaElement.prototype,
					"value",
				)?.set;
				setter?.call(descriptionTextarea, "Join our team.");
				descriptionTextarea.dispatchEvent(
					new Event("input", { bubbles: true }),
				);
			}
		});

		// Submit form
		const form = container.querySelector("form");
		await act(async () => {
			form?.dispatchEvent(new Event("submit", { bubbles: true }));
		});

		expect(mockCreateJobApplication).toHaveBeenCalledWith(
			"Google",
			"Staff SWE",
			"NYC",
			"https://careers.google.com/job",
			"Join our team.",
		);
		expect(onCreated).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/jobs/$id",
			params: { id: "mock-app-id" },
		});

		await act(async () => {
			root.unmount();
		});
	});
});
