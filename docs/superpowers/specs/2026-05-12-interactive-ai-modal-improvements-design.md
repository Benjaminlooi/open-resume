# Spec: InteractiveAIPromptModal Improvements

## Overview
Improve the `InteractiveAIPromptModal` component to provide better AI context, a more modern chat UI, and interactive prompt suggestions.

## Requirements

### 1. Data Context Enhancement
- Replace `role` and `company` props with a generic `context` prop (`Record<string, any>`).
- Update the system prompt to include the full `context` as JSON.
- Update `ExperienceForm` and `EducationForm` to pass the full item object as context.

### 2. UI: Chat Bubbles
- Redesign message bubbles to look like modern chat apps.
- **User messages:**
    - Right-aligned.
    - Background: `bg-primary`.
    - Text: `text-primary-foreground`.
    - Rounded corners: `rounded-2xl rounded-tr-none`.
- **Assistant messages:**
    - Left-aligned.
    - Background: `bg-muted`.
    - Text: `text-foreground`.
    - Rounded corners: `rounded-2xl rounded-tl-none`.
- Ensure proper spacing and typography.

### 3. UI: Suggestion Buttons
- Add a horizontal row of rounded buttons above the chat input.
- Buttons should be `variant="outline"` with `rounded-full`.
- Suggested prompts:
    - "✨ Quantify impact"
    - "✍️ Use action verbs"
    - "📏 Shorten bullets"
    - "🎯 Tailor for role"
- Clicking a suggestion should immediately trigger the AI response with that prompt.

### 4. Additional Improvements
- **Stop Generation:** Add a button to stop the AI stream.
- **Improved Empty State:** Show initial suggestions prominently when no messages exist.
- **Robust Auto-scroll:** Ensure the chat window always scrolls to the bottom on new content.
- **Context-aware suggestions:** (Optional) Adjust suggestions based on the `context` type.

## Architecture

### Component Interface
```typescript
interface Props {
  context: Record<string, any>;
  onApply: (html: string) => void;
  children?: React.ReactNode;
}
```

### System Prompt Update
```typescript
const systemPrompt = `You are an expert resume writer. 
The user is updating their resume for the following context:
${JSON.stringify(context, null, 2)}

Help them write impressive, quantifiable bullet points. 
You MUST use the propose_resume_update tool to suggest bullet points.`;
```

## Implementation Plan

### Phase 1: Context & Core Logic
- [ ] Update `Props` and system prompt in `InteractiveAIPromptModal.tsx`.
- [ ] Update `ExperienceForm.tsx` and `EducationForm.tsx` to pass the full object.
- [ ] Refactor `handleSubmit` to accept an optional `overrideInput` for suggestions.

### Phase 2: UI Overhaul
- [ ] Implement new chat bubble styles.
- [ ] Add the suggestion buttons row.
- [ ] Implement "Stop Generation" logic using `AbortController` (or AI SDK's built-in support if available).

### Phase 3: Polish & Testing
- [ ] Verify auto-scroll behavior.
- [ ] Test with different AI providers (OpenAI, Anthropic, etc.).
- [ ] Ensure the "Apply" button still works correctly with the new UI.
