import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
	createJobApplication as createJobApplicationApi,
	deleteJobApplication as deleteJobApplicationApi,
	listJobApplications,
	updateJobApplication as updateJobApplicationApi,
} from "#/lib/local-companion-client";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { resumeSchema } from "#/lib/resume-schema";
import { getResumeData } from "#/lib/resume-store";
import type {
	CoverLetterDraft,
	JobApplication,
	JobApplicationStatus,
	JobFitBrief,
	ResumeEditProposal,
} from "./job-application-schema";
import {
	applyProposalToResume,
	getStaleProposalWarning,
} from "./resume-edit-helper";

export interface JobApplicationState {
	jobApplications: JobApplication[];
	createJobApplication: (
		company: string,
		title: string,
		location: string,
		sourceUrl: string,
		description: string,
	) => Promise<string>;
	updateJobApplication: (
		id: string,
		updates: Partial<JobApplication>,
	) => Promise<void>;
	deleteJobApplication: (id: string) => Promise<void>;
	setStatus: (id: string, status: JobApplicationStatus) => Promise<void>;
	saveFitBrief: (id: string, fitBrief: JobFitBrief) => Promise<void>;
	ensureTailoredResume: (id: string) => Promise<void>;
	saveResumeEditProposals: (
		id: string,
		proposals: ResumeEditProposal[],
	) => Promise<void>;
	applyResumeEditProposal: (id: string, proposalId: string) => Promise<void>;
	rejectResumeEditProposal: (id: string, proposalId: string) => Promise<void>;
	saveCoverLetterDraft: (
		id: string,
		coverLetterDraft: CoverLetterDraft,
	) => Promise<void>;
	validatePipeline: () => Record<string, string[]>;
	clearStaleProposal: (appId: string, proposalId: string) => Promise<void>;
	associateSourceResume: (appId: string, resumeId: string) => Promise<void>;
	archiveIncompleteJob: (appId: string) => Promise<void>;
	loadJobApplications: () => Promise<void>;
}

export const useJobApplicationStore = create<JobApplicationState>()(
	devtools(
		(set, get) => ({
			jobApplications: [],

			loadJobApplications: async () => {
				try {
					const apps = await listJobApplications();
					set({ jobApplications: apps as unknown as JobApplication[] });
				} catch (err) {
					console.error(
						"Failed to load job applications from companion backend",
						err,
					);
				}
			},

			createJobApplication: async (
				company,
				title,
				location,
				sourceUrl,
				description,
			) => {
				const id =
					globalThis.crypto?.randomUUID?.() ??
					`job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
				const now = Date.now();
				const newApp: JobApplication = {
					id,
					company,
					title,
					location,
					sourceUrl,
					description,
					status: "saved",
					sourceResumeId: null,
					sourceResumeName: null,
					sourceResumeSnapshot: null,
					tailoredResume: null,
					fitBrief: null,
					resumeEditProposals: [],
					coverLetterDraft: null,
					notes: "",
					followUpAt: null,
					createdAt: now,
					updatedAt: now,
				};

				const previousApps = get().jobApplications;
				set((state) => ({
					jobApplications: [...state.jobApplications, newApp],
				}));

				try {
					const created = await createJobApplicationApi(
						id,
						company,
						title,
						location,
						sourceUrl,
						description,
					);
					set((state) => ({
						jobApplications: state.jobApplications.map((app) =>
							app.id === id ? (created as unknown as JobApplication) : app,
						),
					}));
					return id;
				} catch (err) {
					set({ jobApplications: previousApps });
					throw err;
				}
			},

			updateJobApplication: async (id, updates) => {
				const previousApps = get().jobApplications;
				set((state) => ({
					jobApplications: state.jobApplications.map((app) =>
						app.id === id ? { ...app, ...updates, updatedAt: Date.now() } : app,
					),
				}));

				try {
					const updated = await updateJobApplicationApi(id, updates);
					set((state) => ({
						jobApplications: state.jobApplications.map((app) =>
							app.id === id ? (updated as unknown as JobApplication) : app,
						),
					}));
				} catch (err) {
					set({ jobApplications: previousApps });
					throw err;
				}
			},

			deleteJobApplication: async (id) => {
				const previousApps = get().jobApplications;
				set((state) => ({
					jobApplications: state.jobApplications.filter((app) => app.id !== id),
				}));

				try {
					await deleteJobApplicationApi(id);
				} catch (err) {
					set({ jobApplications: previousApps });
					throw err;
				}
			},

			setStatus: async (id, status) => {
				await get().updateJobApplication(id, { status });
			},

			saveFitBrief: async (id, fitBrief) => {
				await get().updateJobApplication(id, { fitBrief });
			},

			ensureTailoredResume: async (id) => {
				const app = get().jobApplications.find((a) => a.id === id);
				if (!app || app.tailoredResume) return;

				const defaultResumeId = useResumeIndexStore.getState().defaultResumeId;
				if (!defaultResumeId) return;

				const defaultResume = await getResumeData(defaultResumeId);
				if (!defaultResume) return;

				const indexState = useResumeIndexStore.getState();
				const resumeIndexEntry = indexState.resumes.find(
					(r) => r.id === defaultResumeId,
				);
				const sourceResumeName = resumeIndexEntry
					? resumeIndexEntry.name
					: defaultResume.name || "Default Resume";

				const sourceResumeSnapshot = resumeSchema.parse(defaultResume);
				const tailoredResume = JSON.parse(JSON.stringify(sourceResumeSnapshot));

				await get().updateJobApplication(id, {
					sourceResumeId: defaultResumeId,
					sourceResumeName,
					sourceResumeSnapshot,
					tailoredResume,
					status: "tailoring",
				});
			},

			saveResumeEditProposals: async (id, proposals) => {
				await get().updateJobApplication(id, {
					resumeEditProposals: proposals,
				});
			},

			applyResumeEditProposal: async (id, proposalId) => {
				const app = get().jobApplications.find((a) => a.id === id);
				if (!app || !app.tailoredResume) return;

				const proposals = app.resumeEditProposals.map((prop) => {
					if (prop.id === proposalId) {
						return {
							...prop,
							status: "applied" as const,
							appliedAt: Date.now(),
						};
					}
					return prop;
				});

				const proposal = app.resumeEditProposals.find(
					(p) => p.id === proposalId,
				);
				if (!proposal) return;

				const tailoredResume = applyProposalToResume(
					app.tailoredResume,
					proposal.target,
					proposal.suggestedText,
				);

				await get().updateJobApplication(id, {
					tailoredResume,
					resumeEditProposals: proposals,
				});
			},

			rejectResumeEditProposal: async (id, proposalId) => {
				const app = get().jobApplications.find((a) => a.id === id);
				if (!app) return;

				const proposals = app.resumeEditProposals.map((prop) =>
					prop.id === proposalId
						? { ...prop, status: "rejected" as const }
						: prop,
				);

				await get().updateJobApplication(id, {
					resumeEditProposals: proposals,
				});
			},

			saveCoverLetterDraft: async (id, coverLetterDraft) => {
				await get().updateJobApplication(id, { coverLetterDraft });
			},

			validatePipeline: () => {
				const { jobApplications } = get();
				const warnings: Record<string, string[]> = {};

				for (const app of jobApplications) {
					if (app.status === "archived") {
						const hasPendingProposals = app.resumeEditProposals?.some(
							(p) => p.status === "pending",
						);
						if (hasPendingProposals) {
							warnings[app.id] = ["Archived job has pending proposals."];
						}
						continue;
					}

					const appWarnings: string[] = [];

					if (!app.description || app.description.trim() === "") {
						appWarnings.push("Job description is missing.");
					}
					if (!app.title || app.title.trim() === "") {
						appWarnings.push("Job title is missing.");
					}
					if (!app.company || app.company.trim() === "") {
						appWarnings.push("Company name is missing.");
					}
					if (app.sourceResumeId === null) {
						appWarnings.push("No source resume has been associated yet.");
					}

					if (app.tailoredResume) {
						for (const prop of app.resumeEditProposals) {
							const warning = getStaleProposalWarning(
								app.tailoredResume,
								prop.target,
							);
							if (warning) {
								appWarnings.push(warning);
							}
						}
					}

					if (appWarnings.length > 0) {
						warnings[app.id] = appWarnings;
					}
				}

				return warnings;
			},

			clearStaleProposal: async (appId, proposalId) => {
				const app = get().jobApplications.find((a) => a.id === appId);
				if (!app) return;

				const proposals = app.resumeEditProposals.filter(
					(p) => p.id !== proposalId,
				);

				await get().updateJobApplication(appId, {
					resumeEditProposals: proposals,
				});
			},

			associateSourceResume: async (appId, resumeId) => {
				const app = get().jobApplications.find((a) => a.id === appId);
				if (!app) return;

				const resume = await getResumeData(resumeId);
				if (!resume) return;

				const indexState = useResumeIndexStore.getState();
				const resumeIndexEntry = indexState.resumes.find(
					(r) => r.id === resumeId,
				);
				const sourceResumeName = resumeIndexEntry
					? resumeIndexEntry.name
					: resume.name || "Selected Resume";

				const sourceResumeSnapshot = resumeSchema.parse(resume);
				const tailoredResume = JSON.parse(JSON.stringify(sourceResumeSnapshot));

				await get().updateJobApplication(appId, {
					sourceResumeId: resumeId,
					sourceResumeName,
					sourceResumeSnapshot,
					tailoredResume,
					status: "tailoring",
				});
			},

			archiveIncompleteJob: async (appId) => {
				await get().updateJobApplication(appId, { status: "archived" });
			},
		}),
		{ name: "job-application-store" },
	),
);
