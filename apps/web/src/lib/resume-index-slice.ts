import type { StateCreator } from "zustand";
import type { RootState } from "./root-store";
import { blankResumeState } from "./dummy-resume";
import {
	clearDefaultResume,
	createResume,
	deleteResume,
	listResumes,
	setDefaultResume,
} from "./local-companion-client";
import { toResumeContent } from "./resume-slice";

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

export interface ResumeIndexSlice {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
	loadIndex: () => Promise<void>;
	setDefaultResumeId: (id: string | null) => Promise<void>;
	createResumeIndexEntry: (
		id: string,
		name: string,
		templateId: string,
		content?: any,
	) => Promise<void>;
	updateResumeIndexModified: (id: string) => void;
	deleteResumeIndexEntry: (id: string) => Promise<void>;
}

export const createResumeIndexSlice: StateCreator<
	RootState,
	[],
	[],
	ResumeIndexSlice
> = (set) => ({
	resumes: [],
	defaultResumeId: null,

	loadIndex: async () => {
		const resumes = await listResumes();
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: resumes.map(({ isDefault: _isDefault, ...resume }) => resume),
				defaultResumeId:
					resumes.find((resume) => resume.isDefault)?.id ?? null,
			},
		}));
	},

	setDefaultResumeId: async (id) => {
		if (id) {
			await setDefaultResume(id);
		} else {
			await clearDefaultResume();
		}
		set((state) => ({
			resumeIndex: { ...state.resumeIndex, defaultResumeId: id },
		}));
	},

	createResumeIndexEntry: async (id, name, templateId, content) => {
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: state.resumeIndex.resumes.some((resume) => resume.id === id)
					? state.resumeIndex.resumes
					: [
							...state.resumeIndex.resumes,
							{ id, name, templateId, lastModified: Date.now() },
						],
			},
		}));
		try {
			const created = await createResume(
				id,
				name,
				templateId,
				toResumeContent(content ?? blankResumeState),
			);
			set((state) => ({
				resumeIndex: {
					...state.resumeIndex,
					resumes: state.resumeIndex.resumes.map((resume) =>
						resume.id === id
							? {
									id: created.id,
									name: created.name,
									templateId: created.templateId,
									lastModified: created.lastModified,
								}
							: resume,
					),
				},
			}));
		} catch (error) {
			set((state) => ({
				resumeIndex: {
					...state.resumeIndex,
					resumes: state.resumeIndex.resumes.filter(
						(resume) => resume.id !== id,
					),
				},
			}));
			throw error;
		}
	},

	updateResumeIndexModified: (id) =>
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: state.resumeIndex.resumes.map((r) =>
					r.id === id ? { ...r, lastModified: Date.now() } : r,
				),
			},
		})),

	deleteResumeIndexEntry: async (id) => {
		await deleteResume(id);
		set((state) => ({
			resumeIndex: {
				...state.resumeIndex,
				resumes: state.resumeIndex.resumes.filter((r) => r.id !== id),
				defaultResumeId:
					state.resumeIndex.defaultResumeId === id
						? null
						: state.resumeIndex.defaultResumeId,
			},
		}));
	},
});
