import { Store } from "@tanstack/store";
import type {
	Certification,
	Education,
	Experience,
	Language,
	PersonalInfo,
	Project,
	Resume,
	SkillGroup,
} from "./resume-schema";
import { dummyResumeData } from "./dummy-resume";

// We extend the Resume type locally for UI state
export type EditorState = Resume & {
	id: string;
	name: string;
	activeSection: string;
	templateId: string;
};

export const AVAILABLE_SECTIONS = [
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
	...dummyResumeData
};

const getInitialState = (): EditorState => {
	return initialResume;
};

export const resumeStore = new Store<EditorState>(getInitialState());

if (typeof window !== "undefined") {
	resumeStore.subscribe(() => {
		const state = resumeStore.state;
		if (state.id) {
			localStorage.setItem(
				`resume-${state.id}`,
				JSON.stringify(state),
			);
		}
	});
}

export const loadResume = (id: string) => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(`resume-${id}`);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as any;

				// Legacy migration: convert bullets string[] to description HTML
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

				if (parsed.experience)
					parsed.experience = migrateBullets(parsed.experience);
				if (parsed.education)
					parsed.education = migrateBullets(parsed.education);
				if (parsed.projects) parsed.projects = migrateBullets(parsed.projects);

				resumeStore.setState(() => parsed as EditorState);
				return true;
			} catch (e) {
				console.error("Failed to parse saved resume state", e);
			}
		}
	}
	return false;
};

export const getResumeData = (id: string): EditorState | null => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(`resume-${id}`);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as any;

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

				if (parsed.experience) parsed.experience = migrateBullets(parsed.experience);
				if (parsed.education) parsed.education = migrateBullets(parsed.education);
				if (parsed.projects) parsed.projects = migrateBullets(parsed.projects);

				return parsed as EditorState;
			} catch (e) {
				console.error("Failed to parse saved resume state", e);
			}
		}
	}
	return null;
};

export const setActiveSection = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		activeSection: id,
	}));
};

export const setTemplateId = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		templateId: id,
	}));
};

export const updatePersonalInfo = (
	field: keyof PersonalInfo,
	value: string,
) => {
	resumeStore.setState((state) => ({
		...state,
		personalInfo: {
			...state.personalInfo,
			[field]: value,
		},
	}));
};

export const reorderSections = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.sections);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, sections: result };
	});
};

export const toggleSectionVisibility = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		sections: state.sections.map((section) =>
			section.id === id ? { ...section, visible: !section.visible } : section,
		),
	}));
};

// --- Experience ---
export const addExperience = (item: Experience) => {
	resumeStore.setState((state) => ({
		...state,
		experience: [...state.experience, item],
	}));
};

export const updateExperience = (
	id: string,
	updatedItem: Partial<Experience>,
) => {
	resumeStore.setState((state) => ({
		...state,
		experience: state.experience.map((item) =>
			item.id === id ? { ...item, ...updatedItem } : item,
		),
	}));
};

export const deleteExperience = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		experience: state.experience.filter((item) => item.id !== id),
	}));
};

export const reorderExperience = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.experience);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, experience: result };
	});
};

// --- Education ---
export const addEducation = (item: Education) => {
	resumeStore.setState((state) => ({
		...state,
		education: [...state.education, item],
	}));
};

export const updateEducation = (
	id: string,
	updatedItem: Partial<Education>,
) => {
	resumeStore.setState((state) => ({
		...state,
		education: state.education.map((item) =>
			item.id === id ? { ...item, ...updatedItem } : item,
		),
	}));
};

export const deleteEducation = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		education: state.education.filter((item) => item.id !== id),
	}));
};

export const reorderEducation = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.education);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, education: result };
	});
};

// --- Skills ---
export const addSkillGroup = (item: SkillGroup) => {
	resumeStore.setState((state) => ({
		...state,
		skills: [...state.skills, item],
	}));
};

export const updateSkillGroup = (
	id: string,
	updatedItem: Partial<SkillGroup>,
) => {
	resumeStore.setState((state) => ({
		...state,
		skills: state.skills.map((item) =>
			item.id === id ? { ...item, ...updatedItem } : item,
		),
	}));
};

export const deleteSkillGroup = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		skills: state.skills.filter((item) => item.id !== id),
	}));
};

export const reorderSkills = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.skills);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, skills: result };
	});
};

// --- Section Management ---
export const addSection = (id: string, name: string) => {
	resumeStore.setState((state) => {
		if (state.sections.find((s) => s.id === id)) return state;
		return {
			...state,
			sections: [...state.sections, { id, name, visible: true }],
			activeSection: id,
		};
	});
};

export const removeSection = (id: string) => {
	resumeStore.setState((state) => {
		const newSections = state.sections.filter((s) => s.id !== id);
		return {
			...state,
			sections: newSections,
			activeSection:
				state.activeSection === id ? "personalInfo" : state.activeSection,
		};
	});
};

// --- Projects ---
export const addProject = (item: Project) => {
	resumeStore.setState((state) => ({
		...state,
		projects: [...(state.projects || []), item],
	}));
};

export const updateProject = (id: string, updatedItem: Partial<Project>) => {
	resumeStore.setState((state) => ({
		...state,
		projects: (state.projects || []).map((item) =>
			item.id === id ? { ...item, ...updatedItem } : item,
		),
	}));
};

export const deleteProject = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		projects: (state.projects || []).filter((item) => item.id !== id),
	}));
};

export const reorderProjects = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.projects || []);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, projects: result };
	});
};

// --- Certifications ---
export const addCertification = (item: Certification) => {
	resumeStore.setState((state) => ({
		...state,
		certifications: [...(state.certifications || []), item],
	}));
};

export const updateCertification = (
	id: string,
	updatedItem: Partial<Certification>,
) => {
	resumeStore.setState((state) => ({
		...state,
		certifications: (state.certifications || []).map((item) =>
			item.id === id ? { ...item, ...updatedItem } : item,
		),
	}));
};

export const deleteCertification = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		certifications: (state.certifications || []).filter(
			(item) => item.id !== id,
		),
	}));
};

export const reorderCertifications = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.certifications || []);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, certifications: result };
	});
};

// --- Languages ---
export const addLanguage = (item: Language) => {
	resumeStore.setState((state) => ({
		...state,
		languages: [...(state.languages || []), item],
	}));
};

export const updateLanguage = (id: string, updatedItem: Partial<Language>) => {
	resumeStore.setState((state) => ({
		...state,
		languages: (state.languages || []).map((item) =>
			item.id === id ? { ...item, ...updatedItem } : item,
		),
	}));
};

export const deleteLanguage = (id: string) => {
	resumeStore.setState((state) => ({
		...state,
		languages: (state.languages || []).filter((item) => item.id !== id),
	}));
};

export const reorderLanguages = (startIndex: number, endIndex: number) => {
	resumeStore.setState((state) => {
		const result = Array.from(state.languages || []);
		const [removed] = result.splice(startIndex, 1);
		result.splice(endIndex, 0, removed);
		return { ...state, languages: result };
	});
};
