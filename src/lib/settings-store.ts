import { Store } from "@tanstack/react-store";

export type AIProvider = "openai" | "anthropic" | "google" | "deepseek" | "groq" | "ollama" | "lmstudio";

export interface SettingsState {
  apiKeys: Partial<Record<AIProvider, string>>;
  defaultProvider: AIProvider;
  baseUrls: Partial<Record<AIProvider, string>>;
  selectedModels: Partial<Record<AIProvider, string>>;
}

const getInitialState = (): SettingsState => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("resume-builder-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          apiKeys: parsed.apiKeys || {},
          defaultProvider: parsed.defaultProvider || "openai",
          baseUrls: parsed.baseUrls || {},
          selectedModels: parsed.selectedModels || {}
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
    selectedModels: {}
  };
};

export const settingsStore = new Store<SettingsState>(getInitialState());

settingsStore.subscribe(() => {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      "resume-builder-settings",
      JSON.stringify(settingsStore.state)
    );
  }
});

export const updateAPIKey = (provider: AIProvider, key: string) => {
  settingsStore.setState((state) => ({
    ...state,
    apiKeys: { ...state.apiKeys, [provider]: key },
  }));
};

export const setDefaultProvider = (provider: AIProvider) => {
  settingsStore.setState((state) => ({
    ...state,
    defaultProvider: provider,
  }));
};

export const updateBaseUrl = (provider: AIProvider, url: string) => {
  settingsStore.setState((state) => ({
    ...state,
    baseUrls: { ...state.baseUrls, [provider]: url },
  }));
};

export const updateSelectedModel = (provider: AIProvider, model: string) => {
  settingsStore.setState((state) => ({
    ...state,
    selectedModels: { ...state.selectedModels, [provider]: model },
  }));
};
