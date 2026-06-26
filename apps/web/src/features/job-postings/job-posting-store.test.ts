import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	convertJobToApplication,
	deleteJobPosting,
	listJobPostings,
	listJobApplications,
	retryJobPostingAnalyze,
	retryJobPostingCrawl,
} from "#/lib/local-companion-client";
import { useRootStore } from "#/lib/root-store";

const useJobPostingStore = {
	getState: () => useRootStore.getState().jobPosting,
	setState: (data: any) => {
		useRootStore.setState((prev: any) => ({
			jobPosting: { ...prev.jobPosting, ...data },
		}));
	},
};

const useJobApplicationStore = {
	getState: () => useRootStore.getState().jobApplication,
	setState: (data: any) => {
		useRootStore.setState((prev: any) => ({
			jobApplication: { ...prev.jobApplication, ...data },
		}));
	},
};

vi.mock("#/lib/local-companion-client", () => ({
	listJobPostings: vi.fn(),
	deleteJobPosting: vi.fn(),
	retryJobPostingCrawl: vi.fn(),
	retryJobPostingAnalyze: vi.fn(),
	convertJobToApplication: vi.fn(),
	listJobApplications: vi.fn(),
}));

const listJobPostingsMock = vi.mocked(listJobPostings);
const deleteJobPostingMock = vi.mocked(deleteJobPosting);
const retryJobPostingCrawlMock = vi.mocked(retryJobPostingCrawl);
const retryJobPostingAnalyzeMock = vi.mocked(retryJobPostingAnalyze);
const convertJobToApplicationMock = vi.mocked(convertJobToApplication);
const listJobApplicationsMock = vi.mocked(listJobApplications);

const initialJobPostingState = JSON.parse(
	JSON.stringify(useJobPostingStore.getState()),
);
const initialJobAppState = JSON.parse(
	JSON.stringify(useJobApplicationStore.getState()),
);

describe("useJobPostingStore", () => {
	beforeEach(() => {
		useJobPostingStore.setState(
			JSON.parse(JSON.stringify(initialJobPostingState)),
		);
		useJobApplicationStore.setState(
			JSON.parse(JSON.stringify(initialJobAppState)),
		);
		vi.clearAllMocks();
	});

	it("should fetch job postings and update store", async () => {
		const mockJobPostings = [
			{
				id: "1",
				sourceUrl: "https://example.com",
				crawlStatus: "ready" as const,
			},
		] as any;
		listJobPostingsMock.mockResolvedValue(mockJobPostings);

		await useJobPostingStore.getState().fetchJobPostings();

		expect(listJobPostingsMock).toHaveBeenCalled();
		expect(useJobPostingStore.getState().jobPostings).toEqual(mockJobPostings);
	});

	it("should retry crawl and refresh job postings", async () => {
		retryJobPostingCrawlMock.mockResolvedValue({
			id: "1",
			sourceUrl: "https://example.com",
			crawlStatus: "crawling" as const,
		} as any);
		listJobPostingsMock.mockResolvedValue([]);

		await useJobPostingStore.getState().retryJobCrawl("1");

		expect(retryJobPostingCrawlMock).toHaveBeenCalledWith("1");
		expect(listJobPostingsMock).toHaveBeenCalled();
	});

	it("should retry analyze and refresh job postings", async () => {
		retryJobPostingAnalyzeMock.mockResolvedValue({
			id: "1",
			sourceUrl: "https://example.com",
			crawlStatus: "analyzing" as const,
		} as any);
		listJobPostingsMock.mockResolvedValue([]);

		await useJobPostingStore.getState().retryJobAnalyze("1");

		expect(retryJobPostingAnalyzeMock).toHaveBeenCalledWith("1");
		expect(listJobPostingsMock).toHaveBeenCalled();
	});

	it("should delete job posting and refresh", async () => {
		deleteJobPostingMock.mockResolvedValue({ deleted: true });
		listJobPostingsMock.mockResolvedValue([]);

		await useJobPostingStore.getState().deleteJob("1");

		expect(deleteJobPostingMock).toHaveBeenCalledWith("1");
		expect(listJobPostingsMock).toHaveBeenCalled();
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
		listJobPostingsMock.mockResolvedValue([]);
		listJobApplicationsMock.mockResolvedValue([mockApp]);

		const appId = await useJobPostingStore
			.getState()
			.convertJobToApplication(mockJob);

		expect(appId).toBe("app-123");
		expect(convertJobToApplicationMock).toHaveBeenCalledWith("1");
		expect(listJobPostingsMock).toHaveBeenCalled();
		expect(listJobApplicationsMock).toHaveBeenCalled();

		const app = useJobApplicationStore
			.getState()
			.jobApplications.find((a) => a.id === appId);
		expect(app).toBeDefined();
		expect(app?.company).toBe("Test Co");
		expect(app?.fitBrief).toEqual({ roleSummary: "Great role" });
	});
});
