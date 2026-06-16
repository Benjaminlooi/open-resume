import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearDefaultResume,
	convertJobToApplication,
	createCompanionJob,
	createJobApplication,
	createResume,
	deleteCompanionJob,
	deleteJobApplication,
	deleteResume,
	getJobApplication,
	getProfile,
	getResume,
	listCompanionJobs,
	listJobApplications,
	listResumes,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
	setDefaultResume,
	syncResume,
	updateJobApplication,
	updateProfile,
	updateResume,
} from "./local-companion-client";

const mockProfile = {
	candidate: {
		fullName: "John Doe",
		email: "john@example.com",
		phone: "12345678",
		location: "NY",
		linkedin: "linkedin.com/in/john",
		portfolioUrl: "john.dev",
		github: "github.com/john",
		twitter: "twitter.com/john",
	},
	targetRoles: {
		primary: ["Software Engineer"],
		archetypes: [
			{ name: "Product Dev", level: "Senior", fit: "primary" as const },
		],
	},
	narrative: {
		headline: "Great dev",
		exitStory: "Moved on",
		superpowers: ["Coding"],
		proofPoints: [
			{ name: "Shipped app", url: "https://app.com", heroMetric: "10x" },
		],
	},
	compensation: {
		targetRange: "100k-120k",
		currency: "USD",
		minimum: "90k",
		preferred: "110k",
		locationFlexibility: "Hybrid",
	},
	location: {
		country: "USA",
		city: "New York",
		timezone: "EST",
		visaStatus: "Citizen",
		onsiteAvailability: "2 days",
		remotePolicy: "Flexible",
	},
};

const mockResumeSummary = {
	id: "resume-1",
	name: "Senior Engineer Resume",
	templateId: "modern",
	lastModified: 1791571200000,
	isDefault: false,
};

const mockResumeDetails = {
	...mockResumeSummary,
	content: {
		personalInfo: {
			fullName: "John Doe",
		},
	},
};

const mockJobApplication = {
	id: "app-1",
	company: "Google",
	title: "Software Engineer",
	location: "Mountain View, CA",
	sourceUrl: "https://google.com/jobs/1",
	description: "Coding job",
	status: "saved" as const,
	sourceResumeId: null,
	sourceResumeName: null,
	sourceResumeSnapshot: null,
	tailoredResume: null,
	fitBrief: null,
	resumeEditProposals: [],
	coverLetterDraft: null,
	notes: "",
	followUpAt: null,
	createdAt: 1791571200000,
	updatedAt: 1791571200000,
};

describe("local companion client", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("creates a companion job", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					id: "job-1",
					sourceUrl: "https://example.com/job",
					crawlStatus: "pending",
					crawlError: null,
					cleanedText: "",
					createdAt: 1791571200000,
					updatedAt: 1791571200000,
					crawledAt: null,
				}),
			})),
		);

		const result = await createCompanionJob("https://example.com/job");

		expect(result).toMatchObject({
			id: "job-1",
			crawlStatus: "pending",
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/jobs",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("lists companion jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ jobs: [] }),
			})),
		);

		await expect(listCompanionJobs()).resolves.toEqual([]);
	});

	it("retries and deletes companion jobs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("/jobs/job-1")) {
					return {
						ok: true,
						json: async () => ({
							deleted: true,
						}),
					};
				}
				return {
					ok: true,
					json: async () => ({
						id: "job-1",
						sourceUrl: "https://example.com/job",
						crawlStatus: "pending",
						crawlError: null,
						cleanedText: "",
						createdAt: 1,
						updatedAt: 2,
						crawledAt: null,
					}),
				};
			}),
		);

		await expect(retryCompanionJobCrawl("job-1")).resolves.toMatchObject({
			id: "job-1",
		});
		await expect(retryCompanionJobAnalyze("job-1")).resolves.toMatchObject({
			id: "job-1",
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/jobs/job-1/retry-analyze",
			expect.objectContaining({ method: "POST" }),
		);
		await expect(deleteCompanionJob("job-1")).resolves.toEqual({
			deleted: true,
		});
	});

	it("gets candidate profile", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockProfile,
			})),
		);

		const result = await getProfile();
		expect(result).toEqual(mockProfile);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/profile",
			undefined,
		);
	});

	it("updates candidate profile", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockProfile,
			})),
		);

		const result = await updateProfile(mockProfile);
		expect(result).toEqual(mockProfile);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/profile",
			expect.objectContaining({
				method: "PUT",
				body: JSON.stringify(mockProfile),
			}),
		);
	});

	it("syncs default resume", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ ok: true }),
			})),
		);

		const resumeData = { personalInfo: { fullName: "John Doe" } };
		const result = await syncResume(resumeData);
		expect(result).toEqual({ ok: true });
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/profile/resume",
			expect.objectContaining({
				method: "PUT",
				body: JSON.stringify({ resume: resumeData }),
			}),
		);
	});

	it("lists resumes", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ resumes: [mockResumeSummary] }),
			})),
		);

		await expect(listResumes()).resolves.toEqual([mockResumeSummary]);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes",
			undefined,
		);
	});

	it("gets a resume", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockResumeDetails,
			})),
		);

		await expect(getResume("resume-1")).resolves.toEqual(mockResumeDetails);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes/resume-1",
			undefined,
		);
	});

	it("creates a resume", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockResumeDetails,
			})),
		);

		await expect(
			createResume(
				"resume-1",
				"Senior Engineer Resume",
				"modern",
				mockResumeDetails.content,
			),
		).resolves.toEqual(mockResumeDetails);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					id: "resume-1",
					name: "Senior Engineer Resume",
					templateId: "modern",
					content: mockResumeDetails.content,
				}),
			}),
		);
	});

	it("updates a resume", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockResumeDetails,
			})),
		);

		const update = {
			name: "Updated Resume",
			content: mockResumeDetails.content,
		};
		await expect(updateResume("resume-1", update)).resolves.toEqual(
			mockResumeDetails,
		);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes/resume-1",
			expect.objectContaining({
				method: "PUT",
				body: JSON.stringify(update),
			}),
		);
	});

	it("deletes a resume", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ deleted: true }),
			})),
		);

		await expect(deleteResume("resume-1")).resolves.toEqual({
			deleted: true,
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes/resume-1",
			expect.objectContaining({ method: "DELETE" }),
		);
	});

	it("sets and clears the default resume", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("/resumes/default")) {
					return {
						ok: true,
						json: async () => ({ ok: true }),
					};
				}
				return {
					ok: true,
					json: async () => ({ ...mockResumeDetails, isDefault: true }),
				};
			}),
		);

		await expect(setDefaultResume("resume-1")).resolves.toMatchObject({
			id: "resume-1",
			isDefault: true,
		});
		await expect(clearDefaultResume()).resolves.toEqual({ ok: true });
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes/resume-1/default",
			expect.objectContaining({ method: "PUT" }),
		);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/resumes/default",
			expect.objectContaining({ method: "DELETE" }),
		);
	});

	it("returns a user-facing error when a resume request fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: false,
				json: async () => ({ error: "Resume not found" }),
			})),
		);

		await expect(getResume("missing")).rejects.toThrow(
			"Local companion could not retrieve this resume.",
		);
	});

	it("returns a user-facing error when the companion is unavailable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("Failed to fetch");
			}),
		);

		await expect(listCompanionJobs()).rejects.toThrow(
			"Local companion is not reachable",
		);
	});

	it("lists job applications", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ jobApplications: [mockJobApplication] }),
			})),
		);

		await expect(listJobApplications()).resolves.toEqual([mockJobApplication]);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/job-applications",
			undefined,
		);
	});

	it("gets a job application", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockJobApplication,
			})),
		);

		await expect(getJobApplication("app-1")).resolves.toEqual(
			mockJobApplication,
		);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/job-applications/app-1",
			undefined,
		);
	});

	it("creates a job application", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockJobApplication,
			})),
		);

		await expect(
			createJobApplication(
				"app-1",
				"Google",
				"Software Engineer",
				"Mountain View, CA",
				"https://google.com/jobs/1",
				"Coding job",
			),
		).resolves.toEqual(mockJobApplication);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/job-applications",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					id: "app-1",
					company: "Google",
					title: "Software Engineer",
					location: "Mountain View, CA",
					sourceUrl: "https://google.com/jobs/1",
					description: "Coding job",
				}),
			}),
		);
	});

	it("updates a job application", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockJobApplication,
			})),
		);

		const data = { status: "applied" as const };
		await expect(updateJobApplication("app-1", data)).resolves.toEqual(
			mockJobApplication,
		);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/job-applications/app-1",
			expect.objectContaining({
				method: "PUT",
				body: JSON.stringify(data),
			}),
		);
	});

	it("deletes a job application", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ deleted: true }),
			})),
		);

		await expect(deleteJobApplication("app-1")).resolves.toEqual({
			deleted: true,
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/job-applications/app-1",
			expect.objectContaining({ method: "DELETE" }),
		);
	});

	it("converts a companion job to a job application", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => mockJobApplication,
			})),
		);

		await expect(convertJobToApplication("job-1")).resolves.toEqual(
			mockJobApplication,
		);
		expect(fetch).toHaveBeenCalledWith(
			"http://127.0.0.1:47321/jobs/job-1/convert",
			expect.objectContaining({ method: "POST" }),
		);
	});
});
