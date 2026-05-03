# Interactive AI Generation Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a wider, two-pane modal replacing the simple prompt dialog. The left pane shows the experience/education item being edited, while the right pane holds a chat interface powered by `useChat` with tool calling capabilities to propose and apply resume bullet updates.

**Architecture:** We will create a new `InteractiveAIPromptModal` component. Since this is a TanStack Start application, we can use Server Functions (e.g., `createServerFn`) to securely handle the API call and stream the response to the client's `useChat` using `experimental_createProviderRegistry`. We will implement a `propose_resume_update` tool.

**Tech Stack:** React, Tailwind CSS, Shadcn UI, Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/ui-utils`), Lucide React, TanStack Start Server Functions.

---

### Task 1: Create Server API Route for Chat

**Files:**
- Create: `src/routes/api/chat.ts`

- [ ] **Step 1: Implement the Chat API Route**

Create a standard API route for TanStack Start that handles Vercel AI SDK streams.

```typescript
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

export const APIRoute = createAPIFileRoute("/api/chat")({
  POST: async ({ request }) => {
    const { messages, providerId, apiKey, baseUrl, modelName, role, company } = await request.json();

    const isLocal = providerId === "ollama" || providerId === "lmstudio";
    
    if (!apiKey && !isLocal) {
      return new Response(JSON.stringify({ error: "No API key configured." }), { status: 400 });
    }

    let model;
    switch (providerId) {
      case "openai": model = createOpenAI({ apiKey })("gpt-4o-mini"); break;
      case "anthropic": model = createAnthropic({ apiKey })("claude-3-5-haiku-latest"); break;
      case "google": model = createGoogleGenerativeAI({ apiKey })("gemini-1.5-flash"); break;
      case "deepseek": model = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" })("deepseek-chat"); break;
      case "groq": model = createOpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" })("llama3-8b-8192"); break;
      case "ollama":
      case "lmstudio":
        if (!baseUrl || !modelName) {
           return new Response(JSON.stringify({ error: "Base URL and Model required." }), { status: 400 });
        }
        model = createOpenAI({ apiKey: "dummy-key", baseURL: baseUrl })(modelName);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 400 });
    }

    const result = streamText({
      model,
      system: `You are an expert resume writer. The user is updating their resume for the role of ${role} at ${company}. Help them write impressive, quantifiable bullet points. You MUST use the propose_resume_update tool to suggest bullet points.`,
      messages,
      tools: {
        propose_resume_update: {
          description: 'Propose a new set of resume bullet points as an HTML string with <ul> and <li> tags.',
          parameters: z.object({
            bulletsHtml: z.string().describe('The proposed bullet points formatted exactly as HTML <ul><li>...</li></ul>'),
          }),
          execute: async ({ bulletsHtml }) => {
            return { bulletsHtml };
          },
        },
      },
    });

    return result.toDataStreamResponse();
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "feat: add api/chat route for ai generation"
```

### Task 2: Create the InteractiveAIPromptModal Component Structure

**Files:**
- Create: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Write the component with useChat**

```tsx
import { useStore } from "@tanstack/react-store";
import { useChat } from "ai/react";
import { Loader2, Sparkles, Send, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { type AIProvider, settingsStore } from "#/lib/settings-store";

interface Props {
  role: string;
  company: string;
  currentDescription: string;
  onApply: (html: string) => void;
}

export function InteractiveAIPromptModal({ role, company, currentDescription, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const { defaultProvider, apiKeys, baseUrls, selectedModels } = useStore(settingsStore);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(defaultProvider);

  const isLocal = selectedProvider === "ollama" || selectedProvider === "lmstudio";
  const apiKey = isLocal ? "dummy" : apiKeys[selectedProvider];
  const baseUrl = baseUrls[selectedProvider];
  const modelName = selectedModels[selectedProvider];

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: {
      providerId: selectedProvider,
      apiKey,
      baseUrl,
      modelName,
      role,
      company,
    },
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm" className="h-8 gap-2"><Sparkles className="size-4" />Generate with AI</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Improve with AI</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium">Provider:</span>
            <Select value={selectedProvider} onValueChange={(val) => setSelectedProvider(val as AIProvider)}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane: Current State */}
          <div className="w-1/2 border-r p-6 overflow-y-auto flex flex-col gap-4 bg-muted/20">
            <div>
              <h3 className="font-semibold text-lg">{role || "Role"}</h3>
              <p className="text-muted-foreground">{company || "Company"}</p>
            </div>
            <div className="bg-white p-4 rounded-md border min-h-[200px]" dangerouslySetInnerHTML={{ __html: currentDescription || "<em>No description yet...</em>" }} />
          </div>

          {/* Right Pane: Chat */}
          <div className="w-1/2 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground mt-10">Ask the AI to generate or improve your bullet points!</div>
              )}
              {messages.map(m => (
                <div key={m.id} className={\`flex \${m.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                  <div className={\`max-w-[85%] p-3 rounded-lg \${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}\`}>
                    {m.content}
                    {m.toolInvocations?.map(tool => {
                      if (tool.toolName === 'propose_resume_update' && 'result' in tool) {
                        return (
                          <div key={tool.toolCallId} className="mt-3 p-3 bg-background border rounded-md text-foreground">
                            <div className="font-medium text-sm mb-2 pb-2 border-b">Proposed Update:</div>
                            <div className="text-sm mb-3" dangerouslySetInnerHTML={{ __html: tool.result.bulletsHtml }} />
                            <Button size="sm" className="w-full gap-2" onClick={() => onApply(tool.result.bulletsHtml)}>
                              <Check className="size-4" /> Apply Changes
                            </Button>
                          </div>
                        );
                      }
                      if (tool.toolName === 'propose_resume_update') {
                         return <div key={tool.toolCallId} className="mt-2 text-sm italic text-muted-foreground animate-pulse">Proposing updates...</div>;
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-muted-foreground flex gap-2 items-center"><Loader2 className="size-4 animate-spin" /> AI is thinking...</div>}
              {error && <div className="text-red-500 bg-red-100 p-2 rounded">Error: {error.message}</div>}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t shrink-0 flex gap-2">
              <Textarea 
                value={input} 
                onChange={handleInputChange} 
                placeholder="e.g. Focus on my leadership skills..." 
                className="min-h-[60px] resize-none" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                }}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="h-auto">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "feat: add interactive ai prompt modal component"
```

### Task 3: Integrate Modal in ExperienceForm and EducationForm

**Files:**
- Modify: `src/components/editor/ExperienceForm.tsx`
- Modify: `src/components/editor/EducationForm.tsx`

- [ ] **Step 1: Replace AIPromptModal with InteractiveAIPromptModal in ExperienceForm.tsx**

Find the `AIPromptModal` import and replace it:

```tsx
// Find: import { AIPromptModal } from "./AIPromptModal";
import { InteractiveAIPromptModal } from "./InteractiveAIPromptModal";
```

Find the `AIPromptModal` usage and update props:

```tsx
// Find:
<AIPromptModal 
    role={exp.role || ""} 
    company={exp.company || ""} 
    onGenerate={(newBullets) => {
        const currentDesc = exp.description || "";
        const merged = currentDesc ? currentDesc + "<br/>" + newBullets : newBullets;
        updateExperience(id, { description: merged });
    }}
/>

// Replace with:
<InteractiveAIPromptModal 
    role={exp.role || ""} 
    company={exp.company || ""}
    currentDescription={exp.description || ""}
    onApply={(newHtml) => {
        updateExperience(id, { description: newHtml });
    }}
/>
```

- [ ] **Step 2: Replace AIPromptModal with InteractiveAIPromptModal in EducationForm.tsx**

Find the `AIPromptModal` import and replace it:

```tsx
// Find: import { AIPromptModal } from "./AIPromptModal";
import { InteractiveAIPromptModal } from "./InteractiveAIPromptModal";
```

Find the `AIPromptModal` usage and update props:

```tsx
// Find:
<AIPromptModal 
    role={edu.degree || ""} 
    company={edu.institution || ""} 
    onGenerate={(newBullets) => {
        const currentDesc = edu.description || "";
        const merged = currentDesc ? `${currentDesc}<br/>${newBullets}` : newBullets;
        updateEducation(id, { description: merged });
    }}
/>

// Replace with:
<InteractiveAIPromptModal 
    role={edu.degree || ""} 
    company={edu.institution || ""}
    currentDescription={edu.description || ""}
    onApply={(newHtml) => {
        updateEducation(id, { description: newHtml });
    }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/ExperienceForm.tsx src/components/editor/EducationForm.tsx
git commit -m "feat: integrate interactive ai modal into forms"
```

### Task 4: Clean up unused files

**Files:**
- Delete: `src/components/editor/AIPromptModal.tsx`
- Delete: `src/lib/ai.ts` (if no longer used anywhere else)
- Delete: `src/lib/ai.test.ts` (if `ai.ts` is deleted)

- [ ] **Step 1: Check if `src/lib/ai.ts` is used elsewhere**

```bash
grep -rn "lib/ai" src/
```

- [ ] **Step 2: Delete unused files**

```bash
rm src/components/editor/AIPromptModal.tsx
rm src/lib/ai.ts src/lib/ai.test.ts
git add -u
git commit -m "refactor: remove old AIPromptModal and lib/ai.ts"
```
