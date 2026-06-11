import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getResume, updateResume } from "./local-companion-client";
import { useResumeStore } from "./resume-store";

vi.mock("./local-companion-client", () => ({
	getResume: vi.fn(),
	updateResume: vi.fn(),
}));

const getResumeMock = vi.mocked(getResume);
const updateResumeMock = vi.mocked(updateResume);

// Deep clone the initial state so we can reset the singleton between tests
const initialState = JSON.parse(JSON.stringify(useResumeStore.getState()));

describe("resumeStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		useResumeStore.setState(JSON.parse(JSON.stringify(initialState)));
		vi.clearAllMocks();
		vi.clearAllTimers();
		updateResumeMock.mockResolvedValue({
			id: "default",
			name: "My Resume",
			templateId: "demo",
			lastModified: 1,
			isDefault: false,
			content: {},
		});
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("initializes with the correct dummy data", () => {
		const state = useResumeStore.getState();

		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("Benjamin Looi");
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

	it("updates summary correctly", () => {
		useResumeStore.getState().updateSummary("<p>Focused product engineer.</p>");

		const state = useResumeStore.getState();
		expect(state.summary).toBe("<p>Focused product engineer.</p>");
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
		expect(state.personalInfo.fullName).toBe("Benjamin Looi"); // blankResumeState defaults to Benjamin's resume
	});

	it("replaces resume content without replacing editor metadata", () => {
		useResumeStore
			.getState()
			.initNewResume("current-id", "Current Name", "modern");
		useResumeStore.getState().replaceResumeContent({
			personalInfo: {
				fullName: "Imported Person",
				email: "imported@example.com",
				phone: "",
				location: "",
				contactLinks: [],
			},
			summary: "<p>Imported summary.</p>",
			sections: [
				{ id: "summary", name: "Summary", visible: true },
				{ id: "experience", name: "Experience", visible: true },
				{ id: "education", name: "Education", visible: false },
				{ id: "skills", name: "Skills", visible: false },
				{ id: "projects", name: "Projects", visible: false },
				{ id: "certifications", name: "Certifications", visible: false },
				{ id: "languages", name: "Languages", visible: false },
			],
			experience: [],
			education: [],
			skills: [],
			projects: [],
			certifications: [],
			languages: [],
		});

		const state = useResumeStore.getState();

		expect(state.id).toBe("current-id");
		expect(state.name).toBe("Current Name");
		expect(state.templateId).toBe("modern");
		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("Imported Person");
		expect(state.personalInfo.email).toBe("imported@example.com");
		expect(state.summary).toBe("<p>Imported summary.</p>");
	});

	it("loads a resume asynchronously from the companion", async () => {
		getResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			lastModified: 123,
			isDefault: false,
			content: {
				...initialState,
				personalInfo: {
					...initialState.personalInfo,
					fullName: "Backend Person",
				},
			},
		});

		const loaded = await useResumeStore.getState().loadResume("resume-1");

		expect(loaded).toBe(true);
		expect(getResumeMock).toHaveBeenCalledWith("resume-1");
		expect(useResumeStore.getState()).toMatchObject({
			id: "resume-1",
			name: "Backend Resume",
			templateId: "modern",
			activeSection: "personalInfo",
			personalInfo: expect.objectContaining({
				fullName: "Backend Person",
			}),
		});
	});

	it("returns false when companion resume loading fails", async () => {
		getResumeMock.mockRejectedValue(new Error("missing"));
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const loaded = await useResumeStore.getState().loadResume("missing");

		expect(loaded).toBe(false);
		expect(useResumeStore.getState().id).toBe("default");
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Failed to load resume",
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
	});

	it("updates the resume name and debounces companion saves", async () => {
		useResumeStore.getState().initNewResume("resume-1", "Old Name", "demo");
		vi.clearAllMocks();
		vi.clearAllTimers();

		useResumeStore.getState().updateResumeName("New Name");
		expect(useResumeStore.getState().name).toBe("New Name");
		expect(updateResumeMock).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(500);

		expect(updateResumeMock).toHaveBeenCalledOnce();
		expect(updateResumeMock).toHaveBeenCalledWith(
			"resume-1",
			expect.objectContaining({
				name: "New Name",
				templateId: "demo",
				content: expect.objectContaining({
					personalInfo: expect.any(Object),
					sections: expect.any(Array),
				}),
			}),
		);
	});

	it("adds, updates, and deletes personal contact links", () => {
		useResumeStore.getState().addContactLink();

		const addedLink = useResumeStore
			.getState()
			.personalInfo.contactLinks.at(-1);
		expect(addedLink).toMatchObject({ label: "Website", url: "" });

		useResumeStore.getState().updateContactLink(addedLink?.id ?? "", {
			label: "GitHub",
			url: "github.com/rick",
		});

		expect(
			useResumeStore
				.getState()
				.personalInfo.contactLinks.find((link) => link.id === addedLink?.id),
		).toMatchObject({ label: "GitHub", url: "github.com/rick" });

		useResumeStore.getState().deleteContactLink(addedLink?.id ?? "");

		expect(
			useResumeStore
				.getState()
				.personalInfo.contactLinks.find((link) => link.id === addedLink?.id),
		).toBeUndefined();
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
			useResumeStore.getState().addEducation({
				id: "reorder-edu",
				institution: "Second School",
				degree: "Certificate",
				startDate: "2020",
				endDate: "2021",
				location: "Remote",
				description: "",
			});
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
			useResumeStore.getState().addCertification({
				id: "cert-to-update",
				name: "Certified Developer",
				issuer: "Acme",
				date: "2024",
			});
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
			useResumeStore.getState().addCertification({
				id: "cert-to-delete",
				name: "Certified Developer",
				issuer: "Acme",
				date: "2024",
			});
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
			useResumeStore.getState().addCertification({
				id: "cert-first",
				name: "First Cert",
				issuer: "Acme",
				date: "2023",
			});
			useResumeStore.getState().addCertification({
				id: "cert-second",
				name: "Second Cert",
				issuer: "Acme",
				date: "2024",
			});
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
			useResumeStore.getState().addLanguage({
				id: "lang-to-update",
				language: "German",
				proficiency: "Beginner",
			});
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
			useResumeStore.getState().addLanguage({
				id: "lang-to-delete",
				language: "German",
				proficiency: "Beginner",
			});
			const idToDelete = useResumeStore.getState().languages?.[0].id;
			const initialLength = useResumeStore.getState().languages?.length;
			useResumeStore.getState().deleteLanguage(idToDelete);
			const state = useResumeStore.getState();
			expect(state.languages?.length).toBe(initialLength - 1);
			expect(state.languages?.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders languages", () => {
			useResumeStore.getState().addLanguage({
				id: "lang-first",
				language: "German",
				proficiency: "Beginner",
			});
			useResumeStore.getState().addLanguage({
				id: "lang-second",
				language: "French",
				proficiency: "Beginner",
			});
			const initialOrder = useResumeStore
				.getState()
				.languages?.map((e) => e.id);
			useResumeStore.getState().reorderLanguages(0, 1);
			const state = useResumeStore.getState();
			expect(state.languages?.[0].id).toBe(initialOrder[1]);
			expect(state.languages?.[1].id).toBe(initialOrder[0]);
		});
	});

});
