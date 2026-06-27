// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRootStore } from "./root-store";
import { updateResume } from "./local-companion-client";
import { useResumeAutoSave } from "./use-resume-auto-save";

(
	globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Mock companion client
vi.mock("./local-companion-client", () => ({
	getResume: vi.fn(),
	updateResume: vi.fn(),
}));

const updateResumeMock = vi.mocked(updateResume);

function TestComponent() {
	useResumeAutoSave();
	return <div data-testid="test-component" />;
}

describe("useResumeAutoSave hook", () => {
	let container: HTMLDivElement | null = null;
	let root: any = null;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.clearAllTimers();

		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
		
		// Setup mock store values
		useRootStore.setState((prev) => ({
			resume: {
				...prev.resume,
				id: "resume-1",
				name: "Old Name",
				templateId: "demo",
				loadResume: vi.fn().mockResolvedValue(true),
			},
		}));
		
		updateResumeMock.mockResolvedValue({
			id: "resume-1",
			name: "New Name",
			templateId: "demo",
			lastModified: 1,
			isDefault: false,
			content: {},
		});
	});

	afterEach(() => {
		if (container) {
			document.body.removeChild(container);
			container = null;
		}
		if (root) {
			root.unmount();
			root = null;
		}
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("subscribes on mount and debounces companion saves when resume name changes", async () => {
		await act(async () => {
			root.render(<TestComponent />);
		});

		// Trigger resume change
		act(() => {
			useRootStore.getState().resume.updateResumeName("New Name");
		});

		expect(updateResumeMock).not.toHaveBeenCalled();

		// Advance timers by 500ms for debounced save
		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});

		expect(updateResumeMock).toHaveBeenCalledOnce();
		expect(updateResumeMock).toHaveBeenCalledWith(
			"resume-1",
			expect.objectContaining({
				name: "New Name",
				templateId: "demo",
			})
		);
	});

	it("unsubscribes and flushes pending changes immediately on unmount", async () => {
		await act(async () => {
			root.render(<TestComponent />);
		});

		// Trigger resume change
		act(() => {
			useRootStore.getState().resume.updateResumeName("Another Name");
		});

		expect(updateResumeMock).not.toHaveBeenCalled();

		// Unmount while timer is pending
		await act(async () => {
			root.unmount();
			root = null; // Prevent afterEach from unmounting again
		});

		// updateResume should have been called immediately during unmount cleanup
		expect(updateResumeMock).toHaveBeenCalledOnce();
		expect(updateResumeMock).toHaveBeenCalledWith(
			"resume-1",
			expect.objectContaining({
				name: "Another Name",
				templateId: "demo",
			})
		);
	});
});
