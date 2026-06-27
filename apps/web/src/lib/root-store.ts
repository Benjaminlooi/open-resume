import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { getResume } from "./local-companion-client";
import type { EditorState } from "./resume-schema";
import {
	createResumeSlice,
	normalizeEditorState,
	type ResumeSlice,
} from "./resume-slice";
import {
	createResumeIndexSlice,
	type ResumeIndexSlice,
} from "./resume-index-slice";
import {
	createJobApplicationSlice,
	type JobApplicationSlice,
} from "./job-application-slice";
import {
	createJobPostingSlice,
	type JobPostingSlice,
} from "./job-posting-slice";
import { createAISlice, type AISlice } from "./ai-slice";

/**
 * Root store.
 *
 * All app state lives in ONE Zustand store so that Redux DevTools shows a
 * single instance with a unified action timeline. Each domain is authored as
 * a slice (a `StateCreator` operating on the root state) in its own dedicated
 * file. Components select narrowly (e.g. `useRootStore((s) => s.resume.experience)`)
 * so updates to one slice never re-render components that only read another.
 */

export interface RootState {
	resume: ResumeSlice;
	resumeIndex: ResumeIndexSlice;
	jobApplication: JobApplicationSlice;
	jobPosting: JobPostingSlice;
	ai: AISlice;
}

// Re-export slice interfaces and types for external consumers.
export type { ResumeSlice } from "./resume-slice";
export { AVAILABLE_SECTIONS, AVAILABLE_TEMPLATES } from "./resume-slice";
export type { ResumeIndexSlice, ResumeIndexEntry } from "./resume-index-slice";
export type { JobApplicationSlice } from "./job-application-slice";
export type { JobPostingSlice } from "./job-posting-slice";
export type { AISlice, Message } from "./ai-slice";

export const useRootStore = create<RootState>()(
	devtools(
		(...a) => ({
			resume: createResumeSlice(...a),
			resumeIndex: createResumeIndexSlice(...a),
			jobApplication: createJobApplicationSlice(...a),
			jobPosting: createJobPostingSlice(...a),
			ai: createAISlice(...a),
		}),
		{ name: "resume-builder" },
	),
);

// ---------------------------------------------------------------------------
// Helper: fetch a resume's EditorState, returning the in-memory slice if it is
// already the active document.
// ---------------------------------------------------------------------------
export const getResumeData = async (
	id: string,
): Promise<EditorState | null> => {
	const state = useRootStore.getState();
	if (state.resume.id === id) {
		return state.resume;
	}
	try {
		const resume = await getResume(id);
		return normalizeEditorState(
			resume.id,
			resume.name,
			resume.templateId,
			resume.content,
		);
	} catch (e) {
		console.error("Failed to fetch resume data", e);
		return null;
	}
};


