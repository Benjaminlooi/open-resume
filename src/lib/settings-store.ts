import { create } from "zustand";

export type AIProvider =
	| "openai"
	| "anthropic"
	| "google"
	| "deepseek"
	| "groq"
	| "ollama"
	| "lmstudio";

export interface SettingsState {
	apiKeys: Partial<Record<AIProvider, string>>;
	defaultProvider: AIProvider;
	baseUrls: Partial<Record<AIProvider, string>>;
	selectedModels: Partial<Record<AIProvider, string>>;
	// Actions
	updateAPIKey: (provider: AIProvider, key: string) => void;
	setDefaultProvider: (provider: AIProvider) => void;
	updateBaseUrl: (provider: AIProvider, url: string) => void;
	updateSelectedModel: (provider: AIProvider, model: string) => void;
}

const getInitialState = (): Omit<
	SettingsState,
	| "updateAPIKey"
	| "setDefaultProvider"
	| "updateBaseUrl"
	| "updateSelectedModel"
> => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("resume-builder-settings");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return {
					apiKeys: parsed.apiKeys || {},
					defaultProvider: parsed.defaultProvider || "openai",
					baseUrls: parsed.baseUrls || {},
					selectedModels: parsed.selectedModels || {},
				};
			} catch (e) {
				console.error("Failed to parse settings", e);
			}
		}
	}
	return {
		apiKeys: {},
		defaultProvider: "openai",
		baseUrls: {},
		selectedModels: {},
	};
};

export const useSettingsStore = create<SettingsState>((set) => ({
	...getInitialState(),
	updateAPIKey: (provider, key) =>
		set((state) => ({
			apiKeys: { ...state.apiKeys, [provider]: key },
		})),
	setDefaultProvider: (provider) =>
		set({
			defaultProvider: provider,
		}),
	updateBaseUrl: (provider, url) =>
		set((state) => ({
			baseUrls: { ...state.baseUrls, [provider]: url },
		})),
	updateSelectedModel: (provider, model) =>
		set((state) => ({
			selectedModels: { ...state.selectedModels, [provider]: model },
		})),
}));

// Persistence subscription
if (typeof window !== "undefined") {
	useSettingsStore.subscribe((state) => {
		const {
			updateAPIKey,
			setDefaultProvider,
			updateBaseUrl,
			updateSelectedModel,
			...data
		} = state;
		localStorage.setItem("resume-builder-settings", JSON.stringify(data));
	});
}
