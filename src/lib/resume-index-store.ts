import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

interface ResumeIndexState {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
	createResumeIndexEntry: (
		id: string,
		name: string,
		templateId: string,
	) => void;
	updateResumeIndexModified: (id: string) => void;
	deleteResumeIndexEntry: (id: string) => void;
	setDefaultResumeId: (id: string | null) => void;
}

const getInitialIndexState = (): {
	resumes: ResumeIndexEntry[];
	defaultResumeId: string | null;
} => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("resume-index");
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as {
					resumes?: ResumeIndexEntry[];
					defaultResumeId?: string | null;
				};
				return {
					resumes: parsed.resumes ?? [],
					defaultResumeId: parsed.defaultResumeId ?? null,
				};
			} catch (e) {
				console.error("Failed to parse resume index", e);
			}
		}

		// Migration for existing single resume
		const legacySaved = localStorage.getItem("resume-builder-state");
		if (legacySaved) {
			try {
				const parsedLegacy = JSON.parse(legacySaved);
				const legacyId = "default";
				localStorage.setItem(`resume-${legacyId}`, legacySaved);
				return {
					defaultResumeId: legacyId,
					resumes: [
						{
							id: legacyId,
							name: "Imported Resume",
							lastModified: Date.now(),
							templateId: parsedLegacy.templateId || "demo",
						},
					],
				};
			} catch (_e) {}
		}
	}
	return { resumes: [], defaultResumeId: null };
};

export const useResumeIndexStore = create<ResumeIndexState>()(
	devtools(
		(set) => ({
			...getInitialIndexState(),
			createResumeIndexEntry: (id, name, templateId) => {
				return set((state) => ({
					resumes: [
						...state.resumes,
						{ id, name, templateId, lastModified: Date.now() },
					],
				}));
			},
			updateResumeIndexModified: (id) =>
				set((state) => ({
					resumes: state.resumes.map((r) =>
						r.id === id ? { ...r, lastModified: Date.now() } : r,
					),
				})),
			deleteResumeIndexEntry: (id) =>
				set((state) => {
					if (typeof window !== "undefined") {
						localStorage.removeItem(`resume-${id}`);
					}
					return {
						resumes: state.resumes.filter((r) => r.id !== id),
						defaultResumeId:
							state.defaultResumeId === id ? null : state.defaultResumeId,
					};
				}),
			setDefaultResumeId: (id) =>
				set((state) => ({
					defaultResumeId:
						id && state.resumes.some((resume) => resume.id === id) ? id : null,
				})),
		}),
		{ name: "resume-index-store" },
	),
);

if (typeof window !== "undefined") {
	useResumeIndexStore.subscribe((state) => {
		const { resumes, defaultResumeId } = state;
		localStorage.setItem(
			"resume-index",
			JSON.stringify({ resumes, defaultResumeId }),
		);
	});
}
