# AI LLM Provider Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement user-provided AI LLM API keys and a prompt-based generation flow using Neobrutalism UI components.

**Architecture:** Create a global store to persist API keys to `localStorage`. Add a global settings modal accessible from the header. Replace the current 1-click generation with a prompt modal that dynamically calls the selected AI provider using Vercel AI SDK.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-store`, `ai` (Vercel AI SDK), Neobrutalism UI (Tailwind + Shadcn).

---

### Task 1: Install Dependencies and Neobrutalism Components

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vercel AI SDK and provider packages**

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google lucide-react
```

- [ ] **Step 2: Install Neobrutalism components via shadcn CLI**

```bash
npx shadcn@latest add https://neobrutalism.dev/r/dialog.json https://neobrutalism.dev/r/input.json https://neobrutalism.dev/r/label.json https://neobrutalism.dev/r/select.json https://neobrutalism.dev/r/button.json https://neobrutalism.dev/r/textarea.json
```
*(Note: If the CLI prompts to overwrite existing components, accept it. These components require standard shadcn setup which should already be in place.)*

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json components.json src/components/ui
git commit -m "chore: add ai sdk and neobrutalism ui components"
```

### Task 2: Create the Settings Store

**Files:**
- Create: `src/lib/settings-store.ts`
- Create: `src/lib/settings-store.test.ts`

- [ ] **Step 1: Write the store unit test**

```typescript
// src/lib/settings-store.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/settings-store.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement the store**

```typescript
// src/lib/settings-store.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/settings-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings-store.ts src/lib/settings-store.test.ts
git commit -m "feat: create tanstack store for ai settings backed by localstorage"
```

### Task 3: Build the Global Settings Modal

**Files:**
- Create: `src/components/editor/GlobalSettingsModal.tsx`
- Modify: `src/components/editor/EditorHeader.tsx`

- [ ] **Step 1: Create the Modal Component**

```tsx
// src/components/editor/GlobalSettingsModal.tsx
import { Settings } from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { settingsStore, updateAPIKey, setDefaultProvider, type AIProvider } from "#/lib/settings-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Button } from "#/components/ui/button";

const PROVIDERS: { id: AIProvider; name: string }[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google (Gemini)" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "groq", name: "Groq" },
];

export function GlobalSettingsModal() {
  const { apiKeys, defaultProvider } = useStore(settingsStore);

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
            Configure your AI providers. API keys are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          
          <div className="grid gap-2 pt-4 border-t-2 border-border">
            <h4 className="font-heading text-sm font-bold">API Keys</h4>
            {PROVIDERS.map((p) => (
              <div key={p.id} className="grid gap-1">
                <Label htmlFor={`key-${p.id}`} className="text-xs">{p.name}</Label>
                <Input 
                  id={`key-${p.id}`}
                  type="password" 
                  placeholder={`Enter ${p.name} API Key`}
                  value={apiKeys[p.id] || ""}
                  onChange={(e) => updateAPIKey(p.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add the Modal to EditorHeader**

In `src/components/editor/EditorHeader.tsx`, add the import:
```tsx
import { GlobalSettingsModal } from "./GlobalSettingsModal";
```

Find the `<div className="flex items-center justify-end gap-4">` and insert the settings modal before the toggle theme button:
```tsx
              <Button onClick={handleDownloadPdf} className="gap-2">
                <Download className="size-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
              <GlobalSettingsModal />
              <Button size="icon">
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/GlobalSettingsModal.tsx src/components/editor/EditorHeader.tsx
git commit -m "feat: add global settings modal for ai api keys"
```

### Task 4: Rewrite the AI Logic to use Providers

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Rewrite AI generate logic**

Replace the dummy logic in `src/lib/ai.ts` with Vercel AI SDK integration that reads from the store.

```typescript
// src/lib/ai.ts
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
  const apiKey = state.apiKeys[activeProvider];

  if (!apiKey) {
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
      // DeepSeek provides an OpenAI-compatible API
      model = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" })("deepseek-chat");
      break;
    case "groq":
      // Groq provides an OpenAI-compatible API
      model = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })("llama3-8b-8192");
      break;
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
    throw new Error("Failed to generate content. Please check your API key and try again.");
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: implement multi-provider ai generation using ai-sdk"
```

### Task 5: Build the Prompt Input Modal

**Files:**
- Create: `src/components/editor/AIPromptModal.tsx`

- [ ] **Step 1: Create the AIPromptModal**

```tsx
// src/components/editor/AIPromptModal.tsx
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
  
  const { defaultProvider, apiKeys } = useStore(settingsStore);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(defaultProvider);

  const hasKey = !!apiKeys[selectedProvider];

  const handleGenerate = async () => {
    if (!hasKey) {
      setError(`No API key for ${selectedProvider}. Please add it in Global Settings first.`);
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
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm font-bold text-red-500 bg-red-100 p-2 border-2 border-red-500 rounded-base">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={() => setOpen(false)} disabled={isGenerating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !hasKey}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/AIPromptModal.tsx
git commit -m "feat: add AI prompt modal for generating specific content"
```

### Task 6: Integrate Prompt Modal into Experience Form

**Files:**
- Modify: `src/components/editor/ExperienceForm.tsx`

- [ ] **Step 1: Replace Generate Button**

In `src/components/editor/ExperienceForm.tsx`, replace the `handleGenerateBullets` logic and the button.

First, update imports:
Remove `import { generateExperienceBullets } from "#/lib/ai";`
Add `import { AIPromptModal } from "./AIPromptModal";`
Remove `import { Loader2 } from "lucide-react";` if it's unused.

Find the `ExperienceItem` component. Remove the `isGenerating` state and `handleGenerateBullets` function completely.

Replace the button JSX in `ExperienceItem`:
```tsx
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">
                  Description
                </label>
                <AIPromptModal 
                  role={exp.role || ""} 
                  company={exp.company || ""} 
                  onGenerate={(newBullets) => {
                    const currentDesc = exp.description || "";
                    const merged = currentDesc ? currentDesc + "<br/>" + newBullets : newBullets;
                    updateExperience(id, { description: merged });
                  }}
                />
              </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/ExperienceForm.tsx
git commit -m "feat: integrate AI prompt modal into experience form"
```
