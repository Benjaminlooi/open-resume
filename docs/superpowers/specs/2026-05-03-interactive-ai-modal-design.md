# Interactive AI Generation Modal

## Overview
Replaces the simple prompt dialog with an interactive, side-by-side modal for AI generation, utilizing a chat interface and tool calls to iteratively refine resume entries.

## Layout & UX
*   **Wider Modal:** The modal will use `max-w-4xl` or similar to accommodate a two-pane layout.
*   **Left Pane (Source of Truth):** Displays the specific resume entry being edited (e.g., Job Title, Company, and current Bullets). This acts as a preview and allows the user to see the current state.
*   **Right Pane (Chat Interface):** A standard chat UI powered by the Vercel AI SDK, featuring a message history and input field.

## Architecture
*   **AI SDK:** Uses Vercel AI SDK`s `useChat` hook for state management on the client.
*   **Backend Endpoint:** A new API route (e.g., `POST /api/chat` or handled server-side via Server Functions depending on TanStack Start setup) using `streamText` to handle the streaming response and tool calling.
*   **Dynamic Provider:** The endpoint will read the user`s selected provider/keys from the existing `settingsStore` (or passed in the payload).

## Tool Calling & Interaction
*   **`propose_resume_update` Tool:** The AI is equipped with a specific tool to suggest updates. The schema will primarily focus on `bullets` (an array of strings), but could be extended to other fields.
*   **Custom UI Rendering:** When the AI invokes the tool, the chat feed renders a custom "Proposal Card" detailing the suggested bullets.
*   **Apply Mechanism:** The Proposal Card includes an "Apply" button. Clicking this takes the data from the tool payload and updates the parent form state (via the `onGenerate` callback passed to the modal), updating the Left Pane.

## Error Handling
*   Retains existing checks for missing API keys or unconfigured local models before initiating the chat.
