# AI LLM Provider Integration

## Overview
This document specifies the design for adding AI LLM integration to the Resume Builder, allowing users to provide their own API keys for various AI models to generate resume content.

## Architecture & Data Flow
1.  **State Management**: API keys and the preferred default provider will be stored in the browser's `localStorage` and managed globally via the application's state store (likely `@tanstack/react-store` to align with the existing stack).
2.  **API Communication**: The frontend will communicate directly with the AI providers' APIs using the user-provided keys. We will explore using Vercel's AI SDK (`@ai-sdk/*`) or standard `fetch` requests.
    *   *Constraint Note*: We must ensure the chosen APIs support CORS for direct browser-to-API calls.
3.  **UI Components**: We will utilize Shadcn UI components (`Dialog`, `Input`, `Label`, `Select`, `Button`) to build the necessary interfaces.

## Features & Components

### 1. Global Settings Modal
*   **Trigger**: A "Settings" gear icon added to the main application header/navigation.
*   **Content**: A modal dialog with an "AI Providers" section.
*   **Functionality**:
    *   Input fields for API keys for supported providers: OpenAI, Anthropic, Google (Gemini), DeepSeek, and Groq.
    *   A dropdown to select the "Default Provider/Model" to use across the app.
    *   Secure storage: Keys are saved to `localStorage` only; they never leave the user's browser.

### 2. "Generate with AI" Flow (Prompt Input Modal)
*   **Trigger**: The existing "Generate with AI" button on resume sections (e.g., Experience, Projects).
*   **Content**: A small modal dialog.
*   **Functionality**:
    *   **Pre-check**: If no API keys are configured, the modal displays a message directing the user to the Global Settings Modal to set up a provider.
    *   **Input**: A text area asking for specific instructions (e.g., "Focus on my leadership skills in managing a team of 5").
    *   **Provider Selection**: A dropdown to switch the active provider/model for this specific generation task, defaulting to the globally selected provider.
    *   **Action**: A "Generate" button that initiates the API call.
    *   **Result**: The generated text is appended to the current section's description field (e.g., the Rich Text Editor for the Experience description).

## Technical Requirements
*   **Dependencies**: Add necessary UI components via Shadcn using Neobrutalism registry (`npx shadcn@latest add https://neobrutalism.dev/r/dialog.json https://neobrutalism.dev/r/input.json https://neobrutalism.dev/r/label.json https://neobrutalism.dev/r/select.json https://neobrutalism.dev/r/button.json https://neobrutalism.dev/r/textarea.json`). Add AI SDK packages (`@ai-sdk/core`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/deepseek`, `groq-sdk` or equivalent) if needed for streamlined API calls.
*   **Security**: Clearly communicate in the UI that API keys are stored locally and not sent to our servers.
*   **Error Handling**: Implement graceful error handling for invalid API keys, network issues, or provider rate limits, displaying user-friendly error messages in the UI.