import { describe, it, expect, beforeEach } from "vitest";
import {
	resumeStore,
	updatePersonalInfo,
	setActiveSection,
	toggleSectionVisibility,
	addExperience,
	updateExperience,
	deleteExperience,
	reorderExperience,
	addEducation,
	updateEducation,
	deleteEducation,
	reorderEducation,
	addSkillGroup,
	updateSkillGroup,
	deleteSkillGroup,
	reorderSkills,
	addProject,
	updateProject,
	deleteProject,
	reorderProjects,
	addCertification,
	updateCertification,
	deleteCertification,
	reorderCertifications,
	addLanguage,
	updateLanguage,
	deleteLanguage,
	reorderLanguages,
} from "./resume-store";

// Deep clone the initial state so we can reset the singleton between tests
const initialState = JSON.parse(JSON.stringify(resumeStore.state));

describe("resumeStore", () => {
	beforeEach(() => {
		resumeStore.setState(() => JSON.parse(JSON.stringify(initialState)));
	});

	it("initializes with the correct dummy data", () => {
		const state = resumeStore.state;

		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("John Doe");
		expect(state.sections.length).toBeGreaterThan(0);
		expect(state.experience.length).toBeGreaterThan(0);
	});

	it("updates personal info correctly", () => {
		updatePersonalInfo("fullName", "Pickle Rick");
		updatePersonalInfo("email", "rick@citadel.com");

		const state = resumeStore.state;
		expect(state.personalInfo.fullName).toBe("Pickle Rick");
		expect(state.personalInfo.email).toBe("rick@citadel.com");
		// Ensure other state is intact
		expect(state.personalInfo.phone).toBe(initialState.personalInfo.phone);
	});

	it("sets active section correctly", () => {
		setActiveSection("education");

		const state = resumeStore.state;
		expect(state.activeSection).toBe("education");
	});

	it("toggles section visibility correctly", () => {
		const experienceSection = resumeStore.state.sections.find(
			(s) => s.id === "experience",
		);
		expect(experienceSection?.visible).toBe(true);

		toggleSectionVisibility("experience");

		const state = resumeStore.state;
		const toggledSection = state.sections.find((s) => s.id === "experience");
		expect(toggledSection?.visible).toBe(false);

		// Toggle back
		toggleSectionVisibility("experience");
		expect(
			resumeStore.state.sections.find((s) => s.id === "experience")?.visible,
		).toBe(true);
	});

	describe("experience array mutations", () => {
		it("adds an experience", () => {
			const newItem = {
				id: "new-exp",
				company: "New Co",
				role: "Dev",
				startDate: "2023",
				endDate: "Present",
				location: "Remote",
				description: "did stuff",
			};
			addExperience(newItem);
			const state = resumeStore.state;
			expect(state.experience[state.experience.length - 1]).toEqual(newItem);
		});

		it("updates an experience", () => {
			const idToUpdate = resumeStore.state.experience[0].id;
			updateExperience(idToUpdate, { role: "CTO" });
			const state = resumeStore.state;
			expect(state.experience.find((e) => e.id === idToUpdate)?.role).toBe(
				"CTO",
			);
		});

		it("deletes an experience", () => {
			const idToDelete = resumeStore.state.experience[0].id;
			const initialLength = resumeStore.state.experience.length;
			deleteExperience(idToDelete);
			const state = resumeStore.state;
			expect(state.experience.length).toBe(initialLength - 1);
			expect(state.experience.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders experience", () => {
			const initialOrder = resumeStore.state.experience.map((e) => e.id);
			reorderExperience(0, 1);
			const state = resumeStore.state;
			expect(state.experience[0].id).toBe(initialOrder[1]);
			expect(state.experience[1].id).toBe(initialOrder[0]);
		});
	});

	describe("education array mutations", () => {
		it("adds an education", () => {
			const newItem = {
				id: "new-edu",
				institution: "MIT",
				degree: "BS",
				startDate: "2020",
				endDate: "2024",
				location: "MA",
				description: "learned",
				gpa: "4.0",
			};
			addEducation(newItem);
			const state = resumeStore.state;
			expect(state.education[state.education.length - 1]).toEqual(newItem);
		});

		it("updates an education", () => {
			const idToUpdate = resumeStore.state.education[0].id;
			updateEducation(idToUpdate, { degree: "PhD" });
			const state = resumeStore.state;
			expect(state.education.find((e) => e.id === idToUpdate)?.degree).toBe(
				"PhD",
			);
		});

		it("deletes an education", () => {
			const idToDelete = resumeStore.state.education[0].id;
			const initialLength = resumeStore.state.education.length;
			deleteEducation(idToDelete);
			const state = resumeStore.state;
			expect(state.education.length).toBe(initialLength - 1);
			expect(state.education.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders education", () => {
			const initialOrder = resumeStore.state.education.map((e) => e.id);
			reorderEducation(0, 1);
			const state = resumeStore.state;
			expect(state.education[0].id).toBe(initialOrder[1]);
			expect(state.education[1].id).toBe(initialOrder[0]);
		});
	});

	describe("skills array mutations", () => {
		it("adds a skill group", () => {
			const newItem = {
				id: "new-skill",
				category: "Soft Skills",
				items: "Communication",
			};
			addSkillGroup(newItem);
			const state = resumeStore.state;
			expect(state.skills[state.skills.length - 1]).toEqual(newItem);
		});

		it("updates a skill group", () => {
			const idToUpdate = resumeStore.state.skills[0].id;
			updateSkillGroup(idToUpdate, { category: "Updated Category" });
			const state = resumeStore.state;
			expect(state.skills.find((e) => e.id === idToUpdate)?.category).toBe(
				"Updated Category",
			);
		});

		it("deletes a skill group", () => {
			const idToDelete = resumeStore.state.skills[0].id;
			const initialLength = resumeStore.state.skills.length;
			deleteSkillGroup(idToDelete);
			const state = resumeStore.state;
			expect(state.skills.length).toBe(initialLength - 1);
			expect(state.skills.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders skills", () => {
			const initialOrder = resumeStore.state.skills.map((e) => e.id);
			reorderSkills(0, 1);
			const state = resumeStore.state;
			expect(state.skills[0].id).toBe(initialOrder[1]);
			expect(state.skills[1].id).toBe(initialOrder[0]);
		});
	});

	describe("projects array mutations", () => {
		it("adds a project", () => {
			const newItem = {
				id: "new-proj",
				name: "AI Agent",
				date: "2024",
				url: "github.com/me/ai",
				description: "Built an AI",
			};
			addProject(newItem);
			const state = resumeStore.state;
			expect(state.projects![state.projects!.length - 1]).toEqual(newItem);
		});

		it("updates a project", () => {
			const idToUpdate = resumeStore.state.projects![0].id;
			updateProject(idToUpdate, { name: "Updated Project" });
			const state = resumeStore.state;
			expect(state.projects!.find((e) => e.id === idToUpdate)?.name).toBe(
				"Updated Project",
			);
		});

		it("deletes a project", () => {
			const idToDelete = resumeStore.state.projects![0].id;
			const initialLength = resumeStore.state.projects!.length;
			deleteProject(idToDelete);
			const state = resumeStore.state;
			expect(state.projects!.length).toBe(initialLength - 1);
			expect(state.projects!.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders projects", () => {
			const initialOrder = resumeStore.state.projects!.map((e) => e.id);
			reorderProjects(0, 1);
			const state = resumeStore.state;
			expect(state.projects![0].id).toBe(initialOrder[1]);
			expect(state.projects![1].id).toBe(initialOrder[0]);
		});
	});

	describe("certifications array mutations", () => {
		it("adds a certification", () => {
			const newItem = {
				id: "new-cert",
				name: "Certified Developer",
				issuer: "Acme",
				date: "2024",
			};
			addCertification(newItem);
			const state = resumeStore.state;
			expect(state.certifications![state.certifications!.length - 1]).toEqual(
				newItem,
			);
		});

		it("updates a certification", () => {
			const idToUpdate = resumeStore.state.certifications![0].id;
			updateCertification(idToUpdate, { name: "Updated Cert" });
			const state = resumeStore.state;
			expect(state.certifications!.find((e) => e.id === idToUpdate)?.name).toBe(
				"Updated Cert",
			);
		});

		it("deletes a certification", () => {
			const idToDelete = resumeStore.state.certifications![0].id;
			const initialLength = resumeStore.state.certifications!.length;
			deleteCertification(idToDelete);
			const state = resumeStore.state;
			expect(state.certifications!.length).toBe(initialLength - 1);
			expect(state.certifications!.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders certifications", () => {
			const initialOrder = resumeStore.state.certifications!.map((e) => e.id);
			reorderCertifications(0, 1);
			const state = resumeStore.state;
			expect(state.certifications![0].id).toBe(initialOrder[1]);
			expect(state.certifications![1].id).toBe(initialOrder[0]);
		});
	});

	describe("languages array mutations", () => {
		it("adds a language", () => {
			const newItem = {
				id: "new-lang",
				language: "German",
				proficiency: "Beginner",
			};
			addLanguage(newItem);
			const state = resumeStore.state;
			expect(state.languages![state.languages!.length - 1]).toEqual(newItem);
		});

		it("updates a language", () => {
			const idToUpdate = resumeStore.state.languages![0].id;
			updateLanguage(idToUpdate, { language: "Updated Lang" });
			const state = resumeStore.state;
			expect(state.languages!.find((e) => e.id === idToUpdate)?.language).toBe(
				"Updated Lang",
			);
		});

		it("deletes a language", () => {
			const idToDelete = resumeStore.state.languages![0].id;
			const initialLength = resumeStore.state.languages!.length;
			deleteLanguage(idToDelete);
			const state = resumeStore.state;
			expect(state.languages!.length).toBe(initialLength - 1);
			expect(state.languages!.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders languages", () => {
			const initialOrder = resumeStore.state.languages!.map((e) => e.id);
			reorderLanguages(0, 1);
			const state = resumeStore.state;
			expect(state.languages![0].id).toBe(initialOrder[1]);
			expect(state.languages![1].id).toBe(initialOrder[0]);
		});
	});
});