import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
	convertJobToApplication as convertJobToApplicationApi,
	deleteJobPosting,
	type LocalJobPosting,
	listJobPostings,
	retryJobPostingAnalyze,
	retryJobPostingCrawl,
} from "#/lib/local-companion-client";
import { useJobApplicationStore } from "./job-application-store";

interface JobPostingState {
	jobPostings: LocalJobPosting[];
	isLoading: boolean;
	error: string | null;

	fetchJobPostings: () => Promise<void>;
	retryJobCrawl: (id: string) => Promise<void>;
	retryJobAnalyze: (id: string) => Promise<void>;
	deleteJob: (id: string) => Promise<void>;
	convertJobToApplication: (job: LocalJobPosting) => Promise<string>;
}

export const useJobPostingStore = create<JobPostingState>()(
	devtools(
		(set, get) => ({
			jobPostings: [],
			isLoading: false,
			error: null,

			fetchJobPostings: async () => {
				set({ isLoading: true, error: null });
				try {
					const postings = await listJobPostings();
					set({ jobPostings: postings, isLoading: false });
				} catch (err) {
					set({
						error: err instanceof Error ? err.message : "Failed to load job postings",
						isLoading: false,
					});
				}
			},

			retryJobCrawl: async (id) => {
				try {
					await retryJobPostingCrawl(id);
					await get().fetchJobPostings();
				} catch (err) {
					set({
						error: err instanceof Error ? err.message : "Failed to retry crawl",
					});
				}
			},

			retryJobAnalyze: async (id) => {
				try {
					await retryJobPostingAnalyze(id);
					await get().fetchJobPostings();
				} catch (err) {
					set({
						error:
							err instanceof Error ? err.message : "Failed to retry analysis",
					});
				}
			},

			deleteJob: async (id) => {
				try {
					await deleteJobPosting(id);
					await get().fetchJobPostings();
				} catch (err) {
					set({
						error: err instanceof Error ? err.message : "Failed to delete job posting",
					});
				}
			},

			convertJobToApplication: async (job) => {
				const app = await convertJobToApplicationApi(job.id);
				await get().fetchJobPostings();
				await useJobApplicationStore.getState().loadJobApplications();
				return app.id;
			},
		}),
		{ name: "job-posting-store" },
	),
);
