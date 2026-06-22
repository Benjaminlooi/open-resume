import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { blankResumeState, dummyResumeData } from "./dummy-resume";
import {
	getResume,
	type ResumeContent,
	updateResume,
} from "./local-companion-client";
import type {
	Certification,
	ContactLink,
	Education,
	Experience,
	Language,
	PersonalInfo,
	Project,
	Resume,
	SkillGroup,
} from "./resume-schema";
import { resumeSchema } from "./resume-schema";

// We extend the Resume type locally for UI state
export type EditorState = Resume & {
	id: string;
	name: string;
	activeSection: string;
	templateId: string;
};

export interface ResumeActions {
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
	updateCertification: (
		id: string,
		updatedItem: Partial<Certification>,
	) => void;
	deleteCertification: (id: string) => void;
	reorderCertifications: (startIndex: number, endIndex: number) => void;
	addLanguage: (item: Language) => void;
	updateLanguage: (id: string, updatedItem: Partial<Language>) => void;
	deleteLanguage: (id: string) => void;
	reorderLanguages: (startIndex: number, endIndex: number) => void;
}

export type ResumeStore = EditorState & ResumeActions;

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

const getInitialState = (): EditorState => {
	return initialResume;
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
					label: String("label" in link ? link.label || "Website" : "Website"),
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

export const getResumeData = async (
	id: string,
): Promise<EditorState | null> => {
	const state = useResumeStore.getState();
	if (state.id === id) {
		return state;
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

let isLoadingResume = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useResumeStore = create<ResumeStore>()(
	devtools(
		(set, _get) => ({
			...getInitialState(),

			loadResume: async (id: string) => {
				try {
					const resume = await getResume(id);
					isLoadingResume = true;
					set(() =>
						normalizeEditorState(
							resume.id,
							resume.name,
							resume.templateId,
							resume.content,
						),
					);
					isLoadingResume = false;
					return true;
				} catch (e) {
					console.error("Failed to load resume", e);
					isLoadingResume = false;
					return false;
				}
			},

			initNewResume: (id, name, templateId) => {
				set(() => ({
					...blankResumeState,
					id,
					name,
					templateId,
				}));
			},

			replaceResumeContent: (content) =>
				set((state) => ({
					...content,
					id: state.id,
					name: state.name,
					templateId: state.templateId,
					personalInfo: normalizePersonalInfo(content.personalInfo),
					activeSection: "personalInfo",
				})),

			setActiveSection: (id) =>
				set((_state) => ({
					activeSection: id,
				})),

			setTemplateId: (id) =>
				set((_state) => ({
					templateId: id,
				})),

			updateResumeName: (name) =>
				set(() => ({
					name,
				})),

			updatePersonalInfo: (field, value) =>
				set((state) => ({
					personalInfo: {
						...state.personalInfo,
						[field]: value,
					},
				})),

			updateSummary: (value) =>
				set((_state) => ({
					summary: value,
				})),

			addContactLink: () =>
				set((state) => ({
					personalInfo: {
						...state.personalInfo,
						contactLinks: [
							...state.personalInfo.contactLinks,
							{ id: createContactLinkId(), label: "Website", url: "" },
						],
					},
				})),

			updateContactLink: (id, updatedItem) =>
				set((state) => ({
					personalInfo: {
						...state.personalInfo,
						contactLinks: state.personalInfo.contactLinks.map((link) =>
							link.id === id ? { ...link, ...updatedItem } : link,
						),
					},
				})),

			deleteContactLink: (id) =>
				set((state) => ({
					personalInfo: {
						...state.personalInfo,
						contactLinks: state.personalInfo.contactLinks.filter(
							(link) => link.id !== id,
						),
					},
				})),

			reorderSections: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.sections);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { sections: result };
				}),

			toggleSectionVisibility: (id) =>
				set((state) => ({
					sections: state.sections.map((section) =>
						section.id === id
							? { ...section, visible: !section.visible }
							: section,
					),
				})),

			// --- Experience ---
			addExperience: (item) =>
				set((state) => ({
					experience: [...state.experience, item],
				})),

			updateExperience: (id, updatedItem) =>
				set((state) => ({
					experience: state.experience.map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item,
					),
				})),

			deleteExperience: (id) =>
				set((state) => ({
					experience: state.experience.filter((item) => item.id !== id),
				})),

			reorderExperience: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.experience);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { experience: result };
				}),

			// --- Education ---
			addEducation: (item) =>
				set((state) => ({
					education: [...state.education, item],
				})),

			updateEducation: (id, updatedItem) =>
				set((state) => ({
					education: state.education.map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item,
					),
				})),

			deleteEducation: (id) =>
				set((state) => ({
					education: state.education.filter((item) => item.id !== id),
				})),

			reorderEducation: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.education);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { education: result };
				}),

			// --- Skills ---
			addSkillGroup: (item) =>
				set((state) => ({
					skills: [...state.skills, item],
				})),

			updateSkillGroup: (id, updatedItem) =>
				set((state) => ({
					skills: state.skills.map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item,
					),
				})),

			deleteSkillGroup: (id) =>
				set((state) => ({
					skills: state.skills.filter((item) => item.id !== id),
				})),

			reorderSkills: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.skills);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { skills: result };
				}),

			// --- Section Management ---
			addSection: (id, name) =>
				set((state) => {
					if (state.sections.find((s) => s.id === id)) return state;
					return {
						sections: [...state.sections, { id, name, visible: true }],
						activeSection: id,
					};
				}),

			removeSection: (id) =>
				set((state) => {
					const newSections = state.sections.filter((s) => s.id !== id);
					return {
						sections: newSections,
						activeSection:
							state.activeSection === id ? "personalInfo" : state.activeSection,
					};
				}),

			// --- Projects ---
			addProject: (item) =>
				set((state) => ({
					projects: [...(state.projects || []), item],
				})),

			updateProject: (id, updatedItem) =>
				set((state) => ({
					projects: (state.projects || []).map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item,
					),
				})),

			deleteProject: (id) =>
				set((state) => ({
					projects: (state.projects || []).filter((item) => item.id !== id),
				})),

			reorderProjects: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.projects || []);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { projects: result };
				}),

			// --- Certifications ---
			addCertification: (item) =>
				set((state) => ({
					certifications: [...(state.certifications || []), item],
				})),

			updateCertification: (id, updatedItem) =>
				set((state) => ({
					certifications: (state.certifications || []).map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item,
					),
				})),

			deleteCertification: (id) =>
				set((state) => ({
					certifications: (state.certifications || []).filter(
						(item) => item.id !== id,
					),
				})),

			reorderCertifications: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.certifications || []);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { certifications: result };
				}),

			// --- Languages ---
			addLanguage: (item) =>
				set((state) => ({
					languages: [...(state.languages || []), item],
				})),

			updateLanguage: (id, updatedItem) =>
				set((state) => ({
					languages: (state.languages || []).map((item) =>
						item.id === id ? { ...item, ...updatedItem } : item,
					),
				})),

			deleteLanguage: (id) =>
				set((state) => ({
					languages: (state.languages || []).filter((item) => item.id !== id),
				})),

			reorderLanguages: (startIndex, endIndex) =>
				set((state) => {
					const result = Array.from(state.languages || []);
					const [removed] = result.splice(startIndex, 1);
					result.splice(endIndex, 0, removed);
					return { languages: result };
				}),
		}),
		{ name: "resume-store" },
	),
);

useResumeStore.subscribe((state) => {
	if (!state.id || isLoadingResume) return;

	if (saveTimer) {
		clearTimeout(saveTimer);
	}

	saveTimer = setTimeout(() => {
		updateResume(state.id, {
			name: state.name,
			templateId: state.templateId,
			content: toResumeContent(state),
		}).catch((error) => {
			console.error("Failed to save resume", error);
		});
	}, 500);
});
