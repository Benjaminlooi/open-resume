// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewJobApplicationModal from "./NewJobApplicationModal";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
	.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("#/lib/job-application-store", () => ({
	useJobApplicationStore: (selector: any) => {
		const state = {
			createJobApplication: vi.fn(() => "mock-id"),
		};
		return selector ? selector(state) : state;
	},
}));

describe("NewJobApplicationModal", () => {
	async function renderModal() {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<NewJobApplicationModal onClose={vi.fn()} />);
		});

		return { container, root };
	}

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	it("renders modal header, input fields, and buttons", async () => {
		const { container, root } = await renderModal();
		const html = container.innerHTML;

		expect(html).toContain("New Job Application");
		expect(html).toContain("Company");
		expect(html).toContain("Job Title");
		expect(html).toContain("Location");
		expect(html).toContain("Job URL");
		expect(html).toContain("Job Description");
		expect(html).toContain("Cancel");
		expect(html).toContain("Add Job");

		await act(async () => {
			root.unmount();
		});
	});

	it("fills job fields from the local companion", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					sourceUrl: "https://example.com/job",
					title: "Backend Engineer",
					company: "Example",
					location: "Remote",
					description: "Build extraction services.",
					rawText: "Backend Engineer at Example. Build extraction services.",
					extractionMethod: "json-ld",
					extractedAt: 1791571200000,
				}),
			})),
		);

		const { container, root } = await renderModal();

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

		const fetchButton = [...container.querySelectorAll("button")].find(
			(button) => button.textContent === "Fetch details",
		);
		expect(fetchButton).toBeDefined();

		await act(async () => {
			fetchButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});

		expect(container.querySelector<HTMLInputElement>("#job-company")?.value).toBe(
			"Example",
		);
		expect(container.querySelector<HTMLInputElement>("#job-title")?.value).toBe(
			"Backend Engineer",
		);
		expect(container.querySelector<HTMLInputElement>("#job-location")?.value).toBe(
			"Remote",
		);
		expect(
			container.querySelector<HTMLTextAreaElement>("#job-description")?.value,
		).toBe("Build extraction services.");

		await act(async () => {
			root.unmount();
		});
		container.remove();
	});
});
