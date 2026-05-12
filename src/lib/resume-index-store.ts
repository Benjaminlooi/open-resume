import { create } from "zustand";

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

interface ResumeIndexState {
	resumes: ResumeIndexEntry[];
	createResumeIndexEntry: (
		id: string,
		name: string,
		templateId: string,
	) => void;
	updateResumeIndexModified: (id: string) => void;
	deleteResumeIndexEntry: (id: string) => void;
}

const getInitialIndexState = (): { resumes: ResumeIndexEntry[] } => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("resume-index");
		if (saved) {
			try {
				return JSON.parse(saved) as { resumes: ResumeIndexEntry[] };
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
	return { resumes: [] };
};

export const useResumeIndexStore = create<ResumeIndexState>((set) => ({
	...getInitialIndexState(),
	createResumeIndexEntry: (id, name, templateId) =>
		set((state) => ({
			resumes: [
				...state.resumes,
				{ id, name, templateId, lastModified: Date.now() },
			],
		})),
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
			return { resumes: state.resumes.filter((r) => r.id !== id) };
		}),
}));

if (typeof window !== "undefined") {
	useResumeIndexStore.subscribe((state) => {
		const { resumes } = state;
		localStorage.setItem("resume-index", JSON.stringify({ resumes }));
	});
}
