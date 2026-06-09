import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
	CoverLetterDraft,
	JobApplication,
	JobApplicationStatus,
	JobFitBrief,
	ResumeEditProposal,
} from "./job-application-schema";
import { useResumeIndexStore } from "./resume-index-store";
import { getResumeData } from "./resume-store";
import type { Resume } from "./resume-schema";

export interface JobApplicationState {
	jobApplications: JobApplication[];
	createJobApplication: (
		company: string,
		title: string,
		location: string,
		sourceUrl: string,
		description: string,
	) => string;
	updateJobApplication: (id: string, updates: Partial<JobApplication>) => void;
	deleteJobApplication: (id: string) => void;
	setStatus: (id: string, status: JobApplicationStatus) => void;
	saveFitBrief: (id: string, fitBrief: JobFitBrief) => void;
	ensureTailoredResume: (id: string) => void;
	saveResumeEditProposals: (
		id: string,
		proposals: ResumeEditProposal[],
	) => void;
	applyResumeEditProposal: (id: string, proposalId: string) => void;
	rejectResumeEditProposal: (id: string, proposalId: string) => void;
	saveCoverLetterDraft: (
		id: string,
		coverLetterDraft: CoverLetterDraft,
	) => void;
	validatePipeline: () => Record<string, string[]>;
}

const getInitialState = (): { jobApplications: JobApplication[] } => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("job-applications");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				if (parsed && Array.isArray(parsed.jobApplications)) {
					return { jobApplications: parsed.jobApplications };
				}
			} catch (e) {
				console.error("Failed to parse job applications state", e);
			}
		}
	}
	return { jobApplications: [] };
};

export const useJobApplicationStore = create<JobApplicationState>()(
	devtools(
		(set, get) => ({
			...getInitialState(),

			createJobApplication: (
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

				set((state) => ({
					jobApplications: [...state.jobApplications, newApp],
				}));

				return id;
			},

			updateJobApplication: (id, updates) =>
				set((state) => ({
					jobApplications: state.jobApplications.map((app) =>
						app.id === id ? { ...app, ...updates, updatedAt: Date.now() } : app,
					),
				})),

			deleteJobApplication: (id) =>
				set((state) => ({
					jobApplications: state.jobApplications.filter((app) => app.id !== id),
				})),

			setStatus: (id, status) =>
				set((state) => ({
					jobApplications: state.jobApplications.map((app) =>
						app.id === id ? { ...app, status, updatedAt: Date.now() } : app,
					),
				})),

			saveFitBrief: (id, fitBrief) =>
				set((state) => ({
					jobApplications: state.jobApplications.map((app) =>
						app.id === id ? { ...app, fitBrief, updatedAt: Date.now() } : app,
					),
				})),

			ensureTailoredResume: (id) => {
				const app = get().jobApplications.find((a) => a.id === id);
				if (!app || app.tailoredResume) return;

				const defaultResumeId = useResumeIndexStore.getState().defaultResumeId;
				if (!defaultResumeId) return;

				const defaultResume = getResumeData(defaultResumeId);
				if (!defaultResume) return;

				const indexState = useResumeIndexStore.getState();
				const resumeIndexEntry = indexState.resumes.find(
					(r) => r.id === defaultResumeId,
				);
				const sourceResumeName = resumeIndexEntry
					? resumeIndexEntry.name
					: defaultResume.name || "Default Resume";

				const {
					id: _id,
					name: _name,
					activeSection: _activeSection,
					templateId: _templateId,
					...sourceResumeSnapshot
				} = defaultResume;

				const tailoredResume = JSON.parse(JSON.stringify(sourceResumeSnapshot));

				set((state) => ({
					jobApplications: state.jobApplications.map((a) =>
						a.id === id
							? {
									...a,
									sourceResumeId: defaultResumeId,
									sourceResumeName,
									sourceResumeSnapshot,
									tailoredResume,
									status: "tailoring",
									updatedAt: Date.now(),
								}
							: a,
					),
				}));
			},

			saveResumeEditProposals: (id, proposals) =>
				set((state) => ({
					jobApplications: state.jobApplications.map((app) =>
						app.id === id
							? {
									...app,
									resumeEditProposals: proposals,
									updatedAt: Date.now(),
								}
							: app,
					),
				})),

			applyResumeEditProposal: (id, proposalId) =>
				set((state) => {
					return {
						jobApplications: state.jobApplications.map((app) => {
							if (app.id !== id) return app;
							if (!app.tailoredResume) return app;

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
							if (!proposal) return app;

							const tailoredResume = JSON.parse(
								JSON.stringify(app.tailoredResume),
							) as Resume;
							const { target, suggestedText } = proposal;

							if (target.section === "summary") {
								tailoredResume.summary = suggestedText;
							} else if (target.section === "experience") {
								const exp = tailoredResume.experience?.find(
									(item) => item.id === target.itemId,
								);
								if (exp) {
									if (
										target.field === "role" ||
										target.field === "description"
									) {
										exp[target.field] = suggestedText;
									} else if (target.field === "bullet") {
										if (!exp.bullets) exp.bullets = [];
										exp.bullets[target.bulletIndex] = suggestedText;
									}
								}
							} else if (target.section === "skills") {
								const skill = tailoredResume.skills?.find(
									(item) => item.id === target.itemId,
								);
								if (skill && target.field === "items") {
									skill.items = suggestedText;
								}
							} else if (target.section === "projects") {
								const proj = tailoredResume.projects?.find(
									(item) => item.id === target.itemId,
								);
								if (proj && target.field === "description") {
									proj.description = suggestedText;
								}
							}

							return {
								...app,
								tailoredResume,
								resumeEditProposals: proposals,
								updatedAt: Date.now(),
							};
						}),
					};
				}),

			rejectResumeEditProposal: (id, proposalId) =>
				set((state) => ({
					jobApplications: state.jobApplications.map((app) => {
						if (app.id !== id) return app;
						return {
							...app,
							resumeEditProposals: app.resumeEditProposals.map((prop) =>
								prop.id === proposalId
									? { ...prop, status: "rejected" as const }
									: prop,
							),
							updatedAt: Date.now(),
						};
					}),
				})),

			saveCoverLetterDraft: (id, coverLetterDraft) =>
				set((state) => ({
					jobApplications: state.jobApplications.map((app) =>
						app.id === id
							? { ...app, coverLetterDraft, updatedAt: Date.now() }
							: app,
					),
				})),

			validatePipeline: () => {
				const { jobApplications } = get();
				const defaultResumeId = useResumeIndexStore.getState().defaultResumeId;
				const warnings: Record<string, string[]> = {};

				for (const app of jobApplications) {
					if (app.status === "archived") continue;

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
					if (!app.tailoredResume && !defaultResumeId) {
						appWarnings.push("No tailored resume and no default resume set.");
					}

					if (app.tailoredResume) {
						for (const prop of app.resumeEditProposals) {
							const { target } = prop;
							if (target.section === "experience") {
								const exists = app.tailoredResume.experience?.some(
									(item) => item.id === target.itemId,
								);
								if (!exists) {
									appWarnings.push(
										`Stale proposal target: experience item ${target.itemId} is no longer present.`,
									);
								}
							} else if (target.section === "skills") {
								const exists = app.tailoredResume.skills?.some(
									(item) => item.id === target.itemId,
								);
								if (!exists) {
									appWarnings.push(
										`Stale proposal target: skill group ${target.itemId} is no longer present.`,
									);
								}
							} else if (target.section === "projects") {
								const exists = app.tailoredResume.projects?.some(
									(item) => item.id === target.itemId,
								);
								if (!exists) {
									appWarnings.push(
										`Stale proposal target: project item ${target.itemId} is no longer present.`,
									);
								}
							}
						}
					}

					if (appWarnings.length > 0) {
						warnings[app.id] = appWarnings;
					}
				}

				return warnings;
			},
		}),
		{ name: "job-application-store" },
	),
);

if (typeof window !== "undefined") {
	useJobApplicationStore.subscribe((state) => {
		const { jobApplications } = state;
		localStorage.setItem(
			"job-applications",
			JSON.stringify({ jobApplications }),
		);
	});
}
