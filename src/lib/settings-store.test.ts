import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsStore, updateAPIKey, setDefaultProvider, updateBaseUrl, updateSelectedModel } from './settings-store';

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    settingsStore.setState(() => ({
      apiKeys: {},
      defaultProvider: 'openai',
      baseUrls: {},
      selectedModels: {}
    }));
  });

  it('updates API key and default provider', () => {
    updateAPIKey('openai', 'sk-test');
    expect(settingsStore.state.apiKeys.openai).toBe('sk-test');
    
    setDefaultProvider('anthropic');
    expect(settingsStore.state.defaultProvider).toBe('anthropic');
  });

  it('updates base URL for a provider', () => {
    updateBaseUrl('ollama', 'http://localhost:11434/v1');
    expect(settingsStore.state.baseUrls['ollama']).toBe('http://localhost:11434/v1');
  });

  it('updates selected model for a provider', () => {
    updateSelectedModel('lmstudio', 'mistral-7b');
    expect(settingsStore.state.selectedModels['lmstudio']).toBe('mistral-7b');
  });
});
