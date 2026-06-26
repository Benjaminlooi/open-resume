import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StateCreator } from "zustand";
import { blankResumeState, dummyResumeData } from "./dummy-resume";
import {
	clearDefaultResume,
	createResume,
	deleteResume,
	getResume,
	listResumes,
	type ResumeContent,
	setDefaultResume,
	updateResume,
	deleteJobPosting,
	type LocalJobPosting,
	listJobPostings,
	retryJobPostingAnalyze,
	retryJobPostingCrawl,
	convertJobToApplication as convertJobToApplicationApi,
} from "./local-companion-client";
import type {
	Certification,
	ContactLink,
	EditorState,
	Education,
	Experience,
	Language,
	PersonalInfo,
	Project,
	Resume,
	SkillGroup,
} from "./resume-schema";
import { resumeSchema } from "./resume-schema";
import {
	createJobApplication as createJobApplicationApi,
	deleteJobApplication as deleteJobApplicationApi,
	listJobApplications,
	updateJobApplication as updateJobApplicationApi,
} from "./local-companion-client";
import type {
	CoverLetterDraft,
	JobApplication,
	JobApplicationStatus,
	JobFitBrief,
	ResumeEditProposal,
} from "../features/job-postings/job-application-schema";
import {
	applyProposalToResume,
	getStaleProposalWarning,
} from "../features/job-postings/resume-edit-helper";

/**
 * Root store.
 *
 * All app state lives in ONE Zustand store so that Redux DevTools shows a
 * single instance with a unified action timeline. Each domain is authored as
 * a slice (a `StateCreator` operating on the root state) using the documented
 * Zustand slice pattern. Components select narrowly (e.g.
 * `useRootStore((s) => s.resume.experience)`) so updates to one slice never
 * re-render components that only read another.
 */

// ---------------------------------------------------------------------------
// Root state shape — the union of every slice's state + actions.
// ---------------------------------------------------------------------------

export interface ResumeSlice extends EditorState {
	loadResume: (id: string) => Promise<boolean>;
	initNewResume: (id: string, name: string, templateId: string) => void;
	replaceResumeContent: (content: Resume) => void;
	setActiveSection: (id: string) => void;
	setTemplateId: (id: string) => void;
	updateResumeName: (name: string) => void;
	updatePersonalInfo: (
		field: Exclude<keyof PersonalInfo, "contactLinks">,
		value: string,
	) => void;
	updateSummary: (value: string) => void;
	addContactLink: () => void;
	updateContactLink: (id: string, updatedItem: Partial<ContactLink>) => void;
	deleteContactLink: (id: string) => void;
	reorderSections: (startIndex: number, endIndex: number) => void;
	toggleSectionVisibility: (id: string) => void;
	addExperience: (item: Experience) => void;
	updateExperience: (id: string, updatedItem: Partial<Experience>) => void;
	deleteExperience: (id: string) => void;
	reorderExperience: (startIndex: number, endIndex: number) => void;
	addEducation: (item: Education) => void;
	updateEducation: (id: string, updatedItem: Partial<Education>) => void;
	deleteEducation: (id: string) => void;
	reorderEducation: (startIndex: number, endIndex: number) => void;
	addSkillGroup: (item: SkillGroup) => void;
	updateSkillGroup: (id: string, updatedItem: Partial<SkillGroup>) => void;
	deleteSkillGroup: (id: string) => void;
	reorderSkills: (startIndex: number, endIndex: number) => void;
	addSection: (id: string, name: string) => void;
	removeSection: (id: string) => void;
	addProject: (item: Project) => void;
	updateProject: (id: string, updatedItem: Partial<Project>) => void;
	deleteProject: (id: string) => void;
	reorderProjects: (startIndex: number, endIndex: number) => void;
	addCertification: (item: Certification) => void;
	updateCertification: (id: string, updatedItem: Partial<Certification>) => void;
	deleteCertification: (id: string) => void;
	reorderCertifications: (startIndex: number, endIndex: number) => void;
	addLanguage: (item: Language) => void;
	updateLanguage: (id: string, updatedItem: Partial<Language>) => void;
	deleteLanguage: (id: string) => void;
	reorderLanguages: (startIndex: number, endIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Resume index slice — migrated from resume-index-store.ts.
// ---------------------------------------------------------------------------

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

export interface ResumeIndexSlice {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
	loadIndex: () => Promise<void>;
	setDefaultResumeId: (id: string | null) => Promise<void>;
	createResumeIndexEntry: (
		id: string,
		name: string,
		templateId: string,
		content?: Resume,
	) => Promise<void>;
	updateResumeIndexModified: (id: string) => void;
	deleteResumeIndexEntry: (id: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Settings slice — migrated from settings-store.ts.
// ---------------------------------------------------------------------------

export type AIProvider =
	| "openai"
	| "anthropic"
	| "google"
	| "deepseek"
	| "groq"
	| "ollama"
	| "lmstudio";

export interface SettingsSlice {
	apiKeys: Partial<Record<AIProvider, string>>;
	defaultProvider: AIProvider;
	baseUrls: Partial<Record<AIProvider, string>>;
	selectedModels: Partial<Record<AIProvider, string>>;
	updateAPIKey: (provider: AIProvider, key: string) => void;
	setDefaultProvider: (provider: AIProvider) => void;
	updateBaseUrl: (provider: AIProvider, url: string) => void;
	updateSelectedModel: (provider: AIProvider, model: string) => void;
}

// ---------------------------------------------------------------------------
// Job application slice — migrated from job-application-store.ts.
// ---------------------------------------------------------------------------

export interface JobApplicationSlice {
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

export interface Message {
	role: "user" | "assistant" | "system" | "tool";
	content: string | any[];
	_toolCalls?: any[];
}

export interface AISlice {
	isOpen: boolean;
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: string | null;
	selectedProvider: AIProvider | null;
	abortController: AbortController | null;

	setIsOpen: (isOpen: boolean) => void;
	setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
	setInput: (input: string) => void;
	setIsLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	setSelectedProvider: (provider: AIProvider) => void;
	setAbortController: (controller: AbortController | null) => void;
	reset: () => void;
}

export interface RootState {
	resume: ResumeSlice;
	resumeIndex: ResumeIndexSlice;
	settings: SettingsSlice;
	jobApplication: JobApplicationSlice;
	jobPosting: JobPostingSlice;
	ai: AISlice;
}

// ---------------------------------------------------------------------------
// Resume slice — migrated verbatim from resume-store.ts.
// ---------------------------------------------------------------------------

export const AVAILABLE_SECTIONS = [
	{ id: "summary", name: "Summary" },
	{ id: "experience", name: "Experience" },
	{ id: "education", name: "Education" },
	{ id: "skills", name: "Skills" },
	{ id: "projects", name: "Projects" },
	{ id: "certifications", name: "Certifications" },
	{ id: "languages", name: "Languages" },
];

export const AVAILABLE_TEMPLATES = [
	{ id: "demo", name: "Classic" },
	{ id: "modern", name: "Modern" },
];

const initialResume: EditorState = {
	id: "default",
	name: "My Resume",
	activeSection: "personalInfo",
	templateId: "demo",
	...dummyResumeData,
};

const migrateBullets = (items: any[]) => {
	return (
		items?.map((item) => {
			if (item.bullets && Array.isArray(item.bullets)) {
				const html = `<ul>${item.bullets
					.map((b: string) => `<li>${b}</li>`)
					.join("")}</ul>`;
				const { bullets, ...rest } = item;
				return { ...rest, description: html };
			}
			return item;
		}) || []
	);
};

const createContactLinkId = () => {
	return globalThis.crypto?.randomUUID?.() ?? `contact-${Date.now()}`;
};

type LegacyPersonalInfo = Partial<
	Omit<PersonalInfo, "contactLinks"> & {
		contactLinks: unknown;
		website: unknown;
	}
>;

type LegacyEditorState = Partial<EditorState> & {
	personalInfo?: LegacyPersonalInfo;
};

const normalizePersonalInfo = (
	personalInfo: LegacyPersonalInfo = {},
): PersonalInfo => {
	const { website, contactLinks, ...rest } = personalInfo;
	const normalizedLinks = Array.isArray(contactLinks)
		? contactLinks
				.filter((link) => link && typeof link === "object")
				.map((link, index) => ({
					id: String(
						"id" in link
							? link.id || `contact-${index + 1}`
							: `contact-${index + 1}`,
					),
					label: String(
						"label" in link ? link.label || "Website" : "Website",
					),
					url: String("url" in link ? link.url || "" : ""),
				}))
		: [];

	if (website && !normalizedLinks.some((link) => link.url === website)) {
		normalizedLinks.push({
			id: "contact-website",
			label: "Website",
			url: String(website),
		});
	}

	return {
		fullName: String(rest.fullName ?? ""),
		email: String(rest.email ?? ""),
		phone: String(rest.phone ?? ""),
		location: String(rest.location ?? ""),
		contactLinks: normalizedLinks,
	};
};

const migrateResume = (resume: LegacyEditorState): EditorState => {
	return {
		...resume,
		personalInfo: normalizePersonalInfo(resume.personalInfo),
		summary: String(resume.summary ?? ""),
	} as EditorState;
};

const normalizeEditorState = (
	id: string,
	name: string,
	templateId: string,
	content: Record<string, unknown>,
): EditorState => {
	const parsed = {
		...blankResumeState,
		...content,
		id,
		name,
		templateId,
		activeSection: "personalInfo",
	} as LegacyEditorState;

	if (parsed.experience) parsed.experience = migrateBullets(parsed.experience);
	if (parsed.education) parsed.education = migrateBullets(parsed.education);
	if (parsed.projects) parsed.projects = migrateBullets(parsed.projects);

	return migrateResume(parsed);
};

const toResumeContent = (state: EditorState): ResumeContent =>
	resumeSchema.parse(state) as unknown as ResumeContent;

// Module-private auto-save state. These live here (not in the store) because
// they are coordination flags, not app state.
let isLoadingResume = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const createResumeSlice: StateCreator<RootState, [], [], ResumeSlice> = (
	set,
) => ({
	...initialResume,

	loadResume: async (id: string) => {
		try {
			const resume = await getResume(id);
			isLoadingResume = true;
			set((state) => ({
				resume: {
					...state.resume,
					...normalizeEditorState(
						resume.id,
						resume.name,
						resume.templateId,
						resume.content,
					),
				},
			}));
			isLoadingResume = false;
			return true;
		} catch (e) {
			console.error("Failed to load resume", e);
			isLoadingResume = false;
			return false;
		}
	},

	initNewResume: (id, name, templateId) =>
		set((state) => ({
			resume: {
				...state.resume,
				...blankResumeState,
				id,
				name,
				templateId,
			},
		})),

	replaceResumeContent: (content) =>
		set((state) => ({
			resume: {
				...state.resume,
				...content,
				id: state.resume.id,
				name: state.resume.name,
				templateId: state.resume.templateId,
				personalInfo: normalizePersonalInfo(content.personalInfo),
				activeSection: "personalInfo",
			},
		})),

	setActiveSection: (id) =>
		set((state) => ({ resume: { ...state.resume, activeSection: id } })),

	setTemplateId: (id) =>
		set((state) => ({ resume: { ...state.resume, templateId: id } })),

	updateResumeName: (name) =>
		set((state) => ({ resume: { ...state.resume, name } })),

	updatePersonalInfo: (field, value) =>
		set((state) => ({
			resume: {
				...state.resume,
				personalInfo: {
					...state.resume.personalInfo,
					[field]: value,
				},
			},
		})),

	updateSummary: (value) =>
		set((state) => ({ resume: { ...state.resume, summary: value } })),

	addContactLink: () =>
		set((state) => ({
			resume: {
				...state.resume,
				personalInfo: {
					...state.resume.personalInfo,
					contactLinks: [
						...state.resume.personalInfo.contactLinks,
						{ id: createContactLinkId(), label: "Website", url: "" },
					],
				},
			},
		})),

	updateContactLink: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				personalInfo: {
					...state.resume.personalInfo,
					contactLinks: state.resume.personalInfo.contactLinks.map(
						(link) =>
							link.id === id ? { ...link, ...updatedItem } : link,
					),
				},
			},
		})),

	deleteContactLink: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				personalInfo: {
					...state.resume.personalInfo,
					contactLinks: state.resume.personalInfo.contactLinks.filter(
						(link) => link.id !== id,
					),
				},
			},
		})),

	reorderSections: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.sections);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, sections: result } };
		}),

	toggleSectionVisibility: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				sections: state.resume.sections.map((section) =>
					section.id === id
						? { ...section, visible: !section.visible }
						: section,
				),
			},
		})),

	// --- Experience ---
	addExperience: (item) =>
		set((state) => ({
			resume: { ...state.resume, experience: [...state.resume.experience, item] },
		})),

	updateExperience: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				experience: state.resume.experience.map((item) =>
					item.id === id ? { ...item, ...updatedItem } : item,
				),
			},
		})),

	deleteExperience: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				experience: state.resume.experience.filter((item) => item.id !== id),
			},
		})),

	reorderExperience: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.experience);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, experience: result } };
		}),

	// --- Education ---
	addEducation: (item) =>
		set((state) => ({
			resume: { ...state.resume, education: [...state.resume.education, item] },
		})),

	updateEducation: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				education: state.resume.education.map((item) =>
					item.id === id ? { ...item, ...updatedItem } : item,
				),
			},
		})),

	deleteEducation: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				education: state.resume.education.filter((item) => item.id !== id),
			},
		})),

	reorderEducation: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.education);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, education: result } };
		}),

	// --- Skills ---
	addSkillGroup: (item) =>
		set((state) => ({
			resume: { ...state.resume, skills: [...state.resume.skills, item] },
		})),

	updateSkillGroup: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				skills: state.resume.skills.map((item) =>
					item.id === id ? { ...item, ...updatedItem } : item,
				),
			},
		})),

	deleteSkillGroup: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				skills: state.resume.skills.filter((item) => item.id !== id),
			},
		})),

	reorderSkills: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.skills);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, skills: result } };
		}),

	// --- Section Management ---
	addSection: (id, name) =>
		set((state) => {
			if (state.resume.sections.find((s) => s.id === id)) return state;
			return {
				resume: {
					...state.resume,
					sections: [...state.resume.sections, { id, name, visible: true }],
					activeSection: id,
				},
			};
		}),

	removeSection: (id) =>
		set((state) => {
			const newSections = state.resume.sections.filter((s) => s.id !== id);
			return {
				resume: {
					...state.resume,
					sections: newSections,
					activeSection:
						state.resume.activeSection === id
							? "personalInfo"
							: state.resume.activeSection,
				},
			};
		}),

	// --- Projects ---
	addProject: (item) =>
		set((state) => ({
			resume: {
				...state.resume,
				projects: [...(state.resume.projects || []), item],
			},
		})),

	updateProject: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				projects: (state.resume.projects || []).map((item) =>
					item.id === id ? { ...item, ...updatedItem } : item,
				),
			},
		})),

	deleteProject: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				projects: (state.resume.projects || []).filter(
					(item) => item.id !== id,
				),
			},
		})),

	reorderProjects: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.projects || []);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, projects: result } };
		}),

	// --- Certifications ---
	addCertification: (item) =>
		set((state) => ({
			resume: {
				...state.resume,
				certifications: [...(state.resume.certifications || []), item],
			},
		})),

	updateCertification: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				certifications: (state.resume.certifications || []).map((item) =>
					item.id === id ? { ...item, ...updatedItem } : item,
				),
			},
		})),

	deleteCertification: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				certifications: (state.resume.certifications || []).filter(
					(item) => item.id !== id,
				),
			},
		})),

	reorderCertifications: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.certifications || []);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, certifications: result } };
		}),

	// --- Languages ---
	addLanguage: (item) =>
		set((state) => ({
			resume: {
				...state.resume,
				languages: [...(state.resume.languages || []), item],
			},
		})),

	updateLanguage: (id, updatedItem) =>
		set((state) => ({
			resume: {
				...state.resume,
				languages: (state.resume.languages || []).map((item) =>
					item.id === id ? { ...item, ...updatedItem } : item,
				),
			},
		})),

	deleteLanguage: (id) =>
		set((state) => ({
			resume: {
				...state.resume,
				languages: (state.resume.languages || []).filter(
					(item) => item.id !== id,
				),
			},
		})),

	reorderLanguages: (startIndex, endIndex) =>
		set((state) => {
			const result = Array.from(state.resume.languages || []);
			const [removed] = result.splice(startIndex, 1);
			result.splice(endIndex, 0, removed);
			return { resume: { ...state.resume, languages: result } };
		}),
});

// ---------------------------------------------------------------------------
// Resume index slice factory.
// ---------------------------------------------------------------------------

const resumeToContent = (content: Resume): ResumeContent =>
	resumeSchema.parse(content) as unknown as ResumeContent;

const createResumeIndexSlice: StateCreator<
	RootState,
	[],
	[],
	ResumeIndexSlice
> = (set) => ({
	resumes: [],
	defaultResumeId: null,

	loadIndex: async () => {
		const resumes = await listResumes();
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: resumes.map(({ isDefault: _isDefault, ...resume }) => resume),
				defaultResumeId:
					resumes.find((resume) => resume.isDefault)?.id ?? null,
			},
		}));
	},

	setDefaultResumeId: async (id) => {
		if (id) {
			await setDefaultResume(id);
		} else {
			await clearDefaultResume();
		}
		set((state) => ({
			resumeIndex: { ...state.resumeIndex, defaultResumeId: id },
		}));
	},

	createResumeIndexEntry: async (id, name, templateId, content) => {
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: state.resumeIndex.resumes.some((resume) => resume.id === id)
					? state.resumeIndex.resumes
					: [
							...state.resumeIndex.resumes,
							{ id, name, templateId, lastModified: Date.now() },
						],
			},
		}));
		try {
			const created = await createResume(
				id,
				name,
				templateId,
				resumeToContent(content ?? blankResumeState),
			);
			set((state) => ({
				resumeIndex: {
					...state.resumeIndex,
					resumes: state.resumeIndex.resumes.map((resume) =>
						resume.id === id
							? {
									id: created.id,
									name: created.name,
									templateId: created.templateId,
									lastModified: created.lastModified,
								}
							: resume,
					),
				},
			}));
		} catch (error) {
			set((state) => ({
				resumeIndex: {
					...state.resumeIndex,
					resumes: state.resumeIndex.resumes.filter(
						(resume) => resume.id !== id,
					),
				},
			}));
			throw error;
		}
	},

	updateResumeIndexModified: (id) =>
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: state.resumeIndex.resumes.map((r) =>
					r.id === id ? { ...r, lastModified: Date.now() } : r,
				),
			},
		})),

	deleteResumeIndexEntry: async (id) => {
		await deleteResume(id);
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: state.resumeIndex.resumes.filter((r) => r.id !== id),
				defaultResumeId:
					state.resumeIndex.defaultResumeId === id
						? null
						: state.resumeIndex.defaultResumeId,
			},
		}));
	},
});

// ---------------------------------------------------------------------------
// Helper: fetch a resume's EditorState, returning the in-memory slice if it is
// already the active document. Migrated from resume-store.getResumeData.
// ---------------------------------------------------------------------------

export const getResumeData = async (
	id: string,
): Promise<EditorState | null> => {
	const state = useRootStore.getState();
	if (state.resume.id === id) {
		return state.resume;
	}
	try {
		const resume = await getResume(id);
		return normalizeEditorState(
			resume.id,
			resume.name,
			resume.templateId,
			resume.content,
		);
	} catch (e) {
		console.error("Failed to fetch resume data", e);
		return null;
	}
};

// ---------------------------------------------------------------------------
// Settings slice factory + persistence.
// ---------------------------------------------------------------------------

const SETTINGS_STORAGE_KEY = "resume-builder-settings";

const getInitialSettings = (): Pick<
	SettingsSlice,
	"apiKeys" | "defaultProvider" | "baseUrls" | "selectedModels"
> => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return {
					apiKeys: parsed.apiKeys || {},
					defaultProvider: parsed.defaultProvider || "openai",
					baseUrls: parsed.baseUrls || {},
					selectedModels: parsed.selectedModels || {},
				};
			} catch (e) {
				console.error("Failed to parse settings", e);
			}
		}
	}
	return {
		apiKeys: {},
		defaultProvider: "openai",
		baseUrls: {},
		selectedModels: {},
	};
};

const createSettingsSlice: StateCreator<RootState, [], [], SettingsSlice> = (
	set,
) => ({
	...getInitialSettings(),

	updateAPIKey: (provider, key) =>
		set((state) => ({
			settings: {
				...state.settings,
				apiKeys: { ...state.settings.apiKeys, [provider]: key },
			},
		})),

	setDefaultProvider: (provider) =>
		set((state) => ({
			settings: { ...state.settings, defaultProvider: provider },
		})),

	updateBaseUrl: (provider, url) =>
		set((state) => ({
			settings: {
				...state.settings,
				baseUrls: { ...state.settings.baseUrls, [provider]: url },
			},
		})),

	updateSelectedModel: (provider, model) =>
		set((state) => ({
			settings: {
				...state.settings,
				selectedModels: { ...state.settings.selectedModels, [provider]: model },
			},
		})),
});

// ---------------------------------------------------------------------------
// Job application slice factory.
// ---------------------------------------------------------------------------

const createJobApplicationSlice: StateCreator<
	RootState,
	[],
	[],
	JobApplicationSlice
> = (set, get) => ({
	jobApplications: [],

	loadJobApplications: async () => {
		try {
			const apps = await listJobApplications();
			set((state) => ({
				jobApplication: {
					...state.jobApplication,
					jobApplications: apps as unknown as JobApplication[],
				},
			}));
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

		const previousApps = get().jobApplication.jobApplications;
		set((state) => ({
			jobApplication: {
				...state.jobApplication,
				jobApplications: [...state.jobApplication.jobApplications, newApp],
			},
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
				jobApplication: {
					...state.jobApplication,
					jobApplications: state.jobApplication.jobApplications.map(
						(app) =>
							app.id === id ? (created as unknown as JobApplication) : app,
					),
				},
			}));
			return id;
		} catch (err) {
			set((state) => ({
				jobApplication: {
					...state.jobApplication,
					jobApplications: previousApps,
				},
			}));
			throw err;
		}
	},

	updateJobApplication: async (id, updates) => {
		const previousApps = get().jobApplication.jobApplications;
		set((state) => ({
			jobApplication: {
				...state.jobApplication,
				jobApplications: state.jobApplication.jobApplications.map((app) =>
					app.id === id
						? { ...app, ...updates, updatedAt: Date.now() }
						: app,
				),
			},
		}));

		try {
			const updated = await updateJobApplicationApi(id, updates);
			set((state) => ({
				jobApplication: {
					...state.jobApplication,
					jobApplications: state.jobApplication.jobApplications.map(
						(app) =>
							app.id === id ? (updated as unknown as JobApplication) : app,
					),
				},
			}));
		} catch (err) {
			set((state) => ({
				jobApplication: {
					...state.jobApplication,
					jobApplications: previousApps,
				},
			}));
			throw err;
		}
	},

	deleteJobApplication: async (id) => {
		const previousApps = get().jobApplication.jobApplications;
		set((state) => ({
			jobApplication: {
				...state.jobApplication,
				jobApplications: state.jobApplication.jobApplications.filter(
					(app) => app.id !== id,
				),
			},
		}));

		try {
			await deleteJobApplicationApi(id);
		} catch (err) {
			set((state) => ({
				jobApplication: {
					...state.jobApplication,
					jobApplications: previousApps,
				},
			}));
			throw err;
		}
	},

	setStatus: async (id, status) => {
		await get().jobApplication.updateJobApplication(id, { status });
	},

	saveFitBrief: async (id, fitBrief) => {
		await get().jobApplication.updateJobApplication(id, { fitBrief });
	},

	ensureTailoredResume: async (id) => {
		const jobApp = get().jobApplication;
		const app = jobApp.jobApplications.find((a) => a.id === id);
		if (!app || app.tailoredResume) return;

		const defaultResumeId = get().resumeIndex.defaultResumeId;
		if (!defaultResumeId) return;

		const defaultResume = await getResumeData(defaultResumeId);
		if (!defaultResume) return;

		const indexState = get().resumeIndex;
		const resumeIndexEntry = indexState.resumes.find(
			(r) => r.id === defaultResumeId,
		);
		const sourceResumeName = resumeIndexEntry
			? resumeIndexEntry.name
			: defaultResume.name || "Default Resume";

		const sourceResumeSnapshot = resumeSchema.parse(defaultResume);
		const tailoredResume = JSON.parse(JSON.stringify(sourceResumeSnapshot));

		await get().jobApplication.updateJobApplication(id, {
			sourceResumeId: defaultResumeId,
			sourceResumeName,
			sourceResumeSnapshot,
			tailoredResume,
			status: "tailoring",
		});
	},

	saveResumeEditProposals: async (id, proposals) => {
		await get().jobApplication.updateJobApplication(id, {
			resumeEditProposals: proposals,
		});
	},

	applyResumeEditProposal: async (id, proposalId) => {
		const app = get().jobApplication.jobApplications.find((a) => a.id === id);
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

		const proposal = app.resumeEditProposals.find((p) => p.id === proposalId);
		if (!proposal) return;

		const tailoredResume = applyProposalToResume(
			app.tailoredResume,
			proposal.target,
			proposal.suggestedText,
		);

		await get().jobApplication.updateJobApplication(id, {
			tailoredResume,
			resumeEditProposals: proposals,
		});
	},

	rejectResumeEditProposal: async (id, proposalId) => {
		const app = get().jobApplication.jobApplications.find((a) => a.id === id);
		if (!app) return;

		const proposals = app.resumeEditProposals.map((prop) =>
			prop.id === proposalId ? { ...prop, status: "rejected" as const } : prop,
		);

		await get().jobApplication.updateJobApplication(id, {
			resumeEditProposals: proposals,
		});
	},

	saveCoverLetterDraft: async (id, coverLetterDraft) => {
		await get().jobApplication.updateJobApplication(id, { coverLetterDraft });
	},

	validatePipeline: () => {
		const { jobApplications } = get().jobApplication;
		// A default resume acts as the implicit source resume until the user
		// explicitly snapshots one via "Start Tailoring". Only flag a missing
		// source resume when there is truly no resume to fall back on.
		const hasDefaultResume = get().resumeIndex.defaultResumeId !== null;
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
			if (app.sourceResumeId === null && !hasDefaultResume) {
				appWarnings.push("No source resume has been associated yet.");
			}

			if (app.tailoredResume) {
				for (const prop of app.resumeEditProposals) {
					const warning = getStaleProposalWarning(app.tailoredResume, prop.target);
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
		const app = get().jobApplication.jobApplications.find((a) => a.id === appId);
		if (!app) return;

		const proposals = app.resumeEditProposals.filter(
			(p) => p.id !== proposalId,
		);

		await get().jobApplication.updateJobApplication(appId, {
			resumeEditProposals: proposals,
		});
	},

	associateSourceResume: async (appId, resumeId) => {
		const app = get().jobApplication.jobApplications.find((a) => a.id === appId);
		if (!app) return;

		const resume = await getResumeData(resumeId);
		if (!resume) return;

		const indexState = get().resumeIndex;
		const resumeIndexEntry = indexState.resumes.find((r) => r.id === resumeId);
		const sourceResumeName = resumeIndexEntry
			? resumeIndexEntry.name
			: resume.name || "Selected Resume";

		const sourceResumeSnapshot = resumeSchema.parse(resume);
		const tailoredResume = JSON.parse(JSON.stringify(sourceResumeSnapshot));

		await get().jobApplication.updateJobApplication(appId, {
			sourceResumeId: resumeId,
			sourceResumeName,
			sourceResumeSnapshot,
			tailoredResume,
			status: "tailoring",
		});
	},

	archiveIncompleteJob: async (appId) => {
		await get().jobApplication.updateJobApplication(appId, { status: "archived" });
	},
});

// ---------------------------------------------------------------------------
// Job posting slice factory.
// ---------------------------------------------------------------------------

const createJobPostingSlice: StateCreator<
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

// ---------------------------------------------------------------------------
// AI slice factory.
// ---------------------------------------------------------------------------

const createAISlice: StateCreator<RootState, [], [], AISlice> = (set) => ({
	isOpen: false,
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	selectedProvider: null,
	abortController: null,

	setIsOpen: (isOpen) =>
		set((state) => ({ ai: { ...state.ai, isOpen } })),
	setMessages: (messagesOrFn) =>
		set((state) => ({
			ai: {
				...state.ai,
				messages:
					typeof messagesOrFn === "function"
						? messagesOrFn(state.ai.messages)
						: messagesOrFn,
			},
		})),
	setInput: (input) =>
		set((state) => ({ ai: { ...state.ai, input } })),
	setIsLoading: (isLoading) =>
		set((state) => ({ ai: { ...state.ai, isLoading } })),
	setError: (error) =>
		set((state) => ({ ai: { ...state.ai, error } })),
	setSelectedProvider: (selectedProvider) =>
		set((state) => ({ ai: { ...state.ai, selectedProvider } })),
	setAbortController: (abortController) =>
		set((state) => ({ ai: { ...state.ai, abortController } })),
	reset: () =>
		set((state) => ({
			ai: {
				...state.ai,
				messages: [],
				input: "",
				isLoading: false,
				error: null,
				abortController: null,
			},
		})),
});

// ---------------------------------------------------------------------------
// Root store. A single devtools instance spans every slice.
// ---------------------------------------------------------------------------

export const useRootStore = create<RootState>()(
	devtools(
		(...a) => ({
			resume: createResumeSlice(...a),
			resumeIndex: createResumeIndexSlice(...a),
			settings: createSettingsSlice(...a),
			jobApplication: createJobApplicationSlice(...a),
			jobPosting: createJobPostingSlice(...a),
			ai: createAISlice(...a),
		}),
		{ name: "resume-builder" },
	),
);

// Debounced auto-save of the active resume to the companion. Registered
// unconditionally (matching the original resume-store behaviour): during SSR
// nothing mutates the resume slice, so the subscriber is inert until the user
// edits in the browser.
useRootStore.subscribe((state) => {
	const resume = state.resume;
	if (!resume.id || isLoadingResume) return;

	if (saveTimer) {
		clearTimeout(saveTimer);
	}

	saveTimer = setTimeout(() => {
		updateResume(resume.id, {
			name: resume.name,
			templateId: resume.templateId,
			content: toResumeContent(resume),
		}).catch((error) => {
			console.error("Failed to save resume", error);
		});
	}, 500);
});

// Persist settings to localStorage whenever the settings slice changes.
// Window-guarded (SSR on Cloudflare Workers has no localStorage).
if (typeof window !== "undefined") {
	useRootStore.subscribe((state) => {
		const {
			updateAPIKey: _u1,
			setDefaultProvider: _u2,
			updateBaseUrl: _u3,
			updateSelectedModel: _u4,
			...data
		} = state.settings;
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
	});
}
