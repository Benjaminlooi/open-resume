# InteractiveAIPromptModal Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `InteractiveAIPromptModal` with a generic context prop, modern chat bubble UI, and interactive suggestion buttons.

**Architecture:** Refactor the modal to accept a JSON context object for AI prompts, implement a mobile-inspired chat bubble UI, and add a row of quick-action suggestion buttons.

**Tech Stack:** React, Tailwind CSS v4, Lucide React, Vercel AI SDK, Zustand.

---

### Task 1: Refactor Component Interface & AI Logic

**Files:**
- Modify: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Update Props and System Prompt**
Replace `role` and `company` props with `context`. Update the `system` prompt in `streamText`.

```tsx
interface Props {
	context: Record<string, any>;
	onApply: (html: string) => void;
	children?: React.ReactNode;
}

// Inside component
const systemPrompt = `You are an expert resume writer. 
The user is updating their resume for the following context:
${JSON.stringify(context, null, 2)}

Help them write impressive, quantifiable bullet points. 
You MUST use the propose_resume_update tool to suggest bullet points.`;

// In streamText call
const result = streamText({
    model,
    system: systemPrompt,
    messages: [...coreMessages, userMessage],
    // ... tools
});
```

- [ ] **Step 2: Add AbortController for "Stop Generation"**
Add state for `abortController` and a function to stop generation.

```tsx
const [abortController, setAbortController] = useState<AbortController | null>(null);

// In handleSubmit
const controller = new AbortController();
setAbortController(controller);

const result = streamText({
    // ...
    abortSignal: controller.signal,
});

// Add stop function
const handleStop = () => {
    abortController?.abort();
    setAbortController(null);
    setIsLoading(false);
};
```

- [ ] **Step 3: Refactor handleSubmit to support suggestions**
Allow `handleSubmit` to be called with a predefined string.

```tsx
const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || isLoading) return;
    // ... use messageContent instead of input
};
```

- [ ] **Step 4: Commit Changes**
```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "refactor: update InteractiveAIPromptModal context and core logic"
```

---

### Task 2: Update Consumer Components

**Files:**
- Modify: `src/components/editor/ExperienceForm.tsx`
- Modify: `src/components/editor/EducationForm.tsx`

- [ ] **Step 1: Update ExperienceForm**
Pass the full `exp` object to `InteractiveAIPromptModal`.

```tsx
// src/components/editor/ExperienceForm.tsx
<InteractiveAIPromptModal
    context={exp}
    onApply={(newHtml) => updateExperience(exp.id, { description: newHtml })}
>
    <ExperienceFields id={id} hideAITrigger />
</InteractiveAIPromptModal>
```

- [ ] **Step 2: Update EducationForm**
Pass the full `edu` object to `InteractiveAIPromptModal`.

```tsx
// src/components/editor/EducationForm.tsx
<InteractiveAIPromptModal
    context={edu}
    onApply={(newHtml) => updateEducation(edu.id, { description: newHtml })}
>
    <EducationFields id={id} hideAITrigger />
</InteractiveAIPromptModal>
```

- [ ] **Step 3: Commit Changes**
```bash
git add src/components/editor/ExperienceForm.tsx src/components/editor/EducationForm.tsx
git commit -m "feat: pass full object context to InteractiveAIPromptModal"
```

---

### Task 3: UI Overhaul - Chat Bubbles & Suggestions

**Files:**
- Modify: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Define Suggestion Buttons**
Add a list of suggestions and render them above the input form.

```tsx
const suggestions = [
    { label: "✨ Quantify impact", prompt: "Make my bullet points more quantifiable with numbers and metrics." },
    { label: "✍️ Use action verbs", prompt: "Improve my bullet points using stronger action verbs." },
    { label: "📏 Shorten bullets", prompt: "Make these bullet points more concise and impactful." },
    { label: "🎯 Tailor for role", prompt: "Tailor these bullet points specifically for the role mentioned in the context." },
];

// In JSX, above <form>
<div className="flex gap-2 p-2 overflow-x-auto no-scrollbar">
    {suggestions.map((s) => (
        <Button
            key={s.label}
            variant="outline"
            size="sm"
            className="rounded-full whitespace-nowrap text-xs h-7"
            onClick={() => handleSubmit(undefined, s.prompt)}
            disabled={isLoading}
        >
            {s.label}
        </Button>
    ))}
</div>
```

- [ ] **Step 2: Redesign Chat Bubbles**
Update the message rendering logic.

```tsx
{messages.map((m: any, i) => (
    <div
        key={i}
        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
    >
        <div
            className={cn(
                "max-w-[85%] p-3 text-sm shadow-sm",
                m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none" 
                    : "bg-muted text-foreground rounded-2xl rounded-tl-none"
            )}
        >
            {/* content ... */}
        </div>
    </div>
))}
```
Note: Use `cn` from `#/lib/utils`.

- [ ] **Step 3: Add "Stop Generation" UI**
Show the stop button while loading.

```tsx
{isLoading && (
    <div className="flex justify-center p-2">
        <Button variant="ghost" size="xs" onClick={handleStop} className="gap-2 text-xs">
            <Square className="size-3 fill-current" /> Stop generating
        </Button>
    </div>
)}
```

- [ ] **Step 4: Commit Changes**
```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "feat: implement chat bubbles and suggestion buttons"
```

---

### Task 4: Polish & Verification

**Files:**
- Modify: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Improve Empty State**
Show the suggestions more prominently when no messages are present.

- [ ] **Step 2: Verify Auto-scroll**
Ensure `chatEndRef.current?.scrollIntoView({ behavior: "smooth" });` is called correctly.

- [ ] **Step 3: Final Verification**
Run `pnpm check` to ensure no linting/type errors.

- [ ] **Step 4: Commit Final Polish**
```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "chore: final polish for InteractiveAIPromptModal"
```
