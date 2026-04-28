# Saved Resumes Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dashboard page that lists saved resumes and allows creating new ones, backed by a new multi-resume storage architecture.

**Architecture:** We will introduce a new `resume-index-store` to manage a lightweight list of all resumes. The existing `resume-store` will be modified to handle a specific resume by ID. The UI will feature a new `/resumes` route with a grid layout and a modal for creating new resumes. The `/editor` route will become dynamic (`/editor/$id`).

**Tech Stack:** React, TanStack Router, TanStack Store, Tailwind CSS, Shadcn UI.

---

### Task 1: Update Editor State and Store Setup

**Files:**
- Modify: `src/lib/resume-store.ts`
- Create: `src/lib/resume-store.test.ts` (update existing if needed)

- [ ] **Step 1: Update EditorState interface**

Modify `src/lib/resume-store.ts` to add `id` and `name` to `EditorState`.
```typescript
type EditorState = Resume & {
	id: string;
	name: string;
	activeSection: string;
	templateId: string;
};
```

- [ ] **Step 2: Update initialResume**

Modify `initialResume` in `src/lib/resume-store.ts` to include default `id` and `name`.
```typescript
const initialResume: EditorState = {
	id: "default",
	name: "My Resume",
    // ... existing properties
```

- [ ] **Step 3: Modify getInitialState**

Update `getInitialState` to NOT load from `localStorage` immediately, as we need the ID first. Just return `initialResume`.
```typescript
const getInitialState = (): EditorState => {
	return initialResume;
};
```

- [ ] **Step 4: Modify store subscription**

Update the subscription in `src/lib/resume-store.ts` to use the dynamic ID.
```typescript
if (typeof window !== "undefined") {
	resumeStore.subscribe(() => {
		const state = resumeStore.state;
		if (state.id) {
			localStorage.setItem(
				`resume-${state.id}`,
				JSON.stringify(state),
			);
		}
	});
}
```

- [ ] **Step 5: Add loadResume function**

Add a function to `src/lib/resume-store.ts` to load a specific resume from `localStorage`.
```typescript
export const loadResume = (id: string) => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(`resume-${id}`);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as EditorState;
				// ... keep legacy migration logic here if needed ...
				resumeStore.setState(() => parsed);
				return true;
			} catch (e) {
				console.error("Failed to parse saved resume state", e);
			}
		}
	}
	return false;
};
```

- [ ] **Step 6: Commit**
```bash
git add src/lib/resume-store.ts
git commit -m "refactor: update resume-store for dynamic IDs"
```

### Task 2: Create Resume Index Store

**Files:**
- Create: `src/lib/resume-index-store.ts`

- [ ] **Step 1: Create the index store file**

Create `src/lib/resume-index-store.ts`.
```typescript
import { Store } from "@tanstack/store";

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

type ResumeIndexState = {
	resumes: ResumeIndexEntry[];
};

const getInitialIndexState = (): ResumeIndexState => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem("resume-index");
		if (saved) {
			try {
				return JSON.parse(saved) as ResumeIndexState;
			} catch (e) {
				console.error("Failed to parse resume index", e);
			}
		}
		
		// Migration for existing single resume
		const legacySaved = localStorage.getItem("resume-builder-state");
		if (legacySaved) {
			try {
				const parsedLegacy = JSON.parse(legacySaved);
				const legacyId = "default";
				localStorage.setItem(`resume-${legacyId}`, legacySaved);
				return {
					resumes: [{
						id: legacyId,
						name: "Imported Resume",
						lastModified: Date.now(),
						templateId: parsedLegacy.templateId || "demo"
					}]
				};
			} catch (e) {}
		}
	}
	return { resumes: [] };
};

export const resumeIndexStore = new Store<ResumeIndexState>(getInitialIndexState());

if (typeof window !== "undefined") {
	resumeIndexStore.subscribe(() => {
		localStorage.setItem("resume-index", JSON.stringify(resumeIndexStore.state));
	});
}

export const createResumeIndexEntry = (id: string, name: string, templateId: string) => {
	resumeIndexStore.setState((state) => ({
		resumes: [
			...state.resumes,
			{ id, name, templateId, lastModified: Date.now() },
		],
	}));
};

export const updateResumeIndexModified = (id: string) => {
    resumeIndexStore.setState((state) => ({
        resumes: state.resumes.map(r => r.id === id ? { ...r, lastModified: Date.now() } : r)
    }));
};

export const deleteResumeIndexEntry = (id: string) => {
	resumeIndexStore.setState((state) => ({
		resumes: state.resumes.filter((r) => r.id !== id),
	}));
    if (typeof window !== "undefined") {
        localStorage.removeItem(`resume-${id}`);
    }
};
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/resume-index-store.ts
git commit -m "feat: add resume-index-store for managing multiple resumes"
```

### Task 3: Create Dashboard Route

**Files:**
- Create: `src/routes/resumes.tsx`

- [ ] **Step 1: Create the basic route file**

Create `src/routes/resumes.tsx`.
```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { resumeIndexStore, deleteResumeIndexEntry } from "#/lib/resume-index-store";

export const Route = createFileRoute("/resumes")({
	component: ResumesDashboard,
});

function ResumesDashboard() {
	const { resumes } = useStore(resumeIndexStore);

	return (
		<main className="container mx-auto p-8 pt-[100px]">
			<h1 className="text-4xl font-heading mb-8">My Resumes</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				
				{/* Create New Card (Placeholder for now) */}
				<div className="border-2 border-dashed border-border rounded-base h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-main/5 transition-colors bg-white">
					<div className="text-4xl mb-2">+</div>
					<div className="font-heading text-xl">New Resume</div>
				</div>

				{/* Existing Resumes */}
				{resumes.map((resume) => (
					<div key={resume.id} className="border-2 border-border rounded-base h-64 flex flex-col bg-white overflow-hidden shadow-shadow hover:-translate-y-1 transition-transform">
						<div className="flex-1 bg-main/10 flex items-center justify-center border-b-2 border-border">
							<span className="text-muted-foreground uppercase tracking-widest font-bold">{resume.templateId}</span>
						</div>
						<div className="p-4 flex flex-col gap-2">
                            <div className="font-heading text-lg truncate">{resume.name}</div>
                            <div className="text-sm text-muted-foreground">Edited: {new Date(resume.lastModified).toLocaleDateString()}</div>
                            <div className="flex gap-2 mt-2">
                                <Link to="/editor/$id" params={{ id: resume.id }} className="flex-1 text-center bg-main text-main-foreground border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
                                    Edit
                                </Link>
                                <button onClick={() => deleteResumeIndexEntry(resume.id)} className="bg-red-200 text-red-900 border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
                                    Delete
                                </button>
                            </div>
                        </div>
					</div>
				))}
			</div>
		</main>
	);
}
```

- [ ] **Step 2: Commit**
```bash
git add src/routes/resumes.tsx
git commit -m "feat: add resumes dashboard route"
```

### Task 4: Create New Resume Modal

**Files:**
- Create: `src/components/editor/NewResumeModal.tsx`
- Modify: `src/routes/resumes.tsx`

- [ ] **Step 1: Create the Modal Component**

Create `src/components/editor/NewResumeModal.tsx`.
```tsx
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createResumeIndexEntry } from "#/lib/resume-index-store";
import { AVAILABLE_TEMPLATES } from "#/lib/resume-store";

interface NewResumeModalProps {
	onClose: () => void;
}

export default function NewResumeModal({ onClose }: NewResumeModalProps) {
	const navigate = useNavigate();
	const [name, setName] = useState("My New Resume");
	const [templateId, setTemplateId] = useState("demo");

	const handleCreate = () => {
		const id = crypto.randomUUID();
		createResumeIndexEntry(id, name, templateId);
		navigate({ to: "/editor/$id", params: { id } });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white border-2 border-border rounded-base p-6 w-full max-w-md shadow-shadow">
				<h2 className="text-2xl font-heading mb-4">Create New Resume</h2>
				
				<div className="mb-4">
					<label className="block text-sm font-bold mb-2">Resume Name</label>
					<input 
						type="text" 
						value={name} 
						onChange={(e) => setName(e.target.value)}
						className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main"
					/>
				</div>

				<div className="mb-6">
					<label className="block text-sm font-bold mb-2">Starting Template</label>
					<div className="grid grid-cols-2 gap-4">
						{AVAILABLE_TEMPLATES.map((tpl) => (
							<button
								key={tpl.id}
								onClick={() => setTemplateId(tpl.id)}
								className={`border-2 rounded-base p-4 text-center font-bold ${templateId === tpl.id ? 'bg-main text-main-foreground border-border shadow-shadow' : 'border-border/50 text-muted-foreground hover:border-border'}`}
							>
								{tpl.name}
							</button>
						))}
					</div>
				</div>

				<div className="flex justify-end gap-4">
					<button onClick={onClose} className="px-4 py-2 border-2 border-border rounded-base font-bold hover:bg-main/5">
						Cancel
					</button>
					<button onClick={handleCreate} className="px-4 py-2 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all">
						Create
					</button>
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Integrate Modal into Dashboard**

Update `src/routes/resumes.tsx` to include state and render the modal.
```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { resumeIndexStore, deleteResumeIndexEntry } from "#/lib/resume-index-store";
import NewResumeModal from "#/components/editor/NewResumeModal";

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
					<div key={resume.id} className="border-2 border-border rounded-base h-64 flex flex-col bg-white overflow-hidden shadow-shadow hover:-translate-y-1 transition-transform">
						<div className="flex-1 bg-main/10 flex items-center justify-center border-b-2 border-border">
							<span className="text-muted-foreground uppercase tracking-widest font-bold">{resume.templateId}</span>
						</div>
						<div className="p-4 flex flex-col gap-2">
                            <div className="font-heading text-lg truncate">{resume.name}</div>
                            <div className="text-sm text-muted-foreground">Edited: {new Date(resume.lastModified).toLocaleDateString()}</div>
                            <div className="flex gap-2 mt-2">
                                <Link to="/editor/$id" params={{ id: resume.id }} className="flex-1 text-center bg-main text-main-foreground border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
                                    Edit
                                </Link>
                                <button onClick={() => deleteResumeIndexEntry(resume.id)} className="bg-red-200 text-red-900 border-2 border-border rounded-base px-2 py-1 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow">
                                    Delete
                                </button>
                            </div>
                        </div>
					</div>
				))}
			</div>
			{isModalOpen && <NewResumeModal onClose={() => setIsModalOpen(false)} />}
		</main>
	);
}
```

- [ ] **Step 3: Commit**
```bash
git add src/components/editor/NewResumeModal.tsx src/routes/resumes.tsx
git commit -m "feat: add new resume modal"
```

### Task 5: Dynamic Editor Route

**Files:**
- Move & Modify: `src/routes/editor/index.tsx` -> `src/routes/editor/$id.tsx`

- [ ] **Step 1: Move and Rename File**
```bash
mv src/routes/editor/index.tsx src/routes/editor/\$id.tsx
```

- [ ] **Step 2: Update Editor Route**

Modify `src/routes/editor/$id.tsx` to handle the dynamic ID and load state.
Change the top part of the file:
```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
// ... other imports remain exactly the same ...
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";
import { resumeStore, loadResume } from "#/lib/resume-store";

export const Route = createFileRoute("/editor/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const activeSection = useStore(resumeStore, (state) => state.activeSection);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const success = loadResume(id);
		// Note: We'll initialize from index if not found in a real app, 
		// but for simplicity here we just proceed. Store has initialResume fallback.
		setIsLoading(false);
	}, [id]);

	if (isLoading) return <div>Loading...</div>;

	const renderActiveForm = () => {
// ... rest of the file remains exactly the same ...
```

- [ ] **Step 3: Update `resumeStore` initial state hook inside Editor**
If we just navigated from "Create New", we want to save the base state if it doesn't exist. In `loadResume`, we might need logic for "new" resumes vs "existing". For now, `loadResume` returns false if not found, leaving the store with its current state.
Wait, let's update `src/lib/resume-store.ts` to ensure `loadResume` initializes a blank state correctly if not found in `localStorage`, but with the correct ID.
In `src/routes/editor/$id.tsx`, add:
```typescript
	useEffect(() => {
		const success = loadResume(id);
		if (!success) {
			// Initialize new resume state
			resumeStore.setState((state) => ({
				...state,
				id: id,
			}));
		}
		setIsLoading(false);
	}, [id]);
```

- [ ] **Step 4: Commit**
```bash
git add src/routes/editor/\$id.tsx src/routes/editor/index.tsx
git commit -m "feat: change editor route to dynamic id"
```

### Task 6: Routing and Index Redirect

**Files:**
- Modify: `src/routes/index.tsx`
- Modify: (Generate tree)

- [ ] **Step 1: Redirect Root to Resumes**

Modify `src/routes/index.tsx` to redirect to `/resumes`.
```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({
			to: "/resumes",
		});
	},
});
```

- [ ] **Step 2: Generate TanStack Route Tree**
```bash
npm run build
# OR run the dev server briefly if that's how it's configured to generate routes
```

- [ ] **Step 3: Commit**
```bash
git add src/routes/index.tsx src/routeTree.gen.ts
git commit -m "chore: redirect root to resumes dashboard"
```
