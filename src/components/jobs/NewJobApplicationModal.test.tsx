import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NewJobApplicationModal from "./NewJobApplicationModal";

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
	it("renders modal header, input fields, and buttons", () => {
		const html = renderToStaticMarkup(
			<NewJobApplicationModal onClose={() => {}} />,
		);

		expect(html).toContain("New Job Application");
		expect(html).toContain("Company");
		expect(html).toContain("Job Title");
		expect(html).toContain("Location");
		expect(html).toContain("Job URL");
		expect(html).toContain("Job Description");
		expect(html).toContain("Cancel");
		expect(html).toContain("Add Job");
	});
});
