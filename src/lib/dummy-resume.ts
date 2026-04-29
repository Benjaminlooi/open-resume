import { type EditorState } from "./resume-store";

export const blankResumeState: EditorState = {
	id: "dummy",
	name: "Template Preview",
	activeSection: "personalInfo",
	templateId: "demo",
	personalInfo: {
		fullName: "First Last",
		email: "",
		phone: "",
		location: "",
		website: "",
	},
	sections: [],
	experience: [],
	education: [],
	skills: [],
	projects: [],
	certifications: [],
	languages: [],
};
