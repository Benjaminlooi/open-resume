import type { StateCreator } from "zustand";
import type { RootState } from "./root-store";
import {
	deleteJobPosting,
	type LocalJobPosting,
	listJobPostings,
	retryJobPostingAnalyze,
	retryJobPostingCrawl,
	convertJobToApplication as convertJobToApplicationApi,
} from "./local-backend-client";

export interface JobPostingSlice {
	jobPostings: LocalJobPosting[];
	isLoading: boolean;
	error: string | null;

	fetchJobPostings: () => Promise<void>;
	retryJobCrawl: (id: string) => Promise<void>;
	retryJobAnalyze: (id: string) => Promise<void>;
	deleteJob: (id: string) => Promise<void>;
	convertJobToApplication: (job: LocalJobPosting) => Promise<string>;
}

export const createJobPostingSlice: StateCreator<
	RootState,
	[],
	[],
	JobPostingSlice
> = (set, get) => ({
	jobPostings: [],
	isLoading: false,
	error: null,

	fetchJobPostings: async () => {
		set((state) => ({
			jobPosting: { ...state.jobPosting, isLoading: true, error: null },
		}));
		try {
			const postings = await listJobPostings();
			set((state) => ({
				jobPosting: {
					...state.jobPosting,
					jobPostings: postings,
					isLoading: false,
				},
			}));
		} catch (err) {
			set((state) => ({
				jobPosting: {
					...state.jobPosting,
					error: err instanceof Error ? err.message : "Failed to load job postings",
					isLoading: false,
				},
			}));
		}
	},

	retryJobCrawl: async (id) => {
		try {
			await retryJobPostingCrawl(id);
			await get().jobPosting.fetchJobPostings();
		} catch (err) {
			set((state) => ({
				jobPosting: {
					...state.jobPosting,
					error: err instanceof Error ? err.message : "Failed to retry crawl",
				},
			}));
		}
	},

	retryJobAnalyze: async (id) => {
		try {
			await retryJobPostingAnalyze(id);
			await get().jobPosting.fetchJobPostings();
		} catch (err) {
			set((state) => ({
				jobPosting: {
					...state.jobPosting,
					error: err instanceof Error ? err.message : "Failed to retry analysis",
				},
			}));
		}
	},

	deleteJob: async (id) => {
		try {
			await deleteJobPosting(id);
			await get().jobPosting.fetchJobPostings();
		} catch (err) {
			set((state) => ({
				jobPosting: {
					...state.jobPosting,
					error: err instanceof Error ? err.message : "Failed to delete job posting",
				},
			}));
		}
	},

	convertJobToApplication: async (job) => {
		const app = await convertJobToApplicationApi(job.id);
		await get().jobPosting.fetchJobPostings();
		await get().jobApplication.loadJobApplications();
		return app.id;
	},
});
