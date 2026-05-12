# Interactive AI Expert Workflow Design

## Overview
Redesign the existing AI Interactive Prompt Modal to act as a collaborative resume coach rather than an immediate editor. The AI will converse with the user to draft and refine bullet points in plain text, and will only trigger the tool to apply changes to the form once the user has explicitly confirmed the final draft.

## Context
Currently, the `InteractiveAIPromptModal` immediately tries to call the `propose_resume_update` tool whenever it receives a prompt. This skips the collaborative iteration process. The user wants the AI to offer suggestions and act as an expert first, and only provide the "Apply Changes" UI button when an agreement is reached.

## Proposed Solution: AI-Driven Intent Tool (Option 1)
We will rely on a comprehensive system prompt update to guide the AI's behavior. The tool logic in the frontend remains unchanged.

### System Prompt Requirements
The `systemPrompt` in `InteractiveAIPromptModal.tsx` will be updated to enforce the following rules:
1.  **Persona:** Act as an expert resume coach and reviewer.
2.  **Process:** Discuss, critique, and provide *draft* bullet points in plain markdown text. Do not use tools during the drafting phase.
3.  **Confirmation:** Wait for the user to explicitly confirm they are satisfied with a set of bullet points (e.g., "Yes, that looks good", "Let's apply those").
4.  **Execution:** **ONLY** call the `propose_resume_update` tool after the user has given explicit confirmation.

### Workflow
1.  **Initiation:** The user opens the modal and types a prompt or selects a suggestion.
2.  **Drafting:** The AI responds with text-based suggestions and asks for feedback.
3.  **Iteration:** The user and AI converse to refine the bullets.
4.  **Confirmation:** The user approves the final draft.
5.  **Application:** The AI calls `propose_resume_update`, which renders the existing UI block containing the "Apply Changes" button.

### Implementation Details
*   **Target File:** `src/components/editor/InteractiveAIPromptModal.tsx`
*   **Changes:** Modify the `systemPrompt` variable inside the `handleSubmit` function. Update the empty state text to better reflect the new conversational coaching workflow.
*   **No API Changes:** The tool definition (`propose_resume_update`) and the UI rendering logic for tool calls remain exactly the same.

## Edge Cases & Error Handling
*   **Premature Tool Calls:** If the AI disobeys the prompt and calls the tool early, the user still has to click "Apply Changes", so no destructive action occurs automatically. The system prompt should strongly emphasize the "wait for confirmation" rule to minimize this.
*   **Context:** The AI will still receive the existing `context` object (the current state of the experience/education item) to ground its advice.

## Testing Strategy
*   Manually test the modal by asking for general advice to ensure it replies with text.
*   Ask it to refine a bullet point and ensure it provides a text draft without calling the tool.
*   Tell it "Looks good, apply it" and verify the tool call is triggered and the UI updates correctly.
