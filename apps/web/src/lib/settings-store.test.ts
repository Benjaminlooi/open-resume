import { beforeEach, describe, expect, it } from "vitest";
import { useRootStore } from "./root-store";

/**
 * These tests exercise the `settings` slice of the root store. State lives at
 * `state.settings`. To reset between tests we spread a clone of the default
 * data over the live slice, preserving its action functions.
 */
const getSettingsState = () => useRootStore.getState().settings;

const resetSettings = () => {
	useRootStore.setState((prev) => ({
		settings: {
			...prev.settings,
			apiKeys: {},
			defaultProvider: "openai",
			baseUrls: {},
			selectedModels: {},
		},
	}));
};

describe("settings slice", () => {
	beforeEach(() => {
		resetSettings();
	});

	it("updates API key and default provider", () => {
		getSettingsState().updateAPIKey("openai", "sk-test");
		expect(getSettingsState().apiKeys.openai).toBe("sk-test");

		getSettingsState().setDefaultProvider("anthropic");
		expect(getSettingsState().defaultProvider).toBe("anthropic");
	});

	it("updates base URL for a provider", () => {
		getSettingsState().updateBaseUrl("ollama", "http://localhost:11434/v1");
		expect(getSettingsState().baseUrls.ollama).toBe(
			"http://localhost:11434/v1",
		);
	});

	it("updates selected model for a provider", () => {
		getSettingsState().updateSelectedModel("lmstudio", "mistral-7b");
		expect(getSettingsState().selectedModels.lmstudio).toBe("mistral-7b");
	});
});
