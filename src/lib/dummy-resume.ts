import { type EditorState } from "./resume-store";

export const blankResumeState: EditorState = {
	templateId: "demo", // Overridden by component
	personalInfo: {
		firstName: "First",
		lastName: "Last",
		email: "",
		phone: "",
		title: "",
		location: "",
		summary: "",
		socialLinks: []
	},
	experience: [],
	education: [],
	skills: [],
	projects: []
};
