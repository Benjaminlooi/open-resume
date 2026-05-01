# Local AI Models Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add support for generating resume bullet points using local AI models via Ollama and LM Studio.

**Architecture:** Extend the existing `settingsStore` to hold base URLs and selected models for local providers. Update the UI to allow configuring these, including fetching available models from the local API. Finally, modify the AI generation function to use the `@ai-sdk/openai` client pointing to the custom local endpoints.

**Tech Stack:** React, TypeScript, TanStack Store, AI SDK.

---

### Task 1: Update Settings Store State and Actions

**Files:**
- Modify: `src/lib/settings-store.ts`
- Modify: `src/lib/settings-store.test.ts`

- [ ] **Step 1: Write the failing tests for settings store**

Modify `src/lib/settings-store.test.ts` to add tests for the new fields and actions.

```typescript
import { expect, test, describe, beforeEach } from "vitest";
import { settingsStore, updateBaseUrl, updateSelectedModel, type AIProvider } from "./settings-store";

describe("settingsStore local AI extensions", () => {
  beforeEach(() => {
    // Reset store
    settingsStore.setState(() => ({
      apiKeys: {},
      defaultProvider: "openai",
      baseUrls: {},
      selectedModels: {}
    }));
  });

  test("should update base URL for a provider", () => {
    updateBaseUrl("ollama", "http://localhost:11434/v1");
    expect(settingsStore.state.baseUrls["ollama"]).toBe("http://localhost:11434/v1");
  });

  test("should update selected model for a provider", () => {
    updateSelectedModel("lmstudio", "mistral-7b");
    expect(settingsStore.state.selectedModels["lmstudio"]).toBe("mistral-7b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/settings-store.test.ts`
Expected: FAIL due to missing `updateBaseUrl` and `updateSelectedModel` exports and types.

- [ ] **Step 3: Write minimal implementation**

Modify `src/lib/settings-store.ts` to include the new types and actions.

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/settings-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `git add src/lib/settings-store.ts src/lib/settings-store.test.ts && git commit -m "feat: add local AI provider configuration to settings store"`

---

### Task 2: Update AI Generation Logic

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Write implementation**

Modify `src/lib/ai.ts` to handle local providers.

```typescript
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { settingsStore, type AIProvider } from "./settings-store";

interface GenerateParams {
  role: string;
  company: string;
  instructions: string;
  providerId?: AIProvider;
}

export async function generateExperienceBullets({
  role,
  company,
  instructions,
  providerId,
}: GenerateParams): Promise<string> {
  const state = settingsStore.state;
  const activeProvider = providerId || state.defaultProvider;
  const isLocal = activeProvider === "ollama" || activeProvider === "lmstudio";
  
  const apiKey = isLocal ? "dummy-key" : state.apiKeys[activeProvider];

  if (!apiKey && !isLocal) {
    throw new Error(`No API key configured for ${activeProvider}. Please add it in settings.`);
  }

  let model;

  switch (activeProvider) {
    case "openai":
      model = createOpenAI({ apiKey })("gpt-4o-mini");
      break;
    case "anthropic":
      model = createAnthropic({ apiKey })("claude-3-5-haiku-latest");
      break;
    case "google":
      model = createGoogleGenerativeAI({ apiKey })("gemini-1.5-flash");
      break;
    case "deepseek":
      model = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" })("deepseek-chat");
      break;
    case "groq":
      model = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })("llama3-8b-8192");
      break;
    case "ollama":
    case "lmstudio": {
      const baseUrl = state.baseUrls[activeProvider];
      const selectedModel = state.selectedModels[activeProvider];
      if (!baseUrl || !selectedModel) {
         throw new Error(`Base URL and Model must be configured for ${activeProvider}.`);
      }
      model = createOpenAI({ apiKey: "dummy-key", baseURL: baseUrl })(selectedModel);
      break;
    }
    default:
      throw new Error(`Unsupported provider: ${activeProvider}`);
  }

  const prompt = `
You are an expert resume writer.
Write 3-5 impressive, quantifiable bullet points for an experience section on a resume.
Role: ${role || "Professional"}
Company: ${company || "A Company"}
Additional Instructions from User: ${instructions}

Format the output strictly as HTML <ul> and <li> tags. Do not include markdown code block formatting (like \`\`\`html), just the raw tags.
`;

  try {
    const { text } = await generateText({
      model,
      prompt,
    });
    
    // Clean up potential markdown block artifacts
    return text.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate content. Please check your configuration and try again.");
  }
}
```

- [ ] **Step 2: Check TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

Run: `git add src/lib/ai.ts && git commit -m "feat: add support for local AI providers in generation logic"`

---

### Task 3: Update Global Settings Modal

**Files:**
- Modify: `src/components/editor/GlobalSettingsModal.tsx`

- [ ] **Step 1: Write implementation**

Modify `src/components/editor/GlobalSettingsModal.tsx` to handle local provider configuration and fetching models.

```tsx
import { Settings, Loader2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { settingsStore, updateAPIKey, setDefaultProvider, updateBaseUrl, updateSelectedModel, type AIProvider } from "#/lib/settings-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Button } from "#/components/ui/button";

const PROVIDERS: { id: AIProvider; name: string; isLocal?: boolean; defaultUrl?: string }[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google (Gemini)" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "groq", name: "Groq" },
  { id: "ollama", name: "Ollama", isLocal: true, defaultUrl: "http://localhost:11434/v1" },
  { id: "lmstudio", name: "LM Studio", isLocal: true, defaultUrl: "http://localhost:1234/v1" },
];

export function GlobalSettingsModal() {
  const { apiKeys, defaultProvider, baseUrls, selectedModels } = useStore(settingsStore);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const handleFetchModels = async (provider: AIProvider, url: string) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch(`${url}/models`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        setAvailableModels(data.data.map((m: any) => m.id));
      } else {
        throw new Error("Invalid response format from models endpoint.");
      }
    } catch (err: any) {
      console.error(err);
      setFetchError("Failed to fetch models. Check if the server is running and CORS is enabled.");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="neutral" size="icon" className="h-10 w-10">
          <Settings className="size-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your AI providers. API keys and URLs are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="default-provider">Default Provider</Label>
            <Select value={defaultProvider} onValueChange={(val) => setDefaultProvider(val as AIProvider)}>
              <SelectTrigger id="default-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 pt-4 border-t-2 border-border">
            <h4 className="font-heading text-sm font-bold">Provider Configuration</h4>
            {PROVIDERS.map((p) => {
              if (p.isLocal) {
                const currentUrl = baseUrls[p.id] || p.defaultUrl || "";
                return (
                  <div key={p.id} className="grid gap-2 border p-3 rounded-md">
                    <Label className="font-bold">{p.name}</Label>
                    <div className="grid gap-1">
                      <Label htmlFor={`url-${p.id}`} className="text-xs">Base URL</Label>
                      <Input 
                        id={`url-${p.id}`}
                        placeholder={`e.g. ${p.defaultUrl}`}
                        value={baseUrls[p.id] !== undefined ? baseUrls[p.id] : (p.defaultUrl || "")}
                        onChange={(e) => updateBaseUrl(p.id, e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2 items-start mt-2">
                      <Button 
                        size="sm" 
                        variant="neutral"
                        onClick={() => handleFetchModels(p.id, currentUrl)}
                        disabled={isFetching}
                      >
                        {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Fetch Models
                      </Button>
                      {fetchError && <p className="text-xs text-red-500 font-medium">{fetchError}</p>}
                      <p className="text-[10px] text-muted-foreground">Requires CORS enabled on your local instance.</p>
                    </div>
                    {(availableModels.length > 0 || selectedModels[p.id]) && (
                      <div className="grid gap-1 mt-2">
                        <Label htmlFor={`model-${p.id}`} className="text-xs">Selected Model</Label>
                        <Select 
                          value={selectedModels[p.id] || ""} 
                          onValueChange={(val) => updateSelectedModel(p.id, val)}
                        >
                          <SelectTrigger id={`model-${p.id}`}>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                            {!availableModels.includes(selectedModels[p.id] || "") && selectedModels[p.id] && (
                              <SelectItem value={selectedModels[p.id] as string}>{selectedModels[p.id]}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={p.id} className="grid gap-1">
                  <Label htmlFor={`key-${p.id}`} className="text-xs">{p.name} API Key</Label>
                  <Input 
                    id={`key-${p.id}`}
                    type="password" 
                    placeholder={`Enter ${p.name} API Key`}
                    value={apiKeys[p.id] || ""}
                    onChange={(e) => updateAPIKey(p.id, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Check TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

Run: `git add src/components/editor/GlobalSettingsModal.tsx && git commit -m "feat: add local models configuration to settings modal"`

---

### Task 4: Update AI Prompt Modal Validation

**Files:**
- Modify: `src/components/editor/AIPromptModal.tsx`

- [ ] **Step 1: Write implementation**

Modify `src/components/editor/AIPromptModal.tsx` to handle validation for local providers and include them in the dropdown.

```tsx
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { settingsStore, type AIProvider } from "#/lib/settings-store";
import { generateExperienceBullets } from "#/lib/ai";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Button } from "#/components/ui/button";

interface AIPromptModalProps {
  role: string;
  company: string;
  onGenerate: (text: string) => void;
}

export function AIPromptModal({ role, company, onGenerate }: AIPromptModalProps) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { defaultProvider, apiKeys, baseUrls, selectedModels } = useStore(settingsStore);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(defaultProvider);

  const isLocal = selectedProvider === "ollama" || selectedProvider === "lmstudio";
  
  const hasKeyOrConfig = isLocal 
    ? (!!baseUrls[selectedProvider] && !!selectedModels[selectedProvider])
    : !!apiKeys[selectedProvider];

  const handleGenerate = async () => {
    if (!hasKeyOrConfig) {
      if (isLocal) {
        setError(`Base URL and Selected Model must be configured for ${selectedProvider} in Global Settings.`);
      } else {
        setError(`No API key for ${selectedProvider}. Please add it in Global Settings first.`);
      }
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateExperienceBullets({
        role,
        company,
        instructions,
        providerId: selectedProvider,
      });
      onGenerate(result);
      setOpen(false);
      setInstructions("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {      
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm" className="h-8 gap-2">
          <Sparkles className="size-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Resume Bullets</DialogTitle>
          <DialogDescription>
            Provide specific instructions on what to highlight for your role at {company || "this company"}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea 
              id="instructions"
              placeholder="e.g. Focus on my leadership skills and how I increased revenue by 20%..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="h-24"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-override">Provider</Label>
            <Select value={selectedProvider} onValueChange={(val) => setSelectedProvider(val as AIProvider)}>
              <SelectTrigger id="provider-override">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
                <SelectItem value="lmstudio">LM Studio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm font-bold text-red-500 bg-red-100 p-2 border-2 border-red-500 rounded-base">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={() => setOpen(false)} disabled={isGenerating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !hasKeyOrConfig}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Check TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

Run: `git add src/components/editor/AIPromptModal.tsx && git commit -m "feat: add local providers to AI prompt modal"`
