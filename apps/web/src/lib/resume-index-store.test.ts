import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearDefaultResume,
	createResume,
	deleteResume,
	listResumes,
	setDefaultResume,
} from "./local-companion-client";
import { useResumeIndexStore } from "./resume-index-store";

vi.mock("./local-companion-client", () => ({
	clearDefaultResume: vi.fn(),
	createResume: vi.fn(),
	deleteResume: vi.fn(),
	listResumes: vi.fn(),
	setDefaultResume: vi.fn(),
}));

const listResumesMock = vi.mocked(listResumes);
const createResumeMock = vi.mocked(createResume);
const deleteResumeMock = vi.mocked(deleteResume);
const setDefaultResumeMock = vi.mocked(setDefaultResume);
const clearDefaultResumeMock = vi.mocked(clearDefaultResume);

describe("resumeIndexStore", () => {
	beforeEach(() => {
		useResumeIndexStore.setState({
			resumes: [],
			defaultResumeId: null,
		});
		vi.clearAllMocks();
	});

	it("initializes with empty resumes and null defaultResumeId by default", () => {
		const state = useResumeIndexStore.getState();
		expect(state.resumes).toEqual([]);
		expect(state.defaultResumeId).toBeNull();
	});

	it("loads resume summaries from the companion and derives the default ID", async () => {
		listResumesMock.mockResolvedValue([
			{
				id: "resume-1",
				name: "Resume 1",
				templateId: "modern",
				lastModified: 100,
				isDefault: false,
			},
			{
				id: "resume-2",
				name: "Resume 2",
				templateId: "demo",
				lastModified: 200,
				isDefault: true,
			},
		]);

		await useResumeIndexStore.getState().loadIndex();

		expect(listResumesMock).toHaveBeenCalledOnce();
		expect(useResumeIndexStore.getState()).toMatchObject({
			resumes: [
				{
					id: "resume-1",
					name: "Resume 1",
					templateId: "modern",
					lastModified: 100,
				},
				{
					id: "resume-2",
					name: "Resume 2",
					templateId: "demo",
					lastModified: 200,
				},
			],
			defaultResumeId: "resume-2",
		});
		expect(useResumeIndexStore.getState().resumes[0]).not.toHaveProperty(
			"isDefault",
		);
	});

	it("creates a companion resume with blank content and stores the returned summary", async () => {
		createResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "My Resume",
			templateId: "modern",
			lastModified: 123,
			isDefault: false,
			content: {},
		});

		await useResumeIndexStore
			.getState()
			.createResumeIndexEntry("resume-1", "My Resume", "modern");

		expect(createResumeMock).toHaveBeenCalledWith(
			"resume-1",
			"My Resume",
			"modern",
			expect.objectContaining({
				personalInfo: expect.any(Object),
				sections: expect.any(Array),
			}),
		);
		expect(useResumeIndexStore.getState().resumes).toEqual([
			{
				id: "resume-1",
				name: "My Resume",
				templateId: "modern",
				lastModified: 123,
			},
		]);
	});

	it("adds a local index entry immediately for non-awaited create callers", () => {
		createResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "My Resume",
			templateId: "modern",
			lastModified: 123,
			isDefault: false,
			content: {},
		});

		void useResumeIndexStore
			.getState()
			.createResumeIndexEntry("resume-1", "My Resume", "modern");

		expect(useResumeIndexStore.getState().resumes).toEqual([
			expect.objectContaining({
				id: "resume-1",
				name: "My Resume",
				templateId: "modern",
			}),
		]);
	});

	it("passes explicit content when creating an imported resume", async () => {
		const content = {
			personalInfo: {
				fullName: "Imported Person",
				email: "",
				phone: "",
				location: "",
				contactLinks: [],
			},
			summary: "",
			sections: [],
			experience: [],
			education: [],
			skills: [],
			projects: [],
			certifications: [],
			languages: [],
		};
		createResumeMock.mockResolvedValue({
			id: "resume-import",
			name: "Imported Person",
			templateId: "demo",
			lastModified: 456,
			isDefault: false,
			content,
		});

		await useResumeIndexStore
			.getState()
			.createResumeIndexEntry(
				"resume-import",
				"Imported Person",
				"demo",
				content,
			);

		expect(createResumeMock).toHaveBeenCalledWith(
			"resume-import",
			"Imported Person",
			"demo",
			content,
		);
	});

	it("strips metadata properties from content (such as id, name, templateId) when creating a resume", async () => {
		const contentWithMetadata = {
			id: "dummy",
			name: "Template Preview",
			activeSection: "personalInfo",
			templateId: "demo",
			personalInfo: {
				fullName: "Test Person",
				email: "",
				phone: "",
				location: "",
				contactLinks: [],
			},
			summary: "",
			sections: [],
			experience: [],
			education: [],
			skills: [],
			projects: [],
			certifications: [],
			languages: [],
		};

		createResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "Test Person",
			templateId: "demo",
			lastModified: 456,
			isDefault: false,
			content: {
				personalInfo: {
					fullName: "Test Person",
					email: "",
					phone: "",
					location: "",
					contactLinks: [],
				},
				summary: "",
				sections: [],
				experience: [],
				education: [],
				skills: [],
				projects: [],
				certifications: [],
				languages: [],
			},
		});

		await useResumeIndexStore
			.getState()
			.createResumeIndexEntry(
				"resume-1",
				"Test Person",
				"demo",
				contentWithMetadata as any,
			);

		expect(createResumeMock).toHaveBeenCalledOnce();
		const callArgs = createResumeMock.mock.calls[0];
		const sentContent = callArgs[3];
		expect(sentContent).not.toHaveProperty("id");
		expect(sentContent).not.toHaveProperty("name");
		expect(sentContent).not.toHaveProperty("activeSection");
		expect(sentContent).not.toHaveProperty("templateId");
	});

	it("sets and clears the default resume through the companion", async () => {
		setDefaultResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "Resume 1",
			templateId: "demo",
			lastModified: 100,
			isDefault: true,
			content: {},
		});
		clearDefaultResumeMock.mockResolvedValue({ ok: true });

		await useResumeIndexStore.getState().setDefaultResumeId("resume-1");
		expect(setDefaultResumeMock).toHaveBeenCalledWith("resume-1");
		expect(useResumeIndexStore.getState().defaultResumeId).toBe("resume-1");

		await useResumeIndexStore.getState().setDefaultResumeId(null);
		expect(clearDefaultResumeMock).toHaveBeenCalledOnce();
		expect(useResumeIndexStore.getState().defaultResumeId).toBeNull();
	});

	it("deletes a companion resume and clears the default when needed", async () => {
		deleteResumeMock.mockResolvedValue({ deleted: true });
		useResumeIndexStore.setState({
			resumes: [
				{
					id: "resume-1",
					name: "Resume 1",
					templateId: "modern",
					lastModified: 100,
				},
				{
					id: "resume-2",
					name: "Resume 2",
					templateId: "demo",
					lastModified: 200,
				},
			],
			defaultResumeId: "resume-1",
		});

		await useResumeIndexStore.getState().deleteResumeIndexEntry("resume-2");
		expect(deleteResumeMock).toHaveBeenCalledWith("resume-2");
		expect(useResumeIndexStore.getState().defaultResumeId).toBe("resume-1");
		expect(useResumeIndexStore.getState().resumes.map((r) => r.id)).toEqual([
			"resume-1",
		]);

		await useResumeIndexStore.getState().deleteResumeIndexEntry("resume-1");
		expect(deleteResumeMock).toHaveBeenCalledWith("resume-1");
		expect(useResumeIndexStore.getState().defaultResumeId).toBeNull();
		expect(useResumeIndexStore.getState().resumes).toEqual([]);
	});
});
