import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
	JobApplication,
	JobApplicationStatus,
	JobFitBrief,
	ResumeEditProposal,
	ResumeEditTarget,
} from "./job-application-schema";
import { jobApplicationSchema } from "./job-application-schema";
import { useResumeIndexStore } from "./resume-index-store";
import { getResumeData, type EditorState } from "./resume-store";
import type { Resume } from "./resume-schema";

export interface PipelineIssue {
	jobId: string;
	code:
		| "missing_description"
		| "missing_default_resume"
		| "stale_proposal_target"
		| "missing_title_or_company";
	message: string;
}

interface CreateJobApplicationInput {
	company?: string;
	title?: string;
	location?: string;
	sourceUrl?: string;
	description?: string;
}

interface JobApplicationState {
	jobs: JobApplication[];
	createJobApplication: (input?: CreateJobApplicationInput) => string;
	updateJobApplication: (
		id: string,
		updates: Partial<
			Pick<
				JobApplication,
				| "company"
				| "title"
				| "location"
				| "sourceUrl"
				| "description"
				| "notes"
				| "followUpAt"
			>
		>,
	) => void;
	deleteJobApplication: (id: string) => void;
	setStatus: (id: string, status: JobApplicationStatus) => void;
	saveFitBrief: (id: string, fitBrief: JobFitBrief) => void;
	ensureTailoredResume: (id: string) => boolean;
	saveResumeEditProposals: (
		id: string,
		proposals: ResumeEditProposal[],
	) => void;
	applyResumeEditProposal: (jobId: string, proposalId: string) => boolean;
	rejectResumeEditProposal: (jobId: string, proposalId: string) => void;
	saveCoverLetterDraft: (id: string, content: string) => void;
	validatePipeline: () => PipelineIssue[];
}

const createId = (prefix: string) =>
	globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;

const now = () => Date.now();

const cloneResume = (resume: Resume): Resume =>
	JSON.parse(JSON.stringify(resume)) as Resume;

const resumeFromEditorState = (resume: EditorState): Resume => ({
	personalInfo: resume.personalInfo,
	summary: resume.summary,
	sections: resume.sections,
	experience: resume.experience,
	education: resume.education,
	skills: resume.skills,
	projects: resume.projects,
	certifications: resume.certifications,
	languages: resume.languages,
});

const getInitialJobState = (): { jobs: JobApplication[] } => {
	if (typeof window === "undefined") return { jobs: [] };

	const saved = localStorage.getItem("job-applications");
	if (!saved) return { jobs: [] };

	try {
		const parsed = JSON.parse(saved) as { jobs?: unknown[] };
		const jobs = (parsed.jobs ?? [])
			.map((job) => jobApplicationSchema.safeParse(job))
			.filter((result) => result.success)
			.map((result) => result.data as JobApplication);
		return { jobs };
	} catch (error) {
		console.error("Failed to parse job applications", error);
		return { jobs: [] };
	}
};

const createBlankJob = (input: CreateJobApplicationInput = {}): JobApplication => {
	const timestamp = now();
	return {
		id: createId("job"),
		company: input.company ?? "",
		title: input.title ?? "",
		location: input.location ?? "",
		sourceUrl: input.sourceUrl ?? "",
		description: input.description ?? "",
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
		createdAt: timestamp,
		updatedAt: timestamp,
	};
};

const hasTarget = (resume: Resume | null, target: ResumeEditTarget) => {
	if (!resume) return false;
	if (target.section === "summary") return true;
	if (target.section === "experience") {
		const item = resume.experience.find((entry) => entry.id === target.itemId);
		if (!item) return false;
		if (target.field === "bullet") {
			return Array.isArray(item.bullets) && target.bulletIndex < item.bullets.length;
		}
		return target.field in item;
	}
	if (target.section === "skills") {
		return resume.skills.some((entry) => entry.id === target.itemId);
	}
	return resume.projects.some((entry) => entry.id === target.itemId);
};

const applyTarget = (resume: Resume, target: ResumeEditTarget, value: string) => {
	if (target.section === "summary") {
		resume.summary = value;
		return true;
	}

	if (target.section === "experience") {
		const item = resume.experience.find((entry) => entry.id === target.itemId);
		if (!item) return false;
		if (target.field === "bullet") {
			if (!item.bullets || target.bulletIndex >= item.bullets.length) return false;
			item.bullets[target.bulletIndex] = value;
			return true;
		}
		item[target.field] = value;
		return true;
	}

	if (target.section === "skills") {
		const item = resume.skills.find((entry) => entry.id === target.itemId);
		if (!item) return false;
		item.items = value;
		return true;
	}

	const item = resume.projects.find((entry) => entry.id === target.itemId);
	if (!item) return false;
	item.description = value;
	return true;
};

export const useJobApplicationStore = create<JobApplicationState>()(
	devtools(
		(set, get) => ({
			...getInitialJobState(),
			createJobApplication: (input) => {
				const job = createBlankJob(input);
				set((state) => ({ jobs: [job, ...state.jobs] }));
				return job.id;
			},
			updateJobApplication: (id, updates) =>
				set((state) => ({
					jobs: state.jobs.map((job) =>
						job.id === id ? { ...job, ...updates, updatedAt: now() } : job,
					),
				})),
			deleteJobApplication: (id) =>
				set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) })),
			setStatus: (id, status) =>
				set((state) => ({
					jobs: state.jobs.map((job) =>
						job.id === id ? { ...job, status, updatedAt: now() } : job,
					),
				})),
			saveFitBrief: (id, fitBrief) =>
				set((state) => ({
					jobs: state.jobs.map((job) =>
						job.id === id
							? { ...job, fitBrief, status: "analyzing", updatedAt: now() }
							: job,
					),
				})),
			ensureTailoredResume: (id) => {
				const job = get().jobs.find((item) => item.id === id);
				if (!job) return false;
				if (job.tailoredResume) return true;

				const { defaultResumeId, resumes } = useResumeIndexStore.getState();
				if (!defaultResumeId) return false;

				const sourceResume = getResumeData(defaultResumeId);
				if (!sourceResume) return false;

				const resume = resumeFromEditorState(sourceResume);
				const sourceEntry = resumes.find((entry) => entry.id === defaultResumeId);
				const snapshot = cloneResume(resume);
				set((state) => ({
					jobs: state.jobs.map((item) =>
						item.id === id
							? {
									...item,
									status: "tailoring",
									sourceResumeId: defaultResumeId,
									sourceResumeName: sourceEntry?.name ?? sourceResume.name,
									sourceResumeSnapshot: snapshot,
									tailoredResume: cloneResume(resume),
									updatedAt: now(),
								}
							: item,
					),
				}));
				return true;
			},
			saveResumeEditProposals: (id, proposals) =>
				set((state) => ({
					jobs: state.jobs.map((job) =>
						job.id === id
							? { ...job, resumeEditProposals: proposals, updatedAt: now() }
							: job,
					),
				})),
			applyResumeEditProposal: (jobId, proposalId) => {
				let applied = false;
				set((state) => ({
					jobs: state.jobs.map((job) => {
						if (job.id !== jobId || !job.tailoredResume) return job;
						const proposal = job.resumeEditProposals.find(
							(item) => item.id === proposalId,
						);
						if (!proposal || proposal.status !== "pending") return job;

						const tailoredResume = cloneResume(job.tailoredResume);
						applied = applyTarget(
							tailoredResume,
							proposal.target,
							proposal.suggestedText,
						);
						if (!applied) return job;

						return {
							...job,
							tailoredResume,
							resumeEditProposals: job.resumeEditProposals.map((item) =>
								item.id === proposalId
									? { ...item, status: "applied", appliedAt: now() }
									: item,
							),
							updatedAt: now(),
						};
					}),
				}));
				return applied;
			},
			rejectResumeEditProposal: (jobId, proposalId) =>
				set((state) => ({
					jobs: state.jobs.map((job) =>
						job.id === jobId
							? {
									...job,
									resumeEditProposals: job.resumeEditProposals.map((item) =>
										item.id === proposalId
											? { ...item, status: "rejected" }
											: item,
									),
									updatedAt: now(),
								}
							: job,
					),
				})),
			saveCoverLetterDraft: (id, content) =>
				set((state) => ({
					jobs: state.jobs.map((job) => {
						if (job.id !== id) return job;
						const timestamp = now();
						return {
							...job,
							coverLetterDraft: {
								content,
								generatedAt: job.coverLetterDraft?.generatedAt ?? timestamp,
								updatedAt: timestamp,
							},
							updatedAt: timestamp,
						};
					}),
				})),
			validatePipeline: () => {
				const { defaultResumeId } = useResumeIndexStore.getState();
				return get().jobs.flatMap((job) => {
					const issues: PipelineIssue[] = [];
					if (!job.company.trim() || !job.title.trim()) {
						issues.push({
							jobId: job.id,
							code: "missing_title_or_company",
							message: "Add both a company and title before using this job.",
						});
					}
					if (!job.description.trim()) {
						issues.push({
							jobId: job.id,
							code: "missing_description",
							message: "Paste the job description before analysis.",
						});
					}
					if (!job.tailoredResume && !defaultResumeId) {
						issues.push({
							jobId: job.id,
							code: "missing_default_resume",
							message: "Choose a default resume before tailoring.",
						});
					}
					if (
						job.resumeEditProposals.some(
							(proposal) => !hasTarget(job.tailoredResume, proposal.target),
						)
					) {
						issues.push({
							jobId: job.id,
							code: "stale_proposal_target",
							message: "One or more resume proposals no longer match the resume.",
						});
					}
					return issues;
				});
			},
		}),
		{ name: "job-application-store" },
	),
);

if (typeof window !== "undefined") {
	useJobApplicationStore.subscribe((state) => {
		localStorage.setItem(
			"job-applications",
			JSON.stringify({ jobs: state.jobs }),
		);
	});
}
