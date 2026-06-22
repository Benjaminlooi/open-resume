import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { JobApplication } from "#/features/job-postings/job-application-schema";
import JobApplicationCard from "./JobApplicationCard";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, params, ...props }: any) => {
		return (
			<a href={to} {...props}>
				{children}
			</a>
		);
	},
}));

describe("JobApplicationCard", () => {
	const mockApp: JobApplication = {
		id: "123",
		company: "Acme Corp",
		title: "Software Engineer",
		location: "Remote",
		sourceUrl: "https://acme.com",
		description: "Great role",
		status: "saved",
		sourceResumeId: "res-1",
		sourceResumeName: "My Main Resume",
		sourceResumeSnapshot: null,
		tailoredResume: null,
		fitBrief: null,
		resumeEditProposals: [],
		coverLetterDraft: null,
		notes: "First note",
		followUpAt: null,
		createdAt: 1000,
		updatedAt: 2000,
	};

	it("renders title, company, location, status, and source resume name", () => {
		const html = renderToStaticMarkup(
			<JobApplicationCard application={mockApp} onDelete={() => {}} />,
		);

		expect(html).toContain("Software Engineer");
		expect(html).toContain("Acme Corp");
		expect(html).toContain("Remote");
		expect(html).toContain("Saved");
		expect(html).toContain("Source: My Main Resume");
	});

	it("renders 'No resume snapshot copied yet' if sourceResumeName is not set", () => {
		const appWithoutResume = { ...mockApp, sourceResumeName: null };
		const html = renderToStaticMarkup(
			<JobApplicationCard application={appWithoutResume} onDelete={() => {}} />,
		);
		expect(html).toContain("No resume snapshot copied yet");
	});
});
