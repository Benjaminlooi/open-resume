# AI Markdown Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correctly render Markdown syntax in AI chat responses by parsing it into sanitized HTML and rendering it via `dangerouslySetInnerHTML`.

**Architecture:** Use `marked` to parse the raw Markdown string into an HTML string, and `DOMPurify` to sanitize it to prevent XSS. We then render the sanitized string inside the existing chat bubbles using React's `dangerouslySetInnerHTML`, styled with Tailwind's Typography plugin classes.

**Tech Stack:** React, Tailwind CSS Typography, `marked`, `dompurify`.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `marked` and `dompurify`**

Run: `pnpm add marked dompurify`

- [ ] **Step 2: Install type definitions**

Run: `pnpm add -D @types/dompurify`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add marked and dompurify dependencies"
```

---

### Task 2: Implement Markdown Rendering in Chat Modal

**Files:**
- Modify: `src/components/editor/InteractiveAIPromptModal.tsx`

- [ ] **Step 1: Add Imports**

At the top of `src/components/editor/InteractiveAIPromptModal.tsx`, add:
```tsx
import DOMPurify from "dompurify";
import { marked } from "marked";
```

- [ ] **Step 2: Update the message rendering logic**

Find this section inside the chat map loop (around line 258):
```tsx
<div
	className={cn(
		"max-w-[85%] p-3 text-sm shadow-sm",
		m.role === "user"
			? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
			: "bg-muted text-foreground rounded-2xl rounded-tl-none",
	)}
>
	{typeof m.content === "string" && m.content}
```

Replace the plain text rendering with:
```tsx
<div
	className={cn(
		"max-w-[85%] p-3 text-sm shadow-sm",
		m.role === "user"
			? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
			: "bg-muted text-foreground rounded-2xl rounded-tl-none",
	)}
>
	{typeof m.content === "string" && (
		<div
			className={cn(
				"prose prose-sm max-w-none text-current prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-ul:ml-4 prose-ol:my-1 prose-ol:ml-4 prose-a:text-current prose-strong:text-current prose-strong:font-semibold prose-code:text-current",
				m.role === "user" ? "prose-invert" : ""
			)}
			dangerouslySetInnerHTML={{
				__html: DOMPurify.sanitize(marked.parse(m.content as string) as string),
			}}
		/>
	)}
```

- [ ] **Step 3: Run the build to verify types and syntax**

Run: `pnpm check` and `pnpm build`
Expected: Passes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/InteractiveAIPromptModal.tsx
git commit -m "feat(editor): render AI responses using marked and dompurify"
```