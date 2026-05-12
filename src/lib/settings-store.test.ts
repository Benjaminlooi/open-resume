import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "./settings-store";

describe("settingsStore", () => {
	beforeEach(() => {
		// Reset store before each test
		useSettingsStore.setState({
			apiKeys: {},
			defaultProvider: "openai",
			baseUrls: {},
			selectedModels: {},
		});
	});

	it("updates API key and default provider", () => {
		useSettingsStore.getState().updateAPIKey("openai", "sk-test");
		expect(useSettingsStore.getState().apiKeys.openai).toBe("sk-test");

		useSettingsStore.getState().setDefaultProvider("anthropic");
		expect(useSettingsStore.getState().defaultProvider).toBe("anthropic");
	});

	it("updates base URL for a provider", () => {
		useSettingsStore
			.getState()
			.updateBaseUrl("ollama", "http://localhost:11434/v1");
		expect(useSettingsStore.getState().baseUrls.ollama).toBe(
			"http://localhost:11434/v1",
		);
	});

	it("updates selected model for a provider", () => {
		useSettingsStore.getState().updateSelectedModel("lmstudio", "mistral-7b");
		expect(useSettingsStore.getState().selectedModels.lmstudio).toBe(
			"mistral-7b",
		);
	});
});
