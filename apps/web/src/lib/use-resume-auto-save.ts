import { useEffect } from "react";
import { useRootStore } from "./root-store";
import { updateResume } from "./local-backend-client";
import {
	getIsLoadingResume,
	getSaveTimer,
	setSaveTimer,
	toResumeContent,
} from "./resume-slice";

/**
 * Custom React hook that automatically saves changes in the active resume
 * state to the backend daemon's database. It is debounced by 500ms
 * and only saves when the resume slice itself has actually changed.
 */
export function useResumeAutoSave() {
	useEffect(() => {
		let prevResume = useRootStore.getState().resume;

		const unsubscribe = useRootStore.subscribe((state) => {
			const resume = state.resume;
			// Reference equality check prevents saving when other slices change
			if (resume === prevResume) return;
			prevResume = resume;

			if (!resume.id || getIsLoadingResume()) return;

			const saveTimer = getSaveTimer();
			if (saveTimer) {
				clearTimeout(saveTimer);
			}

			const newTimer = setTimeout(() => {
				updateResume(resume.id, {
					name: resume.name,
					templateId: resume.templateId,
					content: toResumeContent(resume),
				}).catch((error) => {
					console.error("Failed to save resume", error);
				});
			}, 500);
			setSaveTimer(newTimer);
		});

		return () => {
			unsubscribe();
			const saveTimer = getSaveTimer();
			if (saveTimer) {
				clearTimeout(saveTimer);
				setSaveTimer(null);
				
				// Flush any pending changes immediately upon unmounting/navigating away
				const resume = useRootStore.getState().resume;
				if (resume.id && !getIsLoadingResume()) {
					updateResume(resume.id, {
						name: resume.name,
						templateId: resume.templateId,
						content: toResumeContent(resume),
					}).catch((error) => {
						console.error("Failed to save resume on unmount", error);
					});
				}
			}
		};
	}, []);
}
