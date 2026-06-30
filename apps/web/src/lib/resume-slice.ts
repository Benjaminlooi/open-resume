import type { StateCreator } from "zustand";
import type { RootState } from "./root-store";
import { blankResumeState, dummyResumeData } from "./dummy-resume";
import { getResume, type ResumeContent } from "./local-backend-client";
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

export const initialResume: EditorState = {
	id: "default",
	name: "My Resume",
	activeSection: "personalInfo",
	templateId: "demo",
	...dummyResumeData,
};

export const migrateBullets = (items: any[]) => {
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

export const createContactLinkId = () => {
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

export const normalizePersonalInfo = (
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

export const migrateResume = (resume: LegacyEditorState): EditorState => {
	return {
		...resume,
		personalInfo: normalizePersonalInfo(resume.personalInfo),
		summary: String(resume.summary ?? ""),
	} as EditorState;
};

export const normalizeEditorState = (
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

export const toResumeContent = (content: Resume): ResumeContent =>
	resumeSchema.parse(content) as unknown as ResumeContent;

// Module-private auto-save state. These live here (not in the store) because
// they are coordination flags, not app state.
export let isLoadingResume = false;
export const getIsLoadingResume = () => isLoadingResume;
export const setIsLoadingResume = (val: boolean) => {
	isLoadingResume = val;
};

export let saveTimer: ReturnType<typeof setTimeout> | null = null;
export const getSaveTimer = () => saveTimer;
export const setSaveTimer = (timer: ReturnType<typeof setTimeout> | null) => {
	saveTimer = timer;
};

export const createResumeSlice: StateCreator<RootState, [], [], ResumeSlice> = (
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
