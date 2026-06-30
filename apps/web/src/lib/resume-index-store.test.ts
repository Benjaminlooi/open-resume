import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearDefaultResume,
	createResume,
	deleteResume,
	listResumes,
	setDefaultResume,
} from "./local-backend-client";
import { useRootStore } from "./root-store";

vi.mock("./local-backend-client", () => ({
	clearDefaultResume: vi.fn(),
	createResume: vi.fn(),
	deleteResume: vi.fn(),
	getResume: vi.fn(),
	listResumes: vi.fn(),
	setDefaultResume: vi.fn(),
	updateResume: vi.fn(),
}));

const listResumesMock = vi.mocked(listResumes);
const createResumeMock = vi.mocked(createResume);
const deleteResumeMock = vi.mocked(deleteResume);
const setDefaultResumeMock = vi.mocked(setDefaultResume);
const clearDefaultResumeMock = vi.mocked(clearDefaultResume);

/**
 * These tests exercise the `resumeIndex` slice of the root store. State lives
 * at `state.resumeIndex`. To reset between tests we spread a clone of the
 * empty data over the live slice, preserving its action functions.
 */
const getIndexState = () => useRootStore.getState().resumeIndex;

const resetIndex = () => {
	useRootStore.setState((prev) => ({
		resumeIndex: { ...prev.resumeIndex, resumes: [], defaultResumeId: null },
	}));
};

describe("resumeIndex slice", () => {
	beforeEach(() => {
		resetIndex();
		vi.clearAllMocks();
	});

	it("initializes with empty resumes and null defaultResumeId by default", () => {
		const state = getIndexState();
		expect(state.resumes).toEqual([]);
		expect(state.defaultResumeId).toBeNull();
	});

	it("loads resume summaries from the backend and derives the default ID", async () => {
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

		await getIndexState().loadIndex();

		expect(listResumesMock).toHaveBeenCalledOnce();
		expect(getIndexState()).toMatchObject({
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
		expect(getIndexState().resumes[0]).not.toHaveProperty("isDefault");
	});

	it("creates a backend resume with blank content and stores the returned summary", async () => {
		createResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "My Resume",
			templateId: "modern",
			lastModified: 123,
			isDefault: false,
			content: {},
		});

		await getIndexState().createResumeIndexEntry("resume-1", "My Resume", "modern");

		expect(createResumeMock).toHaveBeenCalledWith(
			"resume-1",
			"My Resume",
			"modern",
			expect.objectContaining({
				personalInfo: expect.any(Object),
				sections: expect.any(Array),
			}),
		);
		expect(getIndexState().resumes).toEqual([
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

		void getIndexState().createResumeIndexEntry("resume-1", "My Resume", "modern");

		expect(getIndexState().resumes).toEqual([
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

		await getIndexState().createResumeIndexEntry(
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

		await getIndexState().createResumeIndexEntry(
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

	it("sets and clears the default resume through the backend", async () => {
		setDefaultResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "Resume 1",
			templateId: "demo",
			lastModified: 100,
			isDefault: true,
			content: {},
		});
		clearDefaultResumeMock.mockResolvedValue({ ok: true });

		await getIndexState().setDefaultResumeId("resume-1");
		expect(setDefaultResumeMock).toHaveBeenCalledWith("resume-1");
		expect(getIndexState().defaultResumeId).toBe("resume-1");

		await getIndexState().setDefaultResumeId(null);
		expect(clearDefaultResumeMock).toHaveBeenCalledOnce();
		expect(getIndexState().defaultResumeId).toBeNull();
	});

	it("deletes a backend resume and clears the default when needed", async () => {
		deleteResumeMock.mockResolvedValue({ deleted: true });
		useRootStore.setState((prev) => ({
			resumeIndex: {
				...prev.resumeIndex,
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
			},
		}));

		await getIndexState().deleteResumeIndexEntry("resume-2");
		expect(deleteResumeMock).toHaveBeenCalledWith("resume-2");
		expect(getIndexState().defaultResumeId).toBe("resume-1");
		expect(getIndexState().resumes.map((r) => r.id)).toEqual(["resume-1"]);

		await getIndexState().deleteResumeIndexEntry("resume-1");
		expect(deleteResumeMock).toHaveBeenCalledWith("resume-1");
		expect(getIndexState().defaultResumeId).toBeNull();
		expect(getIndexState().resumes).toEqual([]);
	});
});
