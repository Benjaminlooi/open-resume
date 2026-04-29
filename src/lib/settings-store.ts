import { Store } from "@tanstack/react-store";

export type AIProvider = "openai" | "anthropic" | "google" | "deepseek" | "groq";

export interface SettingsState {
  apiKeys: Partial<Record<AIProvider, string>>;
  defaultProvider: AIProvider;
}

const getInitialState = (): SettingsState => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("resume-builder-settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }
  return {
    apiKeys: {},
    defaultProvider: "openai",
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
