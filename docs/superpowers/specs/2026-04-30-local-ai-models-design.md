# Local AI Models Integration Design

## Context
The application currently supports several cloud-based AI providers (OpenAI, Anthropic, Google, DeepSeek, Groq) for generating resume bullet points. The goal is to add support for running models locally using tools like Ollama or LM Studio. Both of these tools offer OpenAI-compatible API endpoints, allowing us to leverage the existing `@ai-sdk/openai` integration.

## Requirements
1.  **Add Specific Local Providers:** Add 'Ollama' and 'LM Studio' as explicit options in the AI provider selection across the app (Global Settings and AI Prompt Modal).
2.  **Configuration:** Allow users to configure the Base URL and select a specific model for these local providers.
3.  **Model Fetching:** Fetch the list of available models directly from the local API and present them in a dropdown in the Settings UI.
4.  **Generation:** Use the selected local provider, base URL, and model to generate resume bullets.

## Architecture

### 1. State Management (`src/lib/settings-store.ts`)
*   Update `AIProvider` type to include `'ollama'` and `'lmstudio'`.
*   Update `SettingsState` interface:
    *   Add `baseUrls: Partial<Record<AIProvider, string>>` to store custom endpoints.
    *   Add `selectedModels: Partial<Record<AIProvider, string>>` to store the specific model chosen by the user.
*   Update `getInitialState` to provide defaults for the new fields.
*   Add action functions: `updateBaseUrl(provider, url)` and `updateSelectedModel(provider, model)`.

### 2. UI Updates

#### `GlobalSettingsModal.tsx`
*   Add Ollama and LM Studio to the `PROVIDERS` list.
*   For the selected provider in the "API Keys / Config" section:
    *   If it's a cloud provider, show the standard API Key input.
    *   If it's a local provider (`ollama` or `lmstudio`):
        *   Show an input for the Base URL (defaulting to `http://localhost:11434/v1` for Ollama and `http://localhost:1234/v1` for LM Studio).
        *   Show a button to "Fetch Models".
        *   Show a `Select` dropdown populated with the fetched models.
        *   Include a small helper text explaining that CORS must be enabled on the local instance for fetching and generation to work from the browser.

#### `AIPromptModal.tsx`
*   Add the new providers to the Provider override dropdown.
*   Validate readiness: Instead of checking for just an `apiKey`, check if a `selectedModel` and `baseUrl` exist when a local provider is selected.

### 3. AI Generation (`src/lib/ai.ts`)
*   Update the switch statement in `generateExperienceBullets` to handle `ollama` and `lmstudio`.
*   For these providers, use `createOpenAI` from `@ai-sdk/openai`.
*   Pass a dummy `apiKey` (e.g., `'local'`).
*   Pass the configured `baseURL` from the settings store.
*   Call the model using the `selectedModel` from the settings store.

## Data Flow
1.  **Configuration:** User opens Global Settings, selects Ollama, verifies the Base URL, and clicks "Fetch Models". The UI makes a GET request to `${baseUrl}/models` (OpenAI compatible endpoint). The result populates the model dropdown. User selects a model. The URL and Model are saved in `settingsStore`.
2.  **Generation:** User opens AI Prompt Modal and clicks Generate. `generateExperienceBullets` retrieves the `baseUrl` and `selectedModel` for the active provider from `settingsStore`, configures the OpenAI SDK client, and executes the prompt against the local instance.

## Error Handling
*   **Fetching Models:** If the fetch request fails (e.g., due to CORS or the local server not running), display a clear error message in the settings UI instructing the user to check their local server and CORS configuration.
*   **Generation:** The existing error handling in `ai.ts` will catch failures during generation and propagate them to the UI.

## Testing Strategy
*   Manual testing with a local instance of Ollama running to verify model fetching and text generation.
*   Verify that cloud providers still work as expected (regression testing).

## Unresolved Questions / Considerations
*   **CORS:** This is the biggest hurdle for web apps talking to local servers. We rely on the user to configure their local instance (e.g., setting `OLLAMA_ORIGINS="*"`) properly. UI messaging is critical here.