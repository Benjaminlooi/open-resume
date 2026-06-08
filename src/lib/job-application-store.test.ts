// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeEditProposal } from "./job-application-schema";
import { useJobApplicationStore } from "./job-application-store";
import { useResumeIndexStore } from "./resume-index-store";
import type { Resume } from "./resume-schema";

const resume: Resume = {
	personalInfo: {
		fullName: "Alex Morgan",
		email: "alex@example.com",
		phone: "",
		location: "Remote",
		contactLinks: [],
	},
	summary: "Product leader",
	sections: [
		{ id: "summary", name: "Summary", visible: true },
		{ id: "experience", name: "Experience", visible: true },
	],
	experience: [
		{
			id: "exp-1",
			company: "Acme",
			role: "Product Manager",
			startDate: "2024",
			endDate: "Present",
			location: "Remote",
			bullets: ["Led launches"],
			description: "Owned roadmap",
		},
	],
	education: [],
	skills: [{ id: "skills-1", category: "Tools", items: "SQL, Figma" }],
	projects: [{ id: "project-1", name: "Portal", url: "", date: "", description: "Built portal" }],
	certifications: [],
	languages: [],
};

const editorResume = {
	...resume,
	id: "resume-1",
	name: "Primary Resume",
	activeSection: "summary",
	templateId: "demo",
};

const proposal: ResumeEditProposal = {
	id: "proposal-1",
	target: { section: "summary" },
	currentText: "Product leader",
	suggestedText: "Product leader focused on B2B SaaS growth",
	rationale: "Matches the job keywords.",
	status: "pending",
	createdAt: 100,
};

describe("jobApplicationStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-08T10:00:00Z"));
		localStorage.clear();
		useJobApplicationStore.setState({ jobs: [] });
		useResumeIndexStore.setState({
			resumes: [],
			defaultResumeId: null,
		});
	});

	it("creates and persists job applications", () => {
		const id = useJobApplicationStore.getState().createJobApplication({
			company: "Acme",
			title: "Senior PM",
			description: "Build SaaS products",
		});

		expect(useJobApplicationStore.getState().jobs[0]).toMatchObject({
			id,
			company: "Acme",
			title: "Senior PM",
			status: "saved",
		});
		expect(JSON.parse(localStorage.getItem("job-applications") ?? "{}").jobs).toHaveLength(1);
	});

	it("copies the default resume when tailoring begins", () => {
		localStorage.setItem("resume-resume-1", JSON.stringify(editorResume));
		useResumeIndexStore.setState({
			resumes: [
				{
					id: "resume-1",
					name: "Primary Resume",
					templateId: "demo",
					lastModified: 1,
				},
			],
			defaultResumeId: "resume-1",
		});
		const id = useJobApplicationStore.getState().createJobApplication({
			company: "Acme",
			title: "Senior PM",
			description: "Build SaaS products",
		});

		expect(useJobApplicationStore.getState().ensureTailoredResume(id)).toBe(true);

		const job = useJobApplicationStore.getState().jobs[0];
		expect(job.sourceResumeId).toBe("resume-1");
		expect(job.sourceResumeName).toBe("Primary Resume");
		expect(job.sourceResumeSnapshot?.summary).toBe("Product leader");
		expect(job.tailoredResume?.summary).toBe("Product leader");
		expect(job.tailoredResume).not.toBe(job.sourceResumeSnapshot);
	});

	it("applies proposals only to the tailored resume", () => {
		localStorage.setItem("resume-resume-1", JSON.stringify(editorResume));
		useResumeIndexStore.setState({
			resumes: [
				{
					id: "resume-1",
					name: "Primary Resume",
					templateId: "demo",
					lastModified: 1,
				},
			],
			defaultResumeId: "resume-1",
		});
		const id = useJobApplicationStore.getState().createJobApplication({
			company: "Acme",
			title: "Senior PM",
			description: "Build SaaS products",
		});
		useJobApplicationStore.getState().ensureTailoredResume(id);
		useJobApplicationStore.getState().saveResumeEditProposals(id, [proposal]);

		expect(
			useJobApplicationStore.getState().applyResumeEditProposal(id, "proposal-1"),
		).toBe(true);

		const job = useJobApplicationStore.getState().jobs[0];
		expect(job.tailoredResume?.summary).toBe(
			"Product leader focused on B2B SaaS growth",
		);
		expect(job.sourceResumeSnapshot?.summary).toBe("Product leader");
		expect(JSON.parse(localStorage.getItem("resume-resume-1") ?? "{}").summary).toBe(
			"Product leader",
		);
		expect(job.resumeEditProposals[0]?.status).toBe("applied");
	});

	it("reports missing pipeline inputs and stale proposal targets", () => {
		const id = useJobApplicationStore.getState().createJobApplication({
			company: "",
			title: "",
			description: "",
		});
		useJobApplicationStore.getState().saveResumeEditProposals(id, [proposal]);

		expect(useJobApplicationStore.getState().validatePipeline()).toEqual([
			expect.objectContaining({ code: "missing_title_or_company" }),
			expect.objectContaining({ code: "missing_description" }),
			expect.objectContaining({ code: "missing_default_resume" }),
			expect.objectContaining({ code: "stale_proposal_target" }),
		]);
	});
});
