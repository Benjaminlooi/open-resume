import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsStore, updateAPIKey, setDefaultProvider } from './settings-store';

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    settingsStore.setState(() => ({
      apiKeys: {},
      defaultProvider: 'openai',
    }));
  });

  it('updates API key and default provider', () => {
    updateAPIKey('openai', 'sk-test');
    expect(settingsStore.state.apiKeys.openai).toBe('sk-test');
    
    setDefaultProvider('anthropic');
    expect(settingsStore.state.defaultProvider).toBe('anthropic');
  });
});