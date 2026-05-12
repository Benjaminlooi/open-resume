# AI Expert Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Interactive AI Prompt Modal to act as a collaborative resume coach that only triggers the `propose_resume_update` tool after explicit user confirmation.

**Architecture:** We are relying entirely on prompt engineering to guide the LLM's behavior. The tool definitions and UI rendering logic remain untouched. We will update the `systemPrompt` to enforce a strict "draft first, apply later" workflow.

**Tech Stack:** React, AI SDK, TypeScript.

---

### Task 1: Update the Empty State UI

**Files:**
- Modify: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Update the empty state text**
  Modify the text in the empty state view to reflect the new "coach" persona.

```typescript
// src/components/editor/InteractiveAIPromptModal.tsx
// Find the empty state block:
// <div className="flex flex-col items-center justify-center h-full text-center p-8">
// ...
// <p className="text-sm text-muted-foreground mb-6 max-w-sm">

// Change to:
<p className="text-sm text-muted-foreground mb-6 max-w-sm">
  Chat with the AI resume coach to draft and refine your bullet points. 
  Once you are happy with the suggestions, ask the AI to apply them!
</p>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "feat(ai): update empty state text to reflect coach persona"
```

---

### Task 2: Rewrite the System Prompt

**Files:**
- Modify: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Update the systemPrompt variable**
  Replace the existing `systemPrompt` definition inside the `handleSubmit` function with the new, stricter prompt.

```typescript
// src/components/editor/InteractiveAIPromptModal.tsx

// Find this block:
// const systemPrompt = `You are an expert resume writer. 
// The user is updating their resume for the following context:
// ${JSON.stringify(context, null, 2)}
// 
// Help them write impressive, quantifiable bullet points. 
// You MUST use the propose_resume_update tool to suggest bullet points.`;

// Replace with:
const systemPrompt = `You are an expert resume coach and reviewer.
The user is updating their resume for the following context:
${JSON.stringify(context, null, 2)}

YOUR WORKFLOW:
1. Discuss, critique, and provide *draft* bullet points in plain markdown text. 
2. Ask for the user's feedback on your drafts.
3. Iterate based on their feedback.
4. **CRITICAL:** Wait for the user to explicitly confirm they are satisfied with a final set of bullet points (e.g., "Yes, that looks good", "Let's apply those").
5. **ONLY** after receiving explicit confirmation, use the \`propose_resume_update\` tool to finalize the changes.

DO NOT use the \`propose_resume_update\` tool during the drafting or brainstorming phase. ONLY use it when the user asks to apply or finalize the agreed-upon bullets.`;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "feat(ai): enforce draft-first workflow via system prompt"
```

---

### Task 3: Manual Verification

**Files:**
- None (Manual testing via browser)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test drafting behavior**
  - Open the app in the browser (`http://localhost:3000`).
  - Navigate to the editor and open the "Improve with AI" modal for an experience item.
  - Send a prompt: "Can you make my bullets sound more professional?"
  - **Verify:** The AI responds with plain text drafts and *does not* show the "Apply Changes" tool block.

- [ ] **Step 3: Test application behavior**
  - Reply to the AI: "That looks perfect, let's apply it."
  - **Verify:** The AI triggers the `propose_resume_update` tool, and the "Apply Changes" button appears in the chat UI.
  - Click "Apply Changes".
  - **Verify:** The modal closes and the text editor is updated with the new bullets.
