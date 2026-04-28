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

// We extend the Resume type locally for UI state
type EditorState = Resume & {
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
	activeSection: "personalInfo",
	templateId: "demo",
	personalInfo: {
		fullName: "John Doe",
		email: "john.doe@example.com",
		phone: "(555) 123-4567",
		location: "San Francisco, CA",
		website: "linkedin.com/in/johndoe",
	},
	sections: [
		{ id: "experience", name: "Experience", visible: true },
		{ id: "education", name: "Education", visible: true },
		{ id: "skills", name: "Skills", visible: true },
		{ id: "projects", name: "Projects", visible: true },
		{ id: "certifications", name: "Certifications", visible: true },
		{ id: "languages", name: "Languages", visible: true },
	],
	experience: [
		{
			id: "exp-1",
			company: "Tech Innovations Inc.",
			role: "Senior Software Engineer",
			startDate: "Jan 2022",
			endDate: "Present",
			location: "San Francisco, CA",
			description:
				"<ul><li>Led development of a high-performance React application serving 1M+ MAU.</li><li>Architected and implemented a microservices backend using Node.js and Go.</li><li>Mentored a team of 5 junior developers, improving code review turnaround by 30%.</li><li>Spearheaded the migration from a monolithic architecture to containerized microservices, reducing deployment time by 40%.</li><li>Implemented comprehensive CI/CD pipelines using GitHub Actions, increasing release frequency from bi-weekly to daily.</li></ul>",
		},
		{
			id: "exp-2",
			company: "Web Solutions Corp",
			role: "Software Engineer",
			startDate: "Jun 2019",
			endDate: "Dec 2021",
			location: "Seattle, WA",
			description:
				"<ul><li>Developed RESTful APIs handling 50k requests per minute.</li><li>Optimized database queries, reducing average response time by 40%.</li><li>Collaborated with design and product teams to deliver 10+ major features.</li><li>Introduced automated end-to-end testing with Cypress, improving test coverage to 85%.</li></ul>",
		},
		{
			id: "exp-3",
			company: "Startup Hub",
			role: "Junior Developer",
			startDate: "Jan 2018",
			endDate: "May 2019",
			location: "Austin, TX",
			description:
				"<ul><li>Assisted in the development of the company's flagship mobile application using React Native.</li><li>Integrated third-party APIs for payment processing and user authentication.</li><li>Participated in daily stand-ups and agile sprint planning sessions.</li></ul>",
		},
		{
			id: "exp-4",
			company: "Global Tech",
			role: "Intern",
			startDate: "May 2017",
			endDate: "Aug 2017",
			location: "New York, NY",
			description:
				"<ul><li>Developed internal tools for data analysis using Python and Pandas.</li><li>Created documentation for legacy systems to aid in future migrations.</li></ul>",
		},
	],
	education: [
		{
			id: "edu-1",
			institution: "University of Technology",
			degree: "Master of Science in Software Engineering",
			startDate: "Aug 2019",
			endDate: "May 2021",
			location: "San Francisco, CA",
			gpa: "3.9/4.0",
			description:
				"<ul><li>Specialized in distributed systems and cloud computing.</li><li>Thesis: Evaluating consistency models in edge databases.</li></ul>",
		},
		{
			id: "edu-2",
			institution: "University of Technology",
			degree: "Bachelor of Science in Computer Science",
			startDate: "Aug 2015",
			endDate: "May 2019",
			location: "New York, NY",
			gpa: "3.8/4.0",
			description:
				"<ul><li>Minor in Mathematics.</li><li>President of the Computer Science Society.</li></ul>",
		},
	],
	skills: [
		{
			id: "skill-1",
			category: "Languages",
			items: "JavaScript, TypeScript, Python, Go, HTML, CSS, Rust, Java",
		},
		{
			id: "skill-2",
			category: "Frameworks",
			items: "React, Next.js, Express, Tailwind CSS, Vue.js, Django, Spring Boot",
		},
		{
			id: "skill-3",
			category: "Tools",
			items: "Git, Docker, AWS, CI/CD, Jest, Kubernetes, Terraform, Prometheus",
		},
		{
			id: "skill-4",
			category: "Databases",
			items: "PostgreSQL, MongoDB, Redis, Elasticsearch, DynamoDB",
		},
	],
	projects: [
		{
			id: "proj-1",
			name: "Open Source E-commerce Platform",
			date: "2023",
			url: "github.com/johndoe/ecommerce",
			description:
				"<ul><li>Created a fully functional e-commerce platform using Next.js and Stripe.</li><li>Achieved over 1,000 stars on GitHub and 50+ active contributors.</li></ul>",
		},
		{
			id: "proj-2",
			name: "Real-time Chat Application",
			date: "2021",
			url: "github.com/johndoe/chat-app",
			description:
				"<ul><li>Built a scalable chat application utilizing WebSockets and Redis.</li><li>Implemented end-to-end encryption for secure messaging.</li></ul>",
		},
		{
			id: "proj-3",
			name: "Personal Finance Tracker",
			date: "2020",
			description:
				"<ul><li>Developed a mobile-first web app to track expenses and budget goals.</li><li>Integrated Plaid API for real-time bank transaction sync.</li></ul>",
		},
	],
	certifications: [
		{
			id: "cert-1",
			name: "AWS Certified Solutions Architect",
			issuer: "Amazon Web Services",
			date: "2022",
		},
		{
			id: "cert-2",
			name: "Certified Kubernetes Administrator (CKA)",
			issuer: "Cloud Native Computing Foundation",
			date: "2023",
		},
		{
			id: "cert-3",
			name: "Google Cloud Professional Developer",
			issuer: "Google",
			date: "2021",
		},
	],
	languages: [
		{ id: "lang-1", language: "English", proficiency: "Native" },
		{ id: "lang-2", language: "Spanish", proficiency: "Fluent" },
		{ id: "lang-3", language: "Mandarin", proficiency: "Conversational" },
		{ id: "lang-4", language: "French", proficiency: "Basic" },
	],
};

const getInitialState = (): EditorState => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("resume-builder-state");
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

				return parsed as EditorState;
			} catch (e) {
				console.error("Failed to parse saved resume state", e);
			}
		}
	}
	return initialResume;
};

export const resumeStore = new Store<EditorState>(getInitialState());

if (typeof window !== "undefined") {
	resumeStore.subscribe(() => {
		localStorage.setItem(
			"resume-builder-state",
			JSON.stringify(resumeStore.state),
		);
	});
}

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
