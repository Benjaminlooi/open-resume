// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeIndexStore } from "./resume-index-store";

const resetStore = () => {
	useResumeIndexStore.setState({
		resumes: [],
		defaultResumeId: null,
	});
	localStorage.clear();
};

describe("resumeIndexStore", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-08T09:00:00Z"));
		resetStore();
	});

	it("persists the selected default resume", () => {
		useResumeIndexStore
			.getState()
			.createResumeIndexEntry("resume-1", "Primary", "demo");
		useResumeIndexStore.getState().setDefaultResumeId("resume-1");

		expect(useResumeIndexStore.getState().defaultResumeId).toBe("resume-1");
		expect(JSON.parse(localStorage.getItem("resume-index") ?? "{}")).toEqual({
			defaultResumeId: "resume-1",
			resumes: [
				{
					id: "resume-1",
					name: "Primary",
					templateId: "demo",
					lastModified: Date.now(),
				},
			],
		});
	});

	it("clears the default resume when the default is deleted", () => {
		useResumeIndexStore
			.getState()
			.createResumeIndexEntry("resume-1", "Primary", "demo");
		useResumeIndexStore
			.getState()
			.createResumeIndexEntry("resume-2", "Backup", "modern");
		useResumeIndexStore.getState().setDefaultResumeId("resume-1");

		useResumeIndexStore.getState().deleteResumeIndexEntry("resume-1");

		expect(useResumeIndexStore.getState().defaultResumeId).toBeNull();
		expect(useResumeIndexStore.getState().resumes).toHaveLength(1);
	});

	it("hydrates default resume ids from existing localStorage payloads", async () => {
		localStorage.setItem(
			"resume-index",
			JSON.stringify({
				defaultResumeId: "resume-2",
				resumes: [
					{
						id: "resume-2",
						name: "Stored",
						templateId: "demo",
						lastModified: 100,
					},
				],
			}),
		);

		vi.resetModules();
		const { useResumeIndexStore: hydratedStore } = await import(
			"./resume-index-store"
		);

		expect(hydratedStore.getState().defaultResumeId).toBe("resume-2");
		expect(hydratedStore.getState().resumes).toHaveLength(1);
	});
});
