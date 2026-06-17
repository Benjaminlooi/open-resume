import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	convertJobToApplication,
	deleteCompanionJob,
	listCompanionJobs,
	listJobApplications,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
} from "#/lib/local-companion-client";
import { useCompanionJobStore } from "./companion-job-store";
import { useJobApplicationStore } from "./job-application-store";

vi.mock("#/lib/local-companion-client", () => ({
	listCompanionJobs: vi.fn(),
	deleteCompanionJob: vi.fn(),
	retryCompanionJobCrawl: vi.fn(),
	retryCompanionJobAnalyze: vi.fn(),
	convertJobToApplication: vi.fn(),
	listJobApplications: vi.fn(),
}));

const listCompanionJobsMock = vi.mocked(listCompanionJobs);
const deleteCompanionJobMock = vi.mocked(deleteCompanionJob);
const retryCompanionJobCrawlMock = vi.mocked(retryCompanionJobCrawl);
const retryCompanionJobAnalyzeMock = vi.mocked(retryCompanionJobAnalyze);
const convertJobToApplicationMock = vi.mocked(convertJobToApplication);
const listJobApplicationsMock = vi.mocked(listJobApplications);

const initialCompanionState = JSON.parse(
	JSON.stringify(useCompanionJobStore.getState()),
);
const initialJobAppState = JSON.parse(
	JSON.stringify(useJobApplicationStore.getState()),
);

describe("useCompanionJobStore", () => {
	beforeEach(() => {
		useCompanionJobStore.setState(
			JSON.parse(JSON.stringify(initialCompanionState)),
		);
		useJobApplicationStore.setState(
			JSON.parse(JSON.stringify(initialJobAppState)),
		);
		vi.clearAllMocks();
	});

	it("should fetch jobs and update store", async () => {
		const mockJobs = [
			{
				id: "1",
				sourceUrl: "https://example.com",
				crawlStatus: "ready" as const,
			},
		] as any;
		listCompanionJobsMock.mockResolvedValue(mockJobs);

		await useCompanionJobStore.getState().fetchJobs();

		expect(listCompanionJobsMock).toHaveBeenCalled();
		expect(useCompanionJobStore.getState().companionJobs).toEqual(mockJobs);
	});

	it("should retry crawl and refresh jobs", async () => {
		retryCompanionJobCrawlMock.mockResolvedValue({
			id: "1",
			sourceUrl: "https://example.com",
			crawlStatus: "crawling" as const,
		} as any);
		listCompanionJobsMock.mockResolvedValue([]);

		await useCompanionJobStore.getState().retryJobCrawl("1");

		expect(retryCompanionJobCrawlMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
	});

	it("should retry analyze and refresh jobs", async () => {
		retryCompanionJobAnalyzeMock.mockResolvedValue({
			id: "1",
			sourceUrl: "https://example.com",
			crawlStatus: "analyzing" as const,
		} as any);
		listCompanionJobsMock.mockResolvedValue([]);

		await useCompanionJobStore.getState().retryJobAnalyze("1");

		expect(retryCompanionJobAnalyzeMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
	});

	it("should delete job and refresh jobs", async () => {
		deleteCompanionJobMock.mockResolvedValue({ deleted: true });
		listCompanionJobsMock.mockResolvedValue([]);

		await useCompanionJobStore.getState().deleteJob("1");

		expect(deleteCompanionJobMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
	});

	it("should convert job to application, fetch companion jobs, and load job applications", async () => {
		const mockJob = {
			id: "1",
			sourceUrl: "https://example.com/job",
			crawlStatus: "ready" as const,
			parsedCompany: "Test Co",
			parsedTitle: "Dev",
			parsedLocation: "NY",
			cleanedText: "Description here",
			fitBriefJson: JSON.stringify({ roleSummary: "Great role" }),
		} as any;

		const mockApp = {
			id: "app-123",
			company: "Test Co",
			title: "Dev",
			location: "NY",
			sourceUrl: "https://example.com/job",
			description: "Description here",
			status: "saved",
			fitBrief: { roleSummary: "Great role" },
		} as any;

		convertJobToApplicationMock.mockResolvedValue(mockApp);
		listCompanionJobsMock.mockResolvedValue([]);
		listJobApplicationsMock.mockResolvedValue([mockApp]);

		const appId = await useCompanionJobStore
			.getState()
			.convertJobToApplication(mockJob);

		expect(appId).toBe("app-123");
		expect(convertJobToApplicationMock).toHaveBeenCalledWith("1");
		expect(listCompanionJobsMock).toHaveBeenCalled();
		expect(listJobApplicationsMock).toHaveBeenCalled();

		const app = useJobApplicationStore
			.getState()
			.jobApplications.find((a) => a.id === appId);
		expect(app).toBeDefined();
		expect(app?.company).toBe("Test Co");
		expect(app?.fitBrief).toEqual({ roleSummary: "Great role" });
	});
});
