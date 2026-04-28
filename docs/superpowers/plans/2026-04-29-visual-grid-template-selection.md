# Visual Grid Template Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the "Create New Resume" modal to use a visual grid of template preview cards instead of text buttons.

**Architecture:** We will create a dummy `EditorState` object to feed into the existing `ResumeThumbnail` component. The `NewResumeModal` will be expanded to a wider layout containing a responsive grid of selectable cards that house these thumbnails. State management remains the same, only the triggering UI changes.

**Tech Stack:** React 19, Tailwind CSS v4, Zustand (via existing store)

---

### Task 1: Create Dummy Resume State Utility

**Files:**
- Create: `src/lib/dummy-resume.ts`

- [ ] **Step 1: Write the dummy state utility**

```typescript
import { type EditorState } from "./resume-store";

export const blankResumeState: EditorState = {
	templateId: "demo", // Overridden by component
	personalInfo: {
		firstName: "First",
		lastName: "Last",
		email: "",
		phone: "",
		title: "",
		location: "",
		summary: "",
		socialLinks: []
	},
	experience: [],
	education: [],
	skills: [],
	projects: []
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dummy-resume.ts
git commit -m "feat: add blankResumeState utility for template previews"
```

### Task 2: Implement Grid Layout in Modal

**Files:**
- Modify: `src/components/editor/NewResumeModal.tsx`

- [ ] **Step 1: Import necessary components and dummy state**

```tsx
// Add to imports at top of file
import ResumeThumbnail from "#/components/dashboard/ResumeThumbnail";
import { blankResumeState } from "#/lib/dummy-resume";
```

- [ ] **Step 2: Update Modal Container Width**

Change the `max-w-md` class to `max-w-3xl` on the main modal container div.

```tsx
// Before:
// <div className="bg-white border-2 border-border rounded-base p-6 w-full max-w-md shadow-shadow">

// After:
<div className="bg-white border-2 border-border rounded-base p-6 w-full max-w-3xl shadow-shadow flex flex-col gap-6">
```

- [ ] **Step 3: Replace text buttons with Template Grid**

Replace the existing `<div className="grid grid-cols-2 gap-4">` and its contents with the new interactive card grid.

```tsx
// Replace the entire "Starting Template" div section with:
<div className="mb-6">
	<label className="block text-sm font-bold mb-2">Starting Template</label>
	<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
		{AVAILABLE_TEMPLATES.map((tpl) => {
			const isSelected = templateId === tpl.id;
			return (
				<button
					key={tpl.id}
					onClick={() => setTemplateId(tpl.id)}
					className={`relative flex flex-col items-center justify-between border-2 rounded-base p-2 transition-all h-64 overflow-hidden ${
						isSelected 
							? 'bg-main/10 border-border shadow-shadow hover:bg-main/20' 
							: 'border-border/50 text-muted-foreground hover:border-border hover:shadow-shadow'
					}`}
				>
					<div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 z-10 ${
						isSelected ? 'bg-main border-border' : 'bg-white border-border/50'
					}`}>
						{isSelected && (
							<svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
							</svg>
						)}
					</div>
					
					<div className={`w-full flex-1 flex flex-col gap-2 mt-2 mb-2 overflow-hidden pointer-events-none relative ${!isSelected && 'opacity-70'}`}>
						<ResumeThumbnail templateId={tpl.id} resume={{...blankResumeState, templateId: tpl.id}} scale={0.25} />
					</div>
					
					<span className={`font-bold text-sm w-full text-center mt-2 ${isSelected ? 'text-black' : 'text-gray-500'}`}>
						{tpl.name}
					</span>
				</button>
			);
		})}
	</div>
</div>
```

- [ ] **Step 4: Run Vite build/typecheck to verify changes**

Run: `npm run build`
Expected: Passes without TypeScript or build errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NewResumeModal.tsx
git commit -m "feat: replace template text buttons with visual thumbnail grid"
```