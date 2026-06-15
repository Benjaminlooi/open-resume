import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
	deleteCompanionJob,
	type LocalCompanionJob,
	listCompanionJobs,
	retryCompanionJobAnalyze,
	retryCompanionJobCrawl,
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

function getHostname(sourceUrl: string) {
	try {
		return new URL(sourceUrl).hostname;
	} catch {
		return sourceUrl;
	}
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
				const hostname = getHostname(job.sourceUrl);
				const company = job.parsedCompany || hostname;
				const title = job.parsedTitle || "Untitled Job";
				const location = job.parsedLocation || "";
				const sourceUrl = job.sourceUrl;
				const description = job.parsedDescription || job.cleanedText;

				const { createJobApplication, saveFitBrief } = useJobApplicationStore.getState();

				const appId = createJobApplication(
					company,
					title,
					location,
					sourceUrl,
					description,
				);

				if (job.fitBriefJson) {
					try {
						const fitBrief = JSON.parse(job.fitBriefJson);
						saveFitBrief(appId, fitBrief);
					} catch (e) {
						console.error("Failed to parse fitBriefJson", e);
					}
				}

				try {
					await deleteCompanionJob(job.id);
					await get().fetchJobs();
				} catch (err) {
					console.error("Failed to delete companion job during conversion", err);
				}

				return appId;
			},
		}),
		{ name: "companion-job-store" },
	),
);
