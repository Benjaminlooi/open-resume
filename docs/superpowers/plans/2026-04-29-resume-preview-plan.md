# Resume Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a visual preview system for saved resumes, featuring a permanent thumbnail on the dashboard cards and a larger hover popover preview.

**Architecture:** We will first refactor the data store and templates to allow rendering specific resume data without polluting the global editor state. Then, we will create a scalable thumbnail component and a hover-enabled card component for the dashboard.

**Tech Stack:** React, Tailwind CSS, TypeScript, Vitest.

---

### Task 1: Export `EditorState` and Add `getResumeData` Helper

**Files:**
- Modify: `src/lib/resume-store.ts`
- Modify: `src/lib/resume-store.test.ts`

- [ ] **Step 1: Write the failing test for `getResumeData`**

Add the following to `src/lib/resume-store.test.ts` inside the complex logic `describe` block (around line 348):

```typescript
		it("retrieves and parses resume data without altering the store", async () => {
			const dummyState = {
				id: "dummy-1",
				name: "Dummy Resume",
				templateId: "modern",
				experience: [{ id: "exp-1", bullets: ["Fixed a bug"] }]
			};
			(globalThis.window.localStorage.getItem as any).mockReturnValue(JSON.stringify(dummyState));

			vi.resetModules();
			const { getResumeData, resumeStore } = await import("./resume-store");
			
			const data = getResumeData("dummy-1");
			
			expect(data).not.toBeNull();
			expect(data?.id).toBe("dummy-1");
			// Legacy migration check
			expect(data?.experience[0].description).toBe("<ul><li>Fixed a bug</li></ul>");
			
			// Verify global store is unchanged
			expect(resumeStore.state.id).toBe("default");
		});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- -t "retrieves and parses resume data without altering the store" --run`
Expected: FAIL because `getResumeData` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/resume-store.ts`, export the `EditorState` type:
```typescript
export type EditorState = Resume & {
	id: string;
	name: string;
	activeSection: string;
	templateId: string;
};
```

And add `getResumeData` below `loadResume`:
```typescript
export const getResumeData = (id: string): EditorState | null => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(`resume-${id}`);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as any;

				const migrateBullets = (items: any[]) => {
					return (
						items?.map((item) => {
							if (item.bullets && Array.isArray(item.bullets)) {
								const html = `<ul>${item.bullets
									.map((b: string) => `<li>${b}</li>`)
									.join("")}</ul>`;
								const { bullets, ...rest } = item;
								return { ...rest, description: html };
							}
							return item;
						}) || []
					);
				};

				if (parsed.experience) parsed.experience = migrateBullets(parsed.experience);
				if (parsed.education) parsed.education = migrateBullets(parsed.education);
				if (parsed.projects) parsed.projects = migrateBullets(parsed.projects);

				return parsed as EditorState;
			} catch (e) {
				console.error("Failed to parse saved resume state", e);
			}
		}
	}
	return null;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- -t "retrieves and parses resume data without altering the store" --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/resume-store.ts src/lib/resume-store.test.ts
git commit -m "feat: export EditorState and add getResumeData helper"
```

---

### Task 2: Refactor `DemoTemplate` to Accept `resume` Prop

**Files:**
- Modify: `src/components/editor/DemoTemplate.tsx`

- [ ] **Step 1: Write the implementation**

Update `src/components/editor/DemoTemplate.tsx` to optionally use passed props instead of the global store.

```tsx
import { useStore } from "@tanstack/react-store";
import { resumeStore, type EditorState } from "#/lib/resume-store";

export default function DemoTemplate({ resume }: { resume?: EditorState }) {
	const globalPersonalInfo = useStore(resumeStore, (state) => state.personalInfo);
	const globalSections = useStore(resumeStore, (state) => state.sections);
	const globalExperience = useStore(resumeStore, (state) => state.experience);
	const globalEducation = useStore(resumeStore, (state) => state.education);
	const globalSkills = useStore(resumeStore, (state) => state.skills);
	const globalProjects = useStore(resumeStore, (state) => state.projects || []);
	const globalCertifications = useStore(resumeStore, (state) => state.certifications || []);
	const globalLanguages = useStore(resumeStore, (state) => state.languages || []);

	const personalInfo = resume ? resume.personalInfo : globalPersonalInfo;
	const sections = resume ? resume.sections : globalSections;
	const experience = resume ? resume.experience : globalExperience;
	const education = resume ? resume.education : globalEducation;
	const skills = resume ? resume.skills : globalSkills;
	const projects = resume ? (resume.projects || []) : globalProjects;
	const certifications = resume ? (resume.certifications || []) : globalCertifications;
	const languages = resume ? (resume.languages || []) : globalLanguages;

	// ... rest of the file remains exactly the same (renderSection and return)
```

*(Note: we are skipping unit tests for this specific refactoring step as it relies heavily on `@tanstack/react-store` internals which can be tricky to mock rapidly, and the refactor is purely prop delegation.)*

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/DemoTemplate.tsx
git commit -m "refactor: update DemoTemplate to accept optional resume prop"
```

---

### Task 3: Refactor `ModernTemplate` to Accept `resume` Prop

**Files:**
- Modify: `src/components/editor/ModernTemplate.tsx`

- [ ] **Step 1: Write the implementation**

Apply the exact same pattern to `src/components/editor/ModernTemplate.tsx`:

```tsx
import { useStore } from "@tanstack/react-store";
import { resumeStore, type EditorState } from "#/lib/resume-store";

export default function ModernTemplate({ resume }: { resume?: EditorState }) {
	const globalPersonalInfo = useStore(resumeStore, (state) => state.personalInfo);
	const globalSections = useStore(resumeStore, (state) => state.sections);
	const globalExperience = useStore(resumeStore, (state) => state.experience);
	const globalEducation = useStore(resumeStore, (state) => state.education);
	const globalSkills = useStore(resumeStore, (state) => state.skills);
	const globalProjects = useStore(resumeStore, (state) => state.projects || []);
	const globalCertifications = useStore(resumeStore, (state) => state.certifications || []);
	const globalLanguages = useStore(resumeStore, (state) => state.languages || []);

	const personalInfo = resume ? resume.personalInfo : globalPersonalInfo;
	const sections = resume ? resume.sections : globalSections;
	const experience = resume ? resume.experience : globalExperience;
	const education = resume ? resume.education : globalEducation;
	const skills = resume ? resume.skills : globalSkills;
	const projects = resume ? (resume.projects || []) : globalProjects;
	const certifications = resume ? (resume.certifications || []) : globalCertifications;
	const languages = resume ? (resume.languages || []) : globalLanguages;

	// ... rest of the file remains exactly the same (renderSection and return)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/ModernTemplate.tsx
git commit -m "refactor: update ModernTemplate to accept optional resume prop"
```

---

### Task 4: Create `ResumeThumbnail` Component

**Files:**
- Create: `src/components/dashboard/ResumeThumbnail.tsx`

- [ ] **Step 1: Write the minimal implementation**

Create `src/components/dashboard/ResumeThumbnail.tsx` to handle the scaling wrapper for the templates:

```tsx
import DemoTemplate from "#/components/editor/DemoTemplate";
import ModernTemplate from "#/components/editor/ModernTemplate";
import type { EditorState } from "#/lib/resume-store";

interface ResumeThumbnailProps {
	templateId: string;
	resume?: EditorState | null;
	scale?: number;
}

export default function ResumeThumbnail({ templateId, resume, scale = 0.35 }: ResumeThumbnailProps) {
	const TemplateComponent = templateId === "modern" ? ModernTemplate : DemoTemplate;
	
	if (!resume) return null;

	return (
		<div className="w-full h-full relative overflow-hidden bg-white">
			<div 
				className="origin-top-left absolute top-0 left-0 bg-white" 
				style={{ 
					transform: `scale(${scale})`, 
					width: "794px",
					minHeight: "1122px" 
				}}
			>
				<TemplateComponent resume={resume} />
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/ResumeThumbnail.tsx
git commit -m "feat: add ResumeThumbnail component for scaled previews"
```

---

### Task 5: Create `ResumeCard` Component

**Files:**
- Create: `src/components/dashboard/ResumeCard.tsx`

- [ ] **Step 1: Write the minimal implementation**

Create `src/components/dashboard/ResumeCard.tsx`. This component uses CSS `group-hover` to show a thumbnail permanently and a floating popover on hover.

```tsx
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getResumeData, type EditorState } from "#/lib/resume-store";
import ResumeThumbnail from "./ResumeThumbnail";

interface ResumeCardProps {
	resumeIndex: {
		id: string;
		name: string;
		templateId: string;
		lastModified: number;
	};
	onDelete: (id: string) => void;
}

export default function ResumeCard({ resumeIndex, onDelete }: ResumeCardProps) {
	const [fullResume, setFullResume] = useState<EditorState | null>(null);

	useEffect(() => {
		const data = getResumeData(resumeIndex.id);
		if (data) {
			setFullResume(data);
		}
	}, [resumeIndex.id]);

	return (
		<div className="relative group">
			<div className="border-2 border-border rounded-base h-64 flex flex-col bg-white overflow-hidden shadow-shadow hover:-translate-y-1 transition-transform relative z-10">
				
				{/* Top Half: Thumbnail with fallback */}
				<div className="flex-1 border-b-2 border-border relative overflow-hidden bg-main/10">
					{fullResume ? (
						<ResumeThumbnail templateId={resumeIndex.templateId} resume={fullResume} scale={0.35} />
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<span className="text-muted-foreground uppercase tracking-widest font-bold">
								{resumeIndex.templateId}
							</span>
						</div>
					)}
				</div>

				{/* Bottom Half: Info and Actions */}
				<div className="p-4 flex flex-col gap-2 bg-white relative z-20 h-[116px]">
					<div className="font-heading text-lg truncate">{resumeIndex.name}</div>
					<div className="text-sm text-muted-foreground">Edited: {new Date(resumeIndex.lastModified).toLocaleDateString()}</div>
					<div className="flex gap-2 mt-2">
						<Link to="/editor/$id" params={{ id: resumeIndex.id }} className="flex-1 text-center bg-main text-main-foreground border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
							Edit
						</Link>
						<button onClick={() => onDelete(resumeIndex.id)} className="bg-red-200 text-red-900 border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
							Delete
						</button>
					</div>
				</div>
			</div>

			{/* Hover Popover */}
			{fullResume && (
				<div className="hidden group-hover:block absolute left-full ml-4 top-[-20px] z-50 border-2 border-border bg-white shadow-shadow rounded-base overflow-hidden w-[280px] h-[396px] pointer-events-none">
					<ResumeThumbnail templateId={resumeIndex.templateId} resume={fullResume} scale={0.35} />
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/ResumeCard.tsx
git commit -m "feat: add ResumeCard component with hover preview popover"
```

---

### Task 6: Update `ResumesDashboard` to Use `ResumeCard`

**Files:**
- Modify: `src/routes/resumes.tsx`

- [ ] **Step 1: Write the implementation**

Update `src/routes/resumes.tsx` to replace the inline card code with the new `ResumeCard`.

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { resumeIndexStore, deleteResumeIndexEntry } from "#/lib/resume-index-store";
import NewResumeModal from "#/components/editor/NewResumeModal";
import ResumeCard from "#/components/dashboard/ResumeCard";

export const Route = createFileRoute("/resumes")({
	component: ResumesDashboard,
});

function ResumesDashboard() {
	const { resumes } = useStore(resumeIndexStore);
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<main className="container mx-auto p-8 pt-[100px]">
			<h1 className="text-4xl font-heading mb-8">My Resumes</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				
				<div 
					onClick={() => setIsModalOpen(true)}
					className="border-2 border-dashed border-border rounded-base h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-main/5 transition-colors bg-white"
				>
					<div className="text-4xl mb-2">+</div>
					<div className="font-heading text-xl">New Resume</div>
				</div>

				{resumes.map((resume) => (
					<ResumeCard 
						key={resume.id} 
						resumeIndex={resume} 
						onDelete={deleteResumeIndexEntry} 
					/>
				))}
			</div>
			{isModalOpen && <NewResumeModal onClose={() => setIsModalOpen(false)} />}
		</main>
	);
}
```

- [ ] **Step 2: Verify application compiles**

Run: `npm run build` or `npm run check` (biome)
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/routes/resumes.tsx
git commit -m "feat: integrate ResumeCard into ResumesDashboard"
```
