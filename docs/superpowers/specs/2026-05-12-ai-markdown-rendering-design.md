# Markdown Rendering for AI Responses Design

## 1. Context and Goals
The `InteractiveAIPromptModal` currently renders the AI's response strings as raw text, which causes Markdown formatting (like `**bold**` or `* bullet points`) to appear as unformatted text. The goal is to properly render this Markdown into formatted elements in the chat interface.

The application already uses `dangerouslySetInnerHTML` combined with Tailwind Typography (`prose` classes) to render rich text from the Tiptap editor onto the resume templates. To maintain architectural consistency, we will adopt the same "HTML string" model for the AI chat responses.

## 2. Dependencies
We will add the following dependencies:
- `marked`: A fast, lightweight Markdown-to-HTML compiler.
- `dompurify` (and `@types/dompurify`): A DOM-only, super-fast, uber-tolerant XSS sanitizer for HTML.

## 3. Implementation Details

### Parsing and Sanitization
Inside `src/components/editor/InteractiveAIPromptModal.tsx`, we will convert the raw text content of messages into sanitized HTML:

1.  Check if `m.content` is a string.
2.  Pass the string through `marked.parse(m.content)` (we will use `marked.parse` synchronously, or `marked.parseInline` if block-level elements are not desired, but `parse` is standard).
3.  Sanitize the resulting HTML string using `DOMPurify.sanitize(html)`. *Note: because `marked.parse` returns a promise in v11+, we may need to use `marked.parse(..., { async: false })` or simply use the synchronous API if configured, but we will handle this cleanly in the component.* Wait, actually `marked.parse` is synchronous by default unless async extensions are used.

### UI / Rendering
We will replace the current raw string output:
```tsx
{typeof m.content === "string" && m.content}
```

With a container div utilizing React's `dangerouslySetInnerHTML`:
```tsx
{typeof m.content === "string" && (
  <div 
    className="prose prose-sm max-w-none text-current prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-ul:ml-4 prose-ol:my-1 prose-ol:ml-4"
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.content as string) as string) }}
  />
)}
```

### Styling Considerations
We will use Tailwind's Typography plugin (`prose`) classes to ensure the rendered HTML has proper spacing, margins, and font weights, matching the styling approach used in `ModernTemplate.tsx`. We will use `text-current` or `text-inherit` instead of fixed colors to ensure it looks correct inside both user (blue background) and assistant (gray background) chat bubbles.

## 4. Security
By routing all parsed Markdown through `DOMPurify`, we mitigate the risk of Cross-Site Scripting (XSS) attacks in the event that the AI returns malicious `<script>` tags or inline event handlers.

## 5. Testing Strategy
-   Verify that standard Markdown (bold, italic, lists) renders correctly in the chat UI.
-   Verify that the chat bubbles maintain their correct colors and padding.
-   Verify that malicious HTML (e.g., `<script>alert('xss')</script>`) is stripped by DOMPurify.
