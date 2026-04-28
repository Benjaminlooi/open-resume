import { Store } from "@tanstack/store";

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

type ResumeIndexState = {
	resumes: ResumeIndexEntry[];
};

const getInitialIndexState = (): ResumeIndexState => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("resume-index");
		if (saved) {
			try {
				return JSON.parse(saved) as ResumeIndexState;
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
					resumes: [{
						id: legacyId,
						name: "Imported Resume",
						lastModified: Date.now(),
						templateId: parsedLegacy.templateId || "demo"
					}]
				};
			} catch (e) {}
		}
	}
	return { resumes: [] };
};

export const resumeIndexStore = new Store<ResumeIndexState>(getInitialIndexState());

if (typeof window !== "undefined") {
	resumeIndexStore.subscribe(() => {
		localStorage.setItem("resume-index", JSON.stringify(resumeIndexStore.state));
	});
}

export const createResumeIndexEntry = (id: string, name: string, templateId: string) => {
	resumeIndexStore.setState((state) => ({
		resumes: [
			...state.resumes,
			{ id, name, templateId, lastModified: Date.now() },
		],
	}));
};

export const updateResumeIndexModified = (id: string) => {
    resumeIndexStore.setState((state) => ({
        resumes: state.resumes.map(r => r.id === id ? { ...r, lastModified: Date.now() } : r)
    }));
};

export const deleteResumeIndexEntry = (id: string) => {
	resumeIndexStore.setState((state) => ({
		resumes: state.resumes.filter((r) => r.id !== id),
	}));
    if (typeof window !== "undefined") {
        localStorage.removeItem(`resume-${id}`);
    }
};