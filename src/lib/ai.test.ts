import { generateText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateExperienceBullets } from './ai';
import { settingsStore } from './settings-store';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mock-openai-model')),
}));

describe('generateExperienceBullets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.setState(() => ({
      apiKeys: {},
      defaultProvider: 'openai',
      baseUrls: {},
      selectedModels: {}
    }));
  });

  it('throws an error if no API key is configured', async () => {
    await expect(generateExperienceBullets({
      role: 'Engineer',
      company: 'Tech',
      instructions: 'Make it good'
    })).rejects.toThrow('No API key configured for openai');
  });

  it('calls generateText with the correct prompt when API key is present', async () => {
    settingsStore.setState(() => ({
      apiKeys: { openai: 'test-key' },
      defaultProvider: 'openai',
      baseUrls: {},
      selectedModels: {}
    }));

    vi.mocked(generateText).mockResolvedValue({ text: '<ul><li>Did things</li></ul>' } as any);

    const result = await generateExperienceBullets({
      role: 'Engineer',
      company: 'Tech',
      instructions: 'Focus on scaling'
    });

    expect(result).toBe('<ul><li>Did things</li></ul>');
    expect(generateText).toHaveBeenCalled();
    const callArgs = vi.mocked(generateText).mock.calls[0][0];
    expect(callArgs.prompt).toContain('Engineer');
    expect(callArgs.prompt).toContain('Tech');
    expect(callArgs.prompt).toContain('Focus on scaling');
  });

  it('cleans up markdown html blocks from the response', async () => {
    settingsStore.setState(() => ({
      apiKeys: { openai: 'test-key' },
      defaultProvider: 'openai',
      baseUrls: {},
      selectedModels: {}
    }));

    vi.mocked(generateText).mockResolvedValue({ text: '```html\n<ul><li>Item</li></ul>\n```' } as any);

    const result = await generateExperienceBullets({
      role: 'Engineer',
      company: 'Tech',
      instructions: ''
    });

    expect(result).toBe('<ul><li>Item</li></ul>');
  });
  
  it('throws an error for local providers if baseUrl or model is missing', async () => {
    settingsStore.setState(() => ({
      apiKeys: {},
      defaultProvider: 'ollama',
      baseUrls: {},
      selectedModels: {}
    }));

    await expect(generateExperienceBullets({
      role: 'Engineer',
      company: 'Tech',
      instructions: ''
    })).rejects.toThrow('Base URL and Model must be configured for ollama.');
  });
});
