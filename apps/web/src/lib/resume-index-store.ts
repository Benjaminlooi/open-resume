import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { blankResumeState } from "./dummy-resume";
import {
	clearDefaultResume,
	createResume,
	deleteResume,
	listResumes,
	setDefaultResume,
	type ResumeContent,
} from "./local-companion-client";
import type { Resume } from "./resume-schema";

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

interface ResumeIndexState {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
	loadIndex: () => Promise<void>;
	setDefaultResumeId: (id: string | null) => Promise<void>;
	createResumeIndexEntry: (
		id: string,
		name: string,
		templateId: string,
		content?: Resume,
	) => Promise<void>;
	updateResumeIndexModified: (id: string) => void;
	deleteResumeIndexEntry: (id: string) => Promise<void>;
}

export const getInitialIndexState = (): {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
} => {
	return { resumes: [], defaultResumeId: null };
};

const toResumeContent = (content: Resume): ResumeContent =>
	content as unknown as ResumeContent;

export const useResumeIndexStore = create<ResumeIndexState>()(
	devtools(
		(set) => ({
			...getInitialIndexState(),
			loadIndex: async () => {
				const resumes = await listResumes();
				set(() => ({
					resumes: resumes.map(({ isDefault: _isDefault, ...resume }) => resume),
					defaultResumeId:
						resumes.find((resume) => resume.isDefault)?.id ?? null,
				}));
			},
			setDefaultResumeId: async (id) => {
				if (id) {
					await setDefaultResume(id);
				} else {
					await clearDefaultResume();
				}
				set(() => ({
					defaultResumeId: id,
				}));
			},
			createResumeIndexEntry: async (id, name, templateId, content) => {
				set((state) => ({
					resumes: state.resumes.some((resume) => resume.id === id)
						? state.resumes
						: [
								...state.resumes,
								{ id, name, templateId, lastModified: Date.now() },
							],
				}));
				try {
					const created = await createResume(
						id,
						name,
						templateId,
						toResumeContent(content ?? blankResumeState),
					);
					set((state) => ({
						resumes: state.resumes.map((resume) =>
							resume.id === id
								? {
										id: created.id,
										name: created.name,
										templateId: created.templateId,
										lastModified: created.lastModified,
									}
								: resume,
						),
					}));
				} catch (error) {
					set((state) => ({
						resumes: state.resumes.filter((resume) => resume.id !== id),
					}));
					throw error;
				}
			},
			updateResumeIndexModified: (id) =>
				set((state) => ({
					resumes: state.resumes.map((r) =>
						r.id === id ? { ...r, lastModified: Date.now() } : r,
					),
				})),
			deleteResumeIndexEntry: async (id) => {
				await deleteResume(id);
				set((state) => ({
					resumes: state.resumes.filter((r) => r.id !== id),
					defaultResumeId:
						state.defaultResumeId === id ? null : state.defaultResumeId,
				}));
			},
		}),
		{ name: "resume-index-store" },
	),
);
