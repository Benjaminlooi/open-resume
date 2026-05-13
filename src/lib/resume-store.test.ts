import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeStore } from "./resume-store";

// Deep clone the initial state so we can reset the singleton between tests
const initialState = JSON.parse(JSON.stringify(useResumeStore.getState()));

describe("resumeStore", () => {
	beforeEach(() => {
		useResumeStore.setState(JSON.parse(JSON.stringify(initialState)));
	});

	it("initializes with the correct dummy data", () => {
		const state = useResumeStore.getState();

		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("John Doe");
		expect(state.sections.length).toBeGreaterThan(0);
		expect(state.experience.length).toBeGreaterThan(0);
	});

	it("updates personal info correctly", () => {
		useResumeStore.getState().updatePersonalInfo("fullName", "Pickle Rick");
		useResumeStore.getState().updatePersonalInfo("email", "rick@citadel.com");

		const state = useResumeStore.getState();
		expect(state.personalInfo.fullName).toBe("Pickle Rick");
		expect(state.personalInfo.email).toBe("rick@citadel.com");
		// Ensure other state is intact
		expect(state.personalInfo.phone).toBe(initialState.personalInfo.phone);
	});

	it("sets active section correctly", () => {
		useResumeStore.getState().setActiveSection("education");

		const state = useResumeStore.getState();
		expect(state.activeSection).toBe("education");
	});

	it("toggles section visibility correctly", () => {
		const experienceSection = useResumeStore
			.getState()
			.sections.find((s) => s.id === "experience");
		expect(experienceSection?.visible).toBe(true);

		useResumeStore.getState().toggleSectionVisibility("experience");

		const state = useResumeStore.getState();
		const toggledSection = state.sections.find((s) => s.id === "experience");
		expect(toggledSection?.visible).toBe(false);

		// Toggle back
		useResumeStore.getState().toggleSectionVisibility("experience");
		expect(
			useResumeStore.getState().sections.find((s) => s.id === "experience")
				?.visible,
		).toBe(true);
	});

	it("initializes a new resume without dirty state", () => {
		// Simulate editing an existing resume
		useResumeStore.getState().updatePersonalInfo("fullName", "Dirty Name");
		useResumeStore.getState().setTemplateId("dirty-template");

		// Now initialize a new one
		useResumeStore.getState().initNewResume("new-id", "New Name", "modern");

		const state = useResumeStore.getState();
		expect(state.id).toBe("new-id");
		expect(state.name).toBe("New Name");
		expect(state.templateId).toBe("modern");
		// Ensure dirty state is cleared by checking against dummy/blank resume
		expect(state.personalInfo.fullName).toBe("John Doe"); // blankResumeState defaults to John Doe
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
			useResumeStore.getState().addExperience(newItem);
			const state = useResumeStore.getState();
			expect(state.experience[state.experience.length - 1]).toEqual(newItem);
		});

		it("updates an experience", () => {
			const idToUpdate = useResumeStore.getState().experience[0].id;
			useResumeStore.getState().updateExperience(idToUpdate, { role: "CTO" });
			const state = useResumeStore.getState();
			expect(state.experience.find((e) => e.id === idToUpdate)?.role).toBe(
				"CTO",
			);
		});

		it("deletes an experience", () => {
			const idToDelete = useResumeStore.getState().experience[0].id;
			const initialLength = useResumeStore.getState().experience.length;
			useResumeStore.getState().deleteExperience(idToDelete);
			const state = useResumeStore.getState();
			expect(state.experience.length).toBe(initialLength - 1);
			expect(state.experience.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders experience", () => {
			const initialOrder = useResumeStore
				.getState()
				.experience.map((e) => e.id);
			useResumeStore.getState().reorderExperience(0, 1);
			const state = useResumeStore.getState();
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
			useResumeStore.getState().addEducation(newItem);
			const state = useResumeStore.getState();
			expect(state.education[state.education.length - 1]).toEqual(newItem);
		});

		it("updates an education", () => {
			const idToUpdate = useResumeStore.getState().education[0].id;
			useResumeStore.getState().updateEducation(idToUpdate, { degree: "PhD" });
			const state = useResumeStore.getState();
			expect(state.education.find((e) => e.id === idToUpdate)?.degree).toBe(
				"PhD",
			);
		});

		it("deletes an education", () => {
			const idToDelete = useResumeStore.getState().education[0].id;
			const initialLength = useResumeStore.getState().education.length;
			useResumeStore.getState().deleteEducation(idToDelete);
			const state = useResumeStore.getState();
			expect(state.education.length).toBe(initialLength - 1);
			expect(state.education.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders education", () => {
			const initialOrder = useResumeStore.getState().education.map((e) => e.id);
			useResumeStore.getState().reorderEducation(0, 1);
			const state = useResumeStore.getState();
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
			useResumeStore.getState().addSkillGroup(newItem);
			const state = useResumeStore.getState();
			expect(state.skills[state.skills.length - 1]).toEqual(newItem);
		});

		it("updates a skill group", () => {
			const idToUpdate = useResumeStore.getState().skills[0].id;
			useResumeStore
				.getState()
				.updateSkillGroup(idToUpdate, { category: "Updated Category" });
			const state = useResumeStore.getState();
			expect(state.skills.find((e) => e.id === idToUpdate)?.category).toBe(
				"Updated Category",
			);
		});

		it("deletes a skill group", () => {
			const idToDelete = useResumeStore.getState().skills[0].id;
			const initialLength = useResumeStore.getState().skills.length;
			useResumeStore.getState().deleteSkillGroup(idToDelete);
			const state = useResumeStore.getState();
			expect(state.skills.length).toBe(initialLength - 1);
			expect(state.skills.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders skills", () => {
			const initialOrder = useResumeStore.getState().skills.map((e) => e.id);
			useResumeStore.getState().reorderSkills(0, 1);
			const state = useResumeStore.getState();
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
			useResumeStore.getState().addProject(newItem);
			const state = useResumeStore.getState();
			expect(state.projects?.[state.projects?.length - 1]).toEqual(newItem);
		});

		it("updates a project", () => {
			const idToUpdate = useResumeStore.getState().projects?.[0].id;
			useResumeStore
				.getState()
				.updateProject(idToUpdate, { name: "Updated Project" });
			const state = useResumeStore.getState();
			expect(state.projects?.find((e) => e.id === idToUpdate)?.name).toBe(
				"Updated Project",
			);
		});

		it("deletes a project", () => {
			const idToDelete = useResumeStore.getState().projects?.[0].id;
			const initialLength = useResumeStore.getState().projects?.length;
			useResumeStore.getState().deleteProject(idToDelete);
			const state = useResumeStore.getState();
			expect(state.projects?.length).toBe(initialLength - 1);
			expect(state.projects?.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders projects", () => {
			const initialOrder = useResumeStore.getState().projects?.map((e) => e.id);
			useResumeStore.getState().reorderProjects(0, 1);
			const state = useResumeStore.getState();
			expect(state.projects?.[0].id).toBe(initialOrder[1]);
			expect(state.projects?.[1].id).toBe(initialOrder[0]);
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
			useResumeStore.getState().addCertification(newItem);
			const state = useResumeStore.getState();
			expect(state.certifications?.[state.certifications?.length - 1]).toEqual(
				newItem,
			);
		});

		it("updates a certification", () => {
			const idToUpdate = useResumeStore.getState().certifications?.[0].id;
			useResumeStore
				.getState()
				.updateCertification(idToUpdate, { name: "Updated Cert" });
			const state = useResumeStore.getState();
			expect(state.certifications?.find((e) => e.id === idToUpdate)?.name).toBe(
				"Updated Cert",
			);
		});

		it("deletes a certification", () => {
			const idToDelete = useResumeStore.getState().certifications?.[0].id;
			const initialLength = useResumeStore.getState().certifications?.length;
			useResumeStore.getState().deleteCertification(idToDelete);
			const state = useResumeStore.getState();
			expect(state.certifications?.length).toBe(initialLength - 1);
			expect(
				state.certifications?.find((e) => e.id === idToDelete),
			).toBeUndefined();
		});

		it("reorders certifications", () => {
			const initialOrder = useResumeStore
				.getState()
				.certifications?.map((e) => e.id);
			useResumeStore.getState().reorderCertifications(0, 1);
			const state = useResumeStore.getState();
			expect(state.certifications?.[0].id).toBe(initialOrder[1]);
			expect(state.certifications?.[1].id).toBe(initialOrder[0]);
		});
	});

	describe("languages array mutations", () => {
		it("adds a language", () => {
			const newItem = {
				id: "new-lang",
				language: "German",
				proficiency: "Beginner",
			};
			useResumeStore.getState().addLanguage(newItem);
			const state = useResumeStore.getState();
			expect(state.languages?.[state.languages?.length - 1]).toEqual(newItem);
		});

		it("updates a language", () => {
			const idToUpdate = useResumeStore.getState().languages?.[0].id;
			useResumeStore
				.getState()
				.updateLanguage(idToUpdate, { language: "Updated Lang" });
			const state = useResumeStore.getState();
			expect(state.languages?.find((e) => e.id === idToUpdate)?.language).toBe(
				"Updated Lang",
			);
		});

		it("deletes a language", () => {
			const idToDelete = useResumeStore.getState().languages?.[0].id;
			const initialLength = useResumeStore.getState().languages?.length;
			useResumeStore.getState().deleteLanguage(idToDelete);
			const state = useResumeStore.getState();
			expect(state.languages?.length).toBe(initialLength - 1);
			expect(state.languages?.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders languages", () => {
			const initialOrder = useResumeStore
				.getState()
				.languages?.map((e) => e.id);
			useResumeStore.getState().reorderLanguages(0, 1);
			const state = useResumeStore.getState();
			expect(state.languages?.[0].id).toBe(initialOrder[1]);
			expect(state.languages?.[1].id).toBe(initialOrder[0]);
		});
	});

	describe("complex logic: legacy migration and side-effects", () => {
		let originalWindow: any;
		let originalLocalStorage: any;

		beforeEach(() => {
			originalWindow = globalThis.window;
			originalLocalStorage = (globalThis as any).localStorage;
			const mockStorage = {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				length: 0,
				key: vi.fn(),
			};
			globalThis.window = {
				localStorage: mockStorage,
			} as any;
			(globalThis as any).localStorage = mockStorage;
		});

		afterEach(() => {
			globalThis.window = originalWindow;
			(globalThis as any).localStorage = originalLocalStorage;
			vi.restoreAllMocks();
		});

		it("retrieves and parses resume data without altering the store", async () => {
			const dummyState = {
				id: "dummy-1",
				name: "Dummy Resume",
				templateId: "modern",
				experience: [{ id: "exp-1", bullets: ["Fixed a bug"] }],
			};
			(globalThis.window.localStorage.getItem as any).mockReturnValue(
				JSON.stringify(dummyState),
			);

			vi.resetModules();
			const { getResumeData, useResumeStore } = await import("./resume-store");

			const data = getResumeData("dummy-1");

			expect(data).not.toBeNull();
			expect(data?.id).toBe("dummy-1");
			// Legacy migration check
			expect(data?.experience[0].description).toBe(
				"<ul><li>Fixed a bug</li></ul>",
			);

			// Verify global store is unchanged
			expect(useResumeStore.getState().id).toBe("default");
		});

		it("migrates legacy bullets to description HTML on loadResume", async () => {
			const legacyState = {
				experience: [
					{
						id: "exp-1",
						bullets: ["Fixed a bug", "Wrote a test"],
					},
				],
			};
			(globalThis.window.localStorage.getItem as any).mockReturnValue(
				JSON.stringify(legacyState),
			);

			vi.resetModules();
			const { useResumeStore } = await import("./resume-store");

			useResumeStore.getState().loadResume("default");

			expect(useResumeStore.getState().experience[0].description).toBe(
				"<ul><li>Fixed a bug</li><li>Wrote a test</li></ul>",
			);
			expect(
				(useResumeStore.getState().experience[0] as any).bullets,
			).toBeUndefined();
		});

		it("saves state to localStorage on store update", async () => {
			vi.resetModules();
			const { useResumeStore } = await import("./resume-store");

			(globalThis.window.localStorage.setItem as any).mockClear();

			useResumeStore.getState().updatePersonalInfo("fullName", "Morty Smith");

			expect(globalThis.window.localStorage.setItem).toHaveBeenCalledWith(
				"resume-default",
				expect.stringContaining("Morty Smith"),
			);
		});
	});
});
