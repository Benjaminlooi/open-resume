import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
	deleteCompanionJob,
	type LocalCompanionJob,
	listCompanionJobs,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
	convertJobToApplication as convertJobToApplicationApi,
} from "#/lib/local-companion-client";
import { useJobApplicationStore } from "./job-application-store";

interface CompanionJobState {
	companionJobs: LocalCompanionJob[];
	isLoading: boolean;
	error: string | null;

	fetchJobs: () => Promise<void>;
	retryJobCrawl: (id: string) => Promise<void>;
	retryJobAnalyze: (id: string) => Promise<void>;
	deleteJob: (id: string) => Promise<void>;
	convertJobToApplication: (job: LocalCompanionJob) => Promise<string>;
}

export const useCompanionJobStore = create<CompanionJobState>()(
	devtools(
		(set, get) => ({
			companionJobs: [],
			isLoading: false,
			error: null,

			fetchJobs: async () => {
				set({ isLoading: true, error: null });
				try {
					const jobs = await listCompanionJobs();
					set({ companionJobs: jobs, isLoading: false });
				} catch (err) {
					set({
						error: err instanceof Error ? err.message : "Failed to load jobs",
						isLoading: false,
					});
				}
			},

			retryJobCrawl: async (id) => {
				try {
					await retryCompanionJobCrawl(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to retry crawl" });
				}
			},

			retryJobAnalyze: async (id) => {
				try {
					await retryCompanionJobAnalyze(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to retry analysis" });
				}
			},

			deleteJob: async (id) => {
				try {
					await deleteCompanionJob(id);
					await get().fetchJobs();
				} catch (err) {
					set({ error: err instanceof Error ? err.message : "Failed to delete job" });
				}
			},

			convertJobToApplication: async (job) => {
				const app = await convertJobToApplicationApi(job.id);
				await get().fetchJobs();
				await useJobApplicationStore.getState().loadJobApplications();
				return app.id;
			},
		}),
		{ name: "companion-job-store" },
	),
);
