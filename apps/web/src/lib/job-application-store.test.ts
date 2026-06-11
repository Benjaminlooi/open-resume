import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mockStorage: Record<string, string> = {};

vi.mock("./local-companion-client", () => {
	return {
		getResume: vi.fn(async (id: string) => {
			const contentStr = mockStorage[`resume-${id}`];
			if (!contentStr) {
				throw new Error(`Resume not found in mock storage: ${id}`);
			}
			const { useResumeIndexStore } = await import("./resume-index-store");
			const state = useResumeIndexStore.getState();
			const entry = state.resumes.find((r: any) => r.id === id);
			return {
				id,
				name: entry?.name || "Core Resume",
				templateId: entry?.templateId || "modern",
				lastModified: entry?.lastModified || Date.now(),
				isDefault: state.defaultResumeId === id,
				content: JSON.parse(contentStr),
			};
		}),
		updateResume: vi.fn(async (id: string, data: any) => {
			return {
				id,
				name: data.name,
				templateId: data.templateId,
				content: data.content,
				lastModified: Date.now(),
				isDefault: false,
			};
		}),
	};
});

describe("jobApplicationStore", () => {
	let originalWindow: any;
	let originalLocalStorage: any;
	let useJobApplicationStore: any;
	let useResumeIndexStore: any;

	beforeAll(async () => {
		originalWindow = globalThis.window;
		originalLocalStorage = (globalThis as any).localStorage;

		const storageMock = {
			getItem: vi.fn((key: string) => mockStorage[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				mockStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockStorage[key];
			}),
			clear: vi.fn(() => {
				for (const key of Object.keys(mockStorage)) {
					delete mockStorage[key];
				}
			}),
			length: 0,
			key: vi.fn(),
		};

		globalThis.window = {
			localStorage: storageMock,
		} as any;
		(globalThis as any).localStorage = storageMock;

		// Dynamically import AFTER global mocks are set up, so ESM hoisting doesn't bypass them
		const indexStoreModule = await import("./resume-index-store");
		useResumeIndexStore = indexStoreModule.useResumeIndexStore;

		await import("./resume-store");

		const jobStoreModule = await import("./job-application-store");
		useJobApplicationStore = jobStoreModule.useJobApplicationStore;
	});

	beforeEach(() => {
		// Reset mockStorage keys between tests
		for (const key of Object.keys(mockStorage)) {
			delete mockStorage[key];
		}

		// Reset singleton stores state manually
		useResumeIndexStore.setState({
			resumes: [],
			defaultResumeId: null,
		});

		useJobApplicationStore.setState({
			jobApplications: [],
		});

		vi.clearAllMocks();
	});

	afterAll(() => {
		globalThis.window = originalWindow;
		(globalThis as any).localStorage = originalLocalStorage;
		vi.restoreAllMocks();
	});

	it("adds, updates, and deletes a job application", () => {
		// Add application
		const id = useJobApplicationStore
			.getState()
			.createJobApplication(
				"Google",
				"Software Engineer",
				"Mountain View",
				"https://google.com/jobs",
				"Job description text",
			);

		expect(id).toBeDefined();
		expect(typeof id).toBe("string");

		let state = useJobApplicationStore.getState();
		expect(state.jobApplications).toHaveLength(1);
		expect(state.jobApplications[0]).toMatchObject({
			id,
			company: "Google",
			title: "Software Engineer",
			location: "Mountain View",
			sourceUrl: "https://google.com/jobs",
			description: "Job description text",
			status: "saved",
		});

		// Update application
		useJobApplicationStore.getState().updateJobApplication(id, {
			notes: "First round interview scheduled",
		});

		state = useJobApplicationStore.getState();
		expect(state.jobApplications[0].notes).toBe(
			"First round interview scheduled",
		);

		// Set status
		useJobApplicationStore.getState().setStatus(id, "interviewing");
		state = useJobApplicationStore.getState();
		expect(state.jobApplications[0].status).toBe("interviewing");

		// Delete application
		useJobApplicationStore.getState().deleteJobApplication(id);
		state = useJobApplicationStore.getState();
		expect(state.jobApplications).toHaveLength(0);
	});

	it("ensureTailoredResume copies the default resume snapshot", async () => {
		const resumeId = "resume-1";
		const mockResume = {
			personalInfo: {
				fullName: "John Doe",
				email: "john@example.com",
				phone: "123456",
				location: "New York",
				contactLinks: [],
			},
			summary: "Experienced engineer.",
			sections: [
				{ id: "summary", name: "Summary", visible: true },
				{ id: "experience", name: "Experience", visible: true },
			],
			experience: [
				{
					id: "exp-1",
					company: "Company A",
					role: "Software Engineer",
					startDate: "2020",
					endDate: "2022",
					location: "NY",
					bullets: ["Bullet 1"],
					description: "My role.",
				},
			],
			education: [],
			skills: [{ id: "skill-1", category: "Languages", items: "TS, JS" }],
			projects: [
				{
					id: "proj-1",
					name: "Project A",
					url: "http://a.com",
					date: "2021",
					description: "Proj A desc",
				},
			],
			certifications: [],
			languages: [],
		};

		// 1. Setup default resume in index store and localStorage
		useResumeIndexStore.setState({
			resumes: [
				{
					id: resumeId,
					name: "My Core Resume",
					templateId: "modern",
					lastModified: Date.now(),
				},
			],
			defaultResumeId: resumeId,
		});
		mockStorage[`resume-${resumeId}`] = JSON.stringify(mockResume);

		// 2. Create job application
		const id = useJobApplicationStore
			.getState()
			.createJobApplication(
				"Google",
				"Software Engineer",
				"Mountain View",
				"https://google.com/jobs",
				"Job description text",
			);

		// 3. Call ensureTailoredResume
		await useJobApplicationStore.getState().ensureTailoredResume(id);

		// 4. Verify copies are stored and status updated
		const app = useJobApplicationStore
			.getState()
			.jobApplications.find((a: any) => a.id === id);
		expect(app).toBeDefined();
		expect(app.sourceResumeId).toBe(resumeId);
		expect(app.sourceResumeName).toBe("My Core Resume");
		expect(app.status).toBe("tailoring");

		// Extracting the resume snapshot should match the migrated mockResume
		const expectedMigratedResume = {
			...mockResume,
			experience: [
				{
					...mockResume.experience[0],
					description: "<ul><li>Bullet 1</li></ul>",
				},
			],
		};
		delete (expectedMigratedResume.experience[0] as any).bullets;

		expect(app.sourceResumeSnapshot).toEqual(expectedMigratedResume);
		expect(app.tailoredResume).toEqual(expectedMigratedResume);

		// Ensure it is a deep copy, not reference identical
		expect(app.tailoredResume).not.toBe(app.sourceResumeSnapshot);
	});

	it("applyResumeEditProposal correctly applies edits to tailoredResume and leaves source resume intact", async () => {
		const resumeId = "resume-1";
		const mockResume = {
			personalInfo: {
				fullName: "John Doe",
				email: "john@example.com",
				phone: "123456",
				location: "New York",
				contactLinks: [],
			},
			summary: "Experienced engineer.",
			sections: [
				{ id: "summary", name: "Summary", visible: true },
				{ id: "experience", name: "Experience", visible: true },
			],
			experience: [
				{
					id: "exp-1",
					company: "Company A",
					role: "Software Engineer",
					startDate: "2020",
					endDate: "2022",
					location: "NY",
					bullets: ["Bullet 1"],
					description: "My role.",
				},
			],
			education: [],
			skills: [{ id: "skill-1", category: "Languages", items: "TS, JS" }],
			projects: [
				{
					id: "proj-1",
					name: "Project A",
					url: "http://a.com",
					date: "2021",
					description: "Proj A desc",
				},
			],
			certifications: [],
			languages: [],
		};

		useResumeIndexStore.setState({
			resumes: [
				{
					id: resumeId,
					name: "My Core Resume",
					templateId: "modern",
					lastModified: Date.now(),
				},
			],
			defaultResumeId: resumeId,
		});
		mockStorage[`resume-${resumeId}`] = JSON.stringify(mockResume);

		const id = useJobApplicationStore
			.getState()
			.createJobApplication(
				"Google",
				"Software Engineer",
				"Mountain View",
				"https://google.com/jobs",
				"Job description",
			);

		await useJobApplicationStore.getState().ensureTailoredResume(id);

		// Save edit proposals
		const proposals = [
			{
				id: "prop-1",
				target: { section: "summary" },
				currentText: "Experienced engineer.",
				suggestedText: "Highly experienced software developer.",
				rationale: "Tailored to job description.",
				status: "pending",
				createdAt: Date.now(),
			},
			{
				id: "prop-2",
				target: {
					section: "experience",
					itemId: "exp-1",
					field: "role",
				},
				currentText: "Software Engineer",
				suggestedText: "Lead Software Engineer",
				rationale: "Highlight leadership.",
				status: "pending",
				createdAt: Date.now(),
			},
			{
				id: "prop-3",
				target: {
					section: "experience",
					itemId: "exp-1",
					field: "bullet",
					bulletIndex: 0,
				},
				currentText: "Bullet 1",
				suggestedText: "Super awesome bullet 1",
				rationale: "Better impact wording.",
				status: "pending",
				createdAt: Date.now(),
			},
			{
				id: "prop-4",
				target: {
					section: "skills",
					itemId: "skill-1",
					field: "items",
				},
				currentText: "TS, JS",
				suggestedText: "TS, JS, Python",
				rationale: "Match job requirements.",
				status: "pending",
				createdAt: Date.now(),
			},
			{
				id: "prop-5",
				target: {
					section: "projects",
					itemId: "proj-1",
					field: "description",
				},
				currentText: "Proj A desc",
				suggestedText: "Tailored project A description",
				rationale: "More relevance.",
				status: "pending",
				createdAt: Date.now(),
			},
		];

		useJobApplicationStore
			.getState()
			.saveResumeEditProposals(id, proposals as any);

		// Apply proposal 1 (summary)
		useJobApplicationStore.getState().applyResumeEditProposal(id, "prop-1");

		// Apply proposal 2 (experience role)
		useJobApplicationStore.getState().applyResumeEditProposal(id, "prop-2");

		// Apply proposal 3 (experience bullet)
		useJobApplicationStore.getState().applyResumeEditProposal(id, "prop-3");

		// Apply proposal 4 (skills items)
		useJobApplicationStore.getState().applyResumeEditProposal(id, "prop-4");

		// Apply proposal 5 (project description)
		useJobApplicationStore.getState().applyResumeEditProposal(id, "prop-5");

		const app = useJobApplicationStore
			.getState()
			.jobApplications.find((a: any) => a.id === id);
		expect(app).toBeDefined();

		// Verify updates in tailoredResume
		expect(app.tailoredResume.summary).toBe(
			"Highly experienced software developer.",
		);
		expect(app.tailoredResume.experience[0].role).toBe(
			"Lead Software Engineer",
		);
		expect(app.tailoredResume.experience[0].bullets[0]).toBe(
			"Super awesome bullet 1",
		);
		expect(app.tailoredResume.experience[0].description).toBe(
			"<ul><li>Super awesome bullet 1</li></ul>",
		);
		expect(app.tailoredResume.skills[0].items).toBe("TS, JS, Python");
		expect(app.tailoredResume.projects[0].description).toBe(
			"Tailored project A description",
		);

		// Verify status of applied proposals
		expect(app.resumeEditProposals[0].status).toBe("applied");
		expect(app.resumeEditProposals[0].appliedAt).toBeDefined();

		// Verify original sourceResumeSnapshot remains unchanged!
		expect(app.sourceResumeSnapshot.summary).toBe("Experienced engineer.");
		expect(app.sourceResumeSnapshot.experience[0].role).toBe(
			"Software Engineer",
		);
		expect(app.sourceResumeSnapshot.experience[0].bullets).toBeUndefined();
		expect(app.sourceResumeSnapshot.skills[0].items).toBe("TS, JS");
		expect(app.sourceResumeSnapshot.projects[0].description).toBe(
			"Proj A desc",
		);
	});

	it("validatePipeline flags missing fields, missing source resumes, out-of-bounds bullet indexes, and archived jobs with pending proposals", async () => {
		// 1. Create a job application with missing company, title, description, and sourceResumeId
		const id1 = useJobApplicationStore
			.getState()
			.createJobApplication("", "", "Mountain View", "", "");

		let warnings = useJobApplicationStore.getState().validatePipeline();

		expect(warnings[id1]).toContain("Company name is missing.");
		expect(warnings[id1]).toContain("Job title is missing.");
		expect(warnings[id1]).toContain("Job description is missing.");
		expect(warnings[id1]).toContain(
			"No source resume has been associated yet.",
		);

		// 2. Associate a resume
		const resumeId = "resume-1";
		const mockResume = {
			personalInfo: {
				fullName: "John Doe",
				email: "",
				phone: "",
				location: "",
				contactLinks: [],
			},
			sections: [],
			experience: [
				{
					id: "exp-1",
					company: "A",
					role: "Eng",
					startDate: "",
					endDate: "",
					location: "",
					description: "<ul><li>Bullet 1</li><li>Bullet 2</li></ul>",
				},
			],
			education: [],
			skills: [],
			projects: [],
		};
		useResumeIndexStore.setState({
			resumes: [
				{
					id: resumeId,
					name: "Core Resume",
					templateId: "modern",
					lastModified: Date.now(),
				},
			],
			defaultResumeId: resumeId,
		});
		mockStorage[`resume-${resumeId}`] = JSON.stringify(mockResume);

		await useJobApplicationStore
			.getState()
			.associateSourceResume(id1, resumeId);
		useJobApplicationStore.getState().updateJobApplication(id1, {
			title: "Developer",
			company: "Startup",
			description: "Coding stuff",
		});

		warnings = useJobApplicationStore.getState().validatePipeline();
		expect(warnings[id1]).toBeUndefined(); // All cleared now!

		// 3. Save proposals with stale targets and out-of-bounds bullet
		useJobApplicationStore.getState().updateJobApplication(id1, {
			resumeEditProposals: [
				{
					id: "prop-stale-exp",
					target: {
						section: "experience",
						itemId: "non-existent-exp",
						field: "role",
					},
					status: "pending",
					currentText: "",
					suggestedText: "",
					rationale: "",
					createdAt: Date.now(),
				},
				{
					id: "prop-oob-bullet",
					target: {
						section: "experience",
						itemId: "exp-1",
						field: "bullet",
						bulletIndex: 5, // out of bounds
					},
					status: "pending",
					currentText: "",
					suggestedText: "",
					rationale: "",
					createdAt: Date.now(),
				},
			] as any,
		});

		warnings = useJobApplicationStore.getState().validatePipeline();
		expect(warnings[id1]).toContain(
			"Stale proposal target: experience item non-existent-exp is no longer present.",
		);
		expect(warnings[id1]).toContain(
			"Stale proposal target: experience item exp-1 bullet index 5 is out of bounds.",
		);

		// 4. Archive the job application
		useJobApplicationStore.getState().archiveIncompleteJob(id1);
		warnings = useJobApplicationStore.getState().validatePipeline();
		// For archived job, we only expect warning about pending proposals
		expect(warnings[id1]).toEqual(["Archived job has pending proposals."]);

		// Clear the pending proposals
		useJobApplicationStore.getState().clearStaleProposal(id1, "prop-stale-exp");
		useJobApplicationStore
			.getState()
			.clearStaleProposal(id1, "prop-oob-bullet");
		warnings = useJobApplicationStore.getState().validatePipeline();
		expect(warnings[id1]).toBeUndefined(); // Warnings cleared because no pending proposals left
	});

	it("recovery actions work as expected and never mutate the original default resume", async () => {
		const resumeId = "resume-1";
		const mockResume = {
			personalInfo: {
				fullName: "John Doe",
				email: "",
				phone: "",
				location: "",
				contactLinks: [],
			},
			sections: [],
			experience: [
				{
					id: "exp-1",
					company: "A",
					role: "Eng",
					startDate: "",
					endDate: "",
					location: "",
				},
			],
			education: [],
			skills: [],
			projects: [],
		};

		useResumeIndexStore.setState({
			resumes: [
				{
					id: resumeId,
					name: "Core Resume",
					templateId: "modern",
					lastModified: Date.now(),
				},
			],
			defaultResumeId: resumeId,
		});
		mockStorage[`resume-${resumeId}`] = JSON.stringify(mockResume);

		const appId = useJobApplicationStore
			.getState()
			.createJobApplication("Company", "Title", "Loc", "url", "desc");

		// Associate source resume
		await useJobApplicationStore
			.getState()
			.associateSourceResume(appId, resumeId);

		const app = useJobApplicationStore
			.getState()
			.jobApplications.find((a: any) => a.id === appId);
		expect(app).toBeDefined();
		expect(app?.sourceResumeId).toBe(resumeId);
		expect(app?.status).toBe("tailoring");

		// Check deep copy and mutation safety
		expect(app?.tailoredResume).toEqual(app?.sourceResumeSnapshot);
		expect(app?.tailoredResume).not.toBe(app?.sourceResumeSnapshot);

		// Modify tailored resume in the app
		const tailored = app?.tailoredResume;
		if (tailored) {
			tailored.personalInfo.fullName = "Jane Doe";
		}

		// Ensure original in mockStorage (representing the localStorage) remains untouched
		const originalInStorage = JSON.parse(mockStorage[`resume-${resumeId}`]);
		expect(originalInStorage.personalInfo.fullName).toBe("John Doe");
	});
});
