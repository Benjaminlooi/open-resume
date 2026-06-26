import type { StateCreator } from "zustand";
import type { RootState } from "./root-store";

export type AIProvider =
	| "openai"
	| "anthropic"
	| "google"
	| "deepseek"
	| "groq"
	| "ollama"
	| "lmstudio";

export interface SettingsSlice {
	apiKeys: Partial<Record<AIProvider, string>>;
	defaultProvider: AIProvider;
	baseUrls: Partial<Record<AIProvider, string>>;
	selectedModels: Partial<Record<AIProvider, string>>;
	updateAPIKey: (provider: AIProvider, key: string) => void;
	setDefaultProvider: (provider: AIProvider) => void;
	updateBaseUrl: (provider: AIProvider, url: string) => void;
	updateSelectedModel: (provider: AIProvider, model: string) => void;
}

export const SETTINGS_STORAGE_KEY = "resume-builder-settings";

export const getInitialSettings = (): Pick<
	SettingsSlice,
	"apiKeys" | "defaultProvider" | "baseUrls" | "selectedModels"
> => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
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

export const createSettingsSlice: StateCreator<
	RootState,
	[],
	[],
	SettingsSlice
> = (set) => ({
	...getInitialSettings(),

	updateAPIKey: (provider, key) =>
		set((state) => ({
			settings: {
				...state.settings,
				apiKeys: { ...state.settings.apiKeys, [provider]: key },
			},
		})),

	setDefaultProvider: (provider) =>
		set((state) => ({
			settings: { ...state.settings, defaultProvider: provider },
		})),

	updateBaseUrl: (provider, url) =>
		set((state) => ({
			settings: {
				...state.settings,
				baseUrls: { ...state.settings.baseUrls, [provider]: url },
			},
		})),

	updateSelectedModel: (provider, model) =>
		set((state) => ({
			settings: {
				...state.settings,
				selectedModels: { ...state.settings.selectedModels, [provider]: model },
			},
		})),
});
