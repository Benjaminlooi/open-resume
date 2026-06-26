import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getResume, updateResume } from "./local-companion-client";
import { useRootStore } from "./root-store";

vi.mock("./local-companion-client", () => ({
	getResume: vi.fn(),
	updateResume: vi.fn(),
}));

const getResumeMock = vi.mocked(getResume);
const updateResumeMock = vi.mocked(updateResume);

/**
 * These tests exercise the `resume` slice of the root store. State lives at
 * `state.resume`; actions are the same functions the old standalone store had.
 *
 * The root store nests the slice under `resume`, so to reset between tests we
 * capture the slice's data (JSON clone drops the action functions) and spread
 * it back over the live slice — preserving the actions while resetting data.
 */
const initialResumeData = JSON.parse(
	JSON.stringify(useRootStore.getState().resume),
);

// Helper: read the resume slice.
const getResumeState = () => useRootStore.getState().resume;

// Helper: reset the resume slice's data while keeping its action functions.
const resetResume = () => {
	useRootStore.setState((prev) => ({
		resume: { ...prev.resume, ...JSON.parse(JSON.stringify(initialResumeData)) },
	}));
};

describe("resume slice", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetResume();
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
		const state = getResumeState();

		expect(state.activeSection).toBe("personalInfo");
		expect(state.personalInfo.fullName).toBe("Benjamin Looi");
		expect(state.sections.length).toBeGreaterThan(0);
		expect(state.experience.length).toBeGreaterThan(0);
	});

	it("updates personal info correctly", () => {
		getResumeState().updatePersonalInfo("fullName", "Pickle Rick");
		getResumeState().updatePersonalInfo("email", "rick@citadel.com");

		const state = getResumeState();
		expect(state.personalInfo.fullName).toBe("Pickle Rick");
		expect(state.personalInfo.email).toBe("rick@citadel.com");
		// Ensure other state is intact
		expect(state.personalInfo.phone).toBe(initialResumeData.personalInfo.phone);
	});

	it("updates summary correctly", () => {
		getResumeState().updateSummary("<p>Focused product engineer.</p>");

		const state = getResumeState();
		expect(state.summary).toBe("<p>Focused product engineer.</p>");
	});

	it("sets active section correctly", () => {
		getResumeState().setActiveSection("education");

		const state = getResumeState();
		expect(state.activeSection).toBe("education");
	});

	it("toggles section visibility correctly", () => {
		const experienceSection = getResumeState().sections.find(
			(s) => s.id === "experience",
		);
		expect(experienceSection?.visible).toBe(true);

		getResumeState().toggleSectionVisibility("experience");

		const state = getResumeState();
		const toggledSection = state.sections.find((s) => s.id === "experience");
		expect(toggledSection?.visible).toBe(false);

		// Toggle back
		getResumeState().toggleSectionVisibility("experience");
		expect(
			getResumeState().sections.find((s) => s.id === "experience")?.visible,
		).toBe(true);
	});

	it("initializes a new resume without dirty state", () => {
		// Simulate editing an existing resume
		getResumeState().updatePersonalInfo("fullName", "Dirty Name");
		getResumeState().setTemplateId("dirty-template");

		// Now initialize a new one
		getResumeState().initNewResume("new-id", "New Name", "modern");

		const state = getResumeState();
		expect(state.id).toBe("new-id");
		expect(state.name).toBe("New Name");
		expect(state.templateId).toBe("modern");
		// Ensure dirty state is cleared by checking against dummy/blank resume
		expect(state.personalInfo.fullName).toBe("Benjamin Looi"); // blankResumeState defaults to Benjamin's resume
	});

	it("replaces resume content without replacing editor metadata", () => {
		getResumeState().initNewResume("current-id", "Current Name", "modern");
		getResumeState().replaceResumeContent({
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

		const state = getResumeState();

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
				...initialResumeData,
				personalInfo: {
					...initialResumeData.personalInfo,
					fullName: "Backend Person",
				},
			},
		});

		const loaded = await getResumeState().loadResume("resume-1");

		expect(loaded).toBe(true);
		expect(getResumeMock).toHaveBeenCalledWith("resume-1");
		expect(getResumeState()).toMatchObject({
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

		const loaded = await getResumeState().loadResume("missing");

		expect(loaded).toBe(false);
		expect(getResumeState().id).toBe("default");
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Failed to load resume",
			expect.any(Error),
		);
		consoleErrorSpy.mockRestore();
	});

	it("updates the resume name and debounces companion saves", async () => {
		getResumeState().initNewResume("resume-1", "Old Name", "demo");
		vi.clearAllMocks();
		vi.clearAllTimers();

		getResumeState().updateResumeName("New Name");
		expect(getResumeState().name).toBe("New Name");
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
		getResumeState().addContactLink();

		const addedLink = getResumeState().personalInfo.contactLinks.at(-1);
		expect(addedLink).toMatchObject({ label: "Website", url: "" });

		getResumeState().updateContactLink(addedLink?.id ?? "", {
			label: "GitHub",
			url: "github.com/rick",
		});

		expect(
			getResumeState().personalInfo.contactLinks.find(
				(link) => link.id === addedLink?.id,
			),
		).toMatchObject({ label: "GitHub", url: "github.com/rick" });

		getResumeState().deleteContactLink(addedLink?.id ?? "");

		expect(
			getResumeState().personalInfo.contactLinks.find(
				(link) => link.id === addedLink?.id,
			),
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
			getResumeState().addExperience(newItem);
			const state = getResumeState();
			expect(state.experience[state.experience.length - 1]).toEqual(newItem);
		});

		it("updates an experience", () => {
			const idToUpdate = getResumeState().experience[0].id;
			getResumeState().updateExperience(idToUpdate, { role: "CTO" });
			const state = getResumeState();
			expect(state.experience.find((e) => e.id === idToUpdate)?.role).toBe(
				"CTO",
			);
		});

		it("deletes an experience", () => {
			const idToDelete = getResumeState().experience[0].id;
			const initialLength = getResumeState().experience.length;
			getResumeState().deleteExperience(idToDelete);
			const state = getResumeState();
			expect(state.experience.length).toBe(initialLength - 1);
			expect(state.experience.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders experience", () => {
			const initialOrder = getResumeState().experience.map((e) => e.id);
			getResumeState().reorderExperience(0, 1);
			const state = getResumeState();
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
			getResumeState().addEducation(newItem);
			const state = getResumeState();
			expect(state.education[state.education.length - 1]).toEqual(newItem);
		});

		it("updates an education", () => {
			const idToUpdate = getResumeState().education[0].id;
			getResumeState().updateEducation(idToUpdate, { degree: "PhD" });
			const state = getResumeState();
			expect(state.education.find((e) => e.id === idToUpdate)?.degree).toBe(
				"PhD",
			);
		});

		it("deletes an education", () => {
			const idToDelete = getResumeState().education[0].id;
			const initialLength = getResumeState().education.length;
			getResumeState().deleteEducation(idToDelete);
			const state = getResumeState();
			expect(state.education.length).toBe(initialLength - 1);
			expect(state.education.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders education", () => {
			getResumeState().addEducation({
				id: "reorder-edu",
				institution: "Second School",
				degree: "Certificate",
				startDate: "2020",
				endDate: "2021",
				location: "Remote",
				description: "",
			});
			const initialOrder = getResumeState().education.map((e) => e.id);
			getResumeState().reorderEducation(0, 1);
			const state = getResumeState();
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
			getResumeState().addSkillGroup(newItem);
			const state = getResumeState();
			expect(state.skills[state.skills.length - 1]).toEqual(newItem);
		});

		it("updates a skill group", () => {
			const idToUpdate = getResumeState().skills[0].id;
			getResumeState().updateSkillGroup(idToUpdate, {
				category: "Updated Category",
			});
			const state = getResumeState();
			expect(state.skills.find((e) => e.id === idToUpdate)?.category).toBe(
				"Updated Category",
			);
		});

		it("deletes a skill group", () => {
			const idToDelete = getResumeState().skills[0].id;
			const initialLength = getResumeState().skills.length;
			getResumeState().deleteSkillGroup(idToDelete);
			const state = getResumeState();
			expect(state.skills.length).toBe(initialLength - 1);
			expect(state.skills.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders skills", () => {
			const initialOrder = getResumeState().skills.map((e) => e.id);
			getResumeState().reorderSkills(0, 1);
			const state = getResumeState();
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
			getResumeState().addProject(newItem);
			const state = getResumeState();
			expect(state.projects?.[state.projects?.length - 1]).toEqual(newItem);
		});

		it("updates a project", () => {
			const idToUpdate = getResumeState().projects?.[0].id;
			getResumeState().updateProject(idToUpdate, { name: "Updated Project" });
			const state = getResumeState();
			expect(state.projects?.find((e) => e.id === idToUpdate)?.name).toBe(
				"Updated Project",
			);
		});

		it("deletes a project", () => {
			const idToDelete = getResumeState().projects?.[0].id;
			const initialLength = getResumeState().projects?.length;
			getResumeState().deleteProject(idToDelete);
			const state = getResumeState();
			expect(state.projects?.length).toBe(initialLength - 1);
			expect(
				state.projects?.find((e) => e.id === idToDelete),
			).toBeUndefined();
		});

		it("reorders projects", () => {
			const initialOrder = getResumeState().projects?.map((e) => e.id);
			getResumeState().reorderProjects(0, 1);
			const state = getResumeState();
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
			getResumeState().addCertification(newItem);
			const state = getResumeState();
			expect(
				state.certifications?.[state.certifications?.length - 1],
			).toEqual(newItem);
		});

		it("updates a certification", () => {
			getResumeState().addCertification({
				id: "cert-to-update",
				name: "Certified Developer",
				issuer: "Acme",
				date: "2024",
			});
			const idToUpdate = getResumeState().certifications?.[0].id;
			getResumeState().updateCertification(idToUpdate, { name: "Updated Cert" });
			const state = getResumeState();
			expect(
				state.certifications?.find((e) => e.id === idToUpdate)?.name,
			).toBe("Updated Cert");
		});

		it("deletes a certification", () => {
			getResumeState().addCertification({
				id: "cert-to-delete",
				name: "Certified Developer",
				issuer: "Acme",
				date: "2024",
			});
			const idToDelete = getResumeState().certifications?.[0].id;
			const initialLength = getResumeState().certifications?.length;
			getResumeState().deleteCertification(idToDelete);
			const state = getResumeState();
			expect(state.certifications?.length).toBe(initialLength - 1);
			expect(
				state.certifications?.find((e) => e.id === idToDelete),
			).toBeUndefined();
		});

		it("reorders certifications", () => {
			getResumeState().addCertification({
				id: "cert-first",
				name: "First Cert",
				issuer: "Acme",
				date: "2023",
			});
			getResumeState().addCertification({
				id: "cert-second",
				name: "Second Cert",
				issuer: "Acme",
				date: "2024",
			});
			const initialOrder = getResumeState().certifications?.map((e) => e.id);
			getResumeState().reorderCertifications(0, 1);
			const state = getResumeState();
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
			getResumeState().addLanguage(newItem);
			const state = getResumeState();
			expect(state.languages?.[state.languages?.length - 1]).toEqual(newItem);
		});

		it("updates a language", () => {
			getResumeState().addLanguage({
				id: "lang-to-update",
				language: "German",
				proficiency: "Beginner",
			});
			const idToUpdate = getResumeState().languages?.[0].id;
			getResumeState().updateLanguage(idToUpdate, { language: "Updated Lang" });
			const state = getResumeState();
			expect(
				state.languages?.find((e) => e.id === idToUpdate)?.language,
			).toBe("Updated Lang");
		});

		it("deletes a language", () => {
			getResumeState().addLanguage({
				id: "lang-to-delete",
				language: "German",
				proficiency: "Beginner",
			});
			const idToDelete = getResumeState().languages?.[0].id;
			const initialLength = getResumeState().languages?.length;
			getResumeState().deleteLanguage(idToDelete);
			const state = getResumeState();
			expect(state.languages?.length).toBe(initialLength - 1);
			expect(state.languages?.find((e) => e.id === idToDelete)).toBeUndefined();
		});

		it("reorders languages", () => {
			getResumeState().addLanguage({
				id: "lang-first",
				language: "German",
				proficiency: "Beginner",
			});
			getResumeState().addLanguage({
				id: "lang-second",
				language: "French",
				proficiency: "Beginner",
			});
			const initialOrder = getResumeState().languages?.map((e) => e.id);
			getResumeState().reorderLanguages(0, 1);
			const state = getResumeState();
			expect(state.languages?.[0].id).toBe(initialOrder[1]);
			expect(state.languages?.[1].id).toBe(initialOrder[0]);
		});
	});
});
