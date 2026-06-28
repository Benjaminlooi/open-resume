import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobApplication } from "#/features/job-postings/job-application-schema";
import ApplicationTrackerStep from "./ApplicationTrackerStep";
import CoverLetterStep from "./CoverLetterStep";
import FitBriefStep from "./FitBriefStep";
import JobDetailsStep from "./JobDetailsStep";
import ResumeTailoringStep from "./ResumeTailoringStep";

// Setup mocks
const mockApplication: JobApplication = {
	id: "job-123",
	company: "Test Company",
	title: "Test Engineer",
	location: "Remote",
	sourceUrl: "https://test.com/job",
	description: "Test description containing details.",
	status: "saved",
	sourceResumeId: null,
	sourceResumeName: null,
	sourceResumeSnapshot: null,
	tailoredResume: null,
	fitBrief: null,
	resumeEditProposals: [],
	coverLetterDraft: null,
	notes: "Initial test notes.",
	followUpAt: null,
	createdAt: 1000,
	updatedAt: 2000,
};

let mockCurrentApp = { ...mockApplication };

vi.mock("#/lib/root-store", () => {
	const getJobApplicationState = () => ({
		jobApplications: [mockCurrentApp],
		updateJobApplication: vi.fn((_id, updates) => {
			mockCurrentApp = { ...mockCurrentApp, ...updates };
		}),
		setStatus: vi.fn((_id, status) => {
			mockCurrentApp = { ...mockCurrentApp, status };
		}),
		saveFitBrief: vi.fn((_id, fitBrief) => {
			mockCurrentApp = { ...mockCurrentApp, fitBrief };
		}),
		ensureTailoredResume: vi.fn((_id) => {
			mockCurrentApp = {
				...mockCurrentApp,
				tailoredResume: {
					summary: "Tailored summary",
					experience: [],
					education: [],
					skills: [],
					projects: [],
					certifications: [],
					languages: [],
				} as any,
			};
		}),
		saveResumeEditProposals: vi.fn((_id, proposals) => {
			mockCurrentApp = { ...mockCurrentApp, resumeEditProposals: proposals };
		}),
		applyResumeEditProposal: vi.fn(),
		rejectResumeEditProposal: vi.fn(),
		saveCoverLetterDraft: vi.fn((_id, draft) => {
			mockCurrentApp = { ...mockCurrentApp, coverLetterDraft: draft };
		}),
	});

	const useRootStoreMock = (selector: (state: any) => any) => {
		const state = {
			resumeIndex: {
				defaultResumeId: "res-1",
				resumes: [{ id: "res-1", name: "My Default Resume" }],
			},
			jobApplication: getJobApplicationState(),
		};
		return selector(state);
	};

	useRootStoreMock.getState = () => ({
		resumeIndex: {
			defaultResumeId: "res-1",
			resumes: [{ id: "res-1", name: "My Default Resume" }],
		},
		jobApplication: getJobApplicationState(),
	});

	return {
		getResumeData: () =>
			Promise.resolve({
				id: "res-1",
				name: "My Default Resume",
				summary: "Default summary",
				experience: [],
				education: [],
				skills: [],
				projects: [],
			}),
		useRootStore: useRootStoreMock,
	};
});

vi.mock("#/features/job-postings/job-ai", () => ({
	generateJobFitBrief: vi.fn(),
	generateResumeTailoring: vi.fn(),
	generateCoverLetter: vi.fn(),
}));

describe("Guided Workspace Step Components", () => {
	beforeEach(() => {
		mockCurrentApp = { ...mockApplication };
	});

	describe("JobDetailsStep", () => {
		it("renders correctly with job data", () => {
			const html = renderToStaticMarkup(
				<JobDetailsStep applicationId="job-123" />,
			);
			expect(html).toContain("Job Details");
			expect(html).toContain("Test Company");
			expect(html).toContain("Test Engineer");
			expect(html).toContain("Remote");
			expect(html).toContain("https://test.com/job");
			expect(html).toContain("Test description containing details.");
			expect(html).toContain("Save Details");
		});
	});

	describe("FitBriefStep", () => {
		it("renders empty state correctly", () => {
			const html = renderToStaticMarkup(
				<FitBriefStep applicationId="job-123" />,
			);
			expect(html).toContain("No Fit Analysis Generated Yet");
			expect(html).toContain("Generate Fit Analysis");
		});

		it("renders analysis data when fitBrief is present", () => {
			mockCurrentApp.fitBrief = {
				roleSummary: "This is a great engineering role.",
				requirements: ["5 years React", "TypeScript expertise"],
				keywords: ["React", "TypeScript", "Tailwind"],
				strengths: ["Great frontend background"],
				gaps: ["No backend experience"],
				risks: ["Domain mismatch"],
				nextActions: ["Study Node.js", "Brush up on databases"],
				generatedAt: 1000,
			};

			const html = renderToStaticMarkup(
				<FitBriefStep applicationId="job-123" />,
			);
			expect(html).toContain("Role Summary");
			expect(html).toContain("This is a great engineering role.");
			expect(html).toContain("5 years React");
			expect(html).toContain("React");
			expect(html).toContain("TypeScript");
			expect(html).toContain("Strengths &amp; Matches");
			expect(html).toContain("Great frontend background");
			expect(html).toContain("Gaps &amp; Risks");
			expect(html).toContain("No backend experience");
			expect(html).toContain("💡 Recommended Next Actions");
			expect(html).toContain("Study Node.js");
		});
	});

	describe("ResumeTailoringStep", () => {
		beforeEach(() => {
			mockCurrentApp.fitBrief = {
				roleSummary: "summary",
				requirements: [],
				keywords: [],
				strengths: [],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1000,
			};
		});

		it("renders start tailoring state when tailoredResume is null", () => {
			const html = renderToStaticMarkup(
				<ResumeTailoringStep applicationId="job-123" />,
			);
			expect(html).toContain("Start Resume Tailoring");
			expect(html).toContain("My Default Resume");
			expect(html).toContain("Start Tailoring");
		});

		it("renders empty proposals state when tailoredResume is set but no proposals exist", () => {
			mockCurrentApp.tailoredResume = {
				summary: "Default summary",
				experience: [],
				education: [],
				skills: [],
				projects: [],
			} as any;

			const html = renderToStaticMarkup(
				<ResumeTailoringStep applicationId="job-123" />,
			);
			expect(html).toContain("No Proposals Generated");
			expect(html).toContain("Generate Tailoring Proposals");
		});

		it("renders proposals list when proposals exist", () => {
			mockCurrentApp.tailoredResume = {
				summary: "Default summary",
				experience: [],
				education: [],
				skills: [],
				projects: [],
			} as any;
			mockCurrentApp.resumeEditProposals = [
				{
					id: "prop-1",
					target: { section: "summary" },
					currentText: "Old summary",
					suggestedText: "New tailored summary",
					rationale: "Aligns better with frontend focus",
					status: "pending",
					createdAt: 1000,
				},
			];

			const html = renderToStaticMarkup(
				<ResumeTailoringStep applicationId="job-123" />,
			);
			expect(html).toContain("AI Recommendations (1)");
			expect(html).toContain("Profile Summary");
			expect(html).toContain("Aligns better with frontend focus");
			expect(html).toContain("Old summary");
			expect(html).toContain("New tailored summary");
			expect(html).toContain("Reject Proposal");
			expect(html).toContain("Approve &amp; Apply");
		});
	});

	describe("CoverLetterStep", () => {
		beforeEach(() => {
			mockCurrentApp.fitBrief = {
				roleSummary: "summary",
				requirements: [],
				keywords: [],
				strengths: [],
				gaps: [],
				risks: [],
				nextActions: [],
				generatedAt: 1000,
			};
		});

		it("renders empty state when coverLetterDraft is null", () => {
			const html = renderToStaticMarkup(
				<CoverLetterStep applicationId="job-123" />,
			);
			expect(html).toContain("No Cover Letter Drafted Yet");
			expect(html).toContain("Generate Cover Letter");
		});

		it("renders editor when coverLetterDraft is present", () => {
			mockCurrentApp.coverLetterDraft = {
				content: "Dear Hiring Manager, I am excited...",
				generatedAt: 1000,
				updatedAt: 1000,
			};

			const html = renderToStaticMarkup(
				<CoverLetterStep applicationId="job-123" />,
			);
			expect(html).toContain("Dear Hiring Manager, I am excited...");
		});
	});

	describe("ApplicationTrackerStep", () => {
		it("renders form controls correctly", () => {
			const html = renderToStaticMarkup(
				<ApplicationTrackerStep applicationId="job-123" />,
			);
			expect(html).toContain("Application Status");
			expect(html).toContain("Follow-up Reminder Date");
			expect(html).toContain("Notes &amp; Log");
			expect(html).toContain("Initial test notes.");
		});
	});
});
