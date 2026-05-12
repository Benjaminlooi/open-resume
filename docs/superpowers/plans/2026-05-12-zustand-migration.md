# Zustand Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate state management from `@tanstack/store` to `zustand` while moving actions into the stores.

**Architecture:** Refactor `resume-index-store`, `resume-store`, and `settings-store` using Zustand's `create` hook. Actions are defined within the store. Manual persistence logic is preserved to ensure compatibility with existing `localStorage` data.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest.

---

### Task 1: Setup and Dependency Management

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Zustand**

Run: `npm install zustand`

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add zustand dependency"
```

---

### Task 2: Migrate Settings Store

**Files:**
- Modify: `src/lib/settings-store.ts`
- Test: `src/lib/settings-store.test.ts`

- [ ] **Step 1: Refactor Settings Store to Zustand**

```typescript
import { create } from 'zustand';

export type AIProvider = "openai" | "anthropic" | "google" | "deepseek" | "groq" | "ollama" | "lmstudio";

export interface SettingsState {
  apiKeys: Partial<Record<AIProvider, string>>;
  defaultProvider: AIProvider;
  baseUrls: Partial<Record<AIProvider, string>>;
  selectedModels: Partial<Record<AIProvider, string>>;
  // Actions
  updateAPIKey: (provider: AIProvider, key: string) => void;
  setDefaultProvider: (provider: AIProvider) => void;
  updateBaseUrl: (provider: AIProvider, url: string) => void;
  updateSelectedModel: (provider: AIProvider, model: string) => void;
}

const getInitialState = (): Omit<SettingsState, 'updateAPIKey' | 'setDefaultProvider' | 'updateBaseUrl' | 'updateSelectedModel'> => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("resume-builder-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          apiKeys: parsed.apiKeys || {},
          defaultProvider: parsed.defaultProvider || "openai",
          baseUrls: parsed.baseUrls || {},
          selectedModels: parsed.selectedModels || {}
        };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }
  return {
    apiKeys: {},
    defaultProvider: "openai",
    baseUrls: {},
    selectedModels: {}
  };
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...getInitialState(),
  updateAPIKey: (provider, key) => set((state) => ({
    apiKeys: { ...state.apiKeys, [provider]: key }
  })),
  setDefaultProvider: (provider) => set({ defaultProvider: provider }),
  updateBaseUrl: (provider, url) => set((state) => ({
    baseUrls: { ...state.baseUrls, [provider]: url }
  })),
  updateSelectedModel: (provider, model) => set((state) => ({
    selectedModels: { ...state.selectedModels, [provider]: model }
  })),
}));

// Persistence subscription
if (typeof window !== "undefined") {
  useSettingsStore.subscribe((state) => {
    const { updateAPIKey, setDefaultProvider, updateBaseUrl, updateSelectedModel, ...data } = state;
    localStorage.setItem("resume-builder-settings", JSON.stringify(data));
  });
}
```

- [ ] **Step 2: Update Settings Store Tests**

Modify `src/lib/settings-store.test.ts` to use `useSettingsStore.getState()` and `useSettingsStore.setState()`.

- [ ] **Step 3: Run Tests**

Run: `npm run test src/lib/settings-store.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/settings-store.ts src/lib/settings-store.test.ts
git commit -m "feat: migrate settingsStore to zustand"
```

---

### Task 3: Migrate Resume Index Store

**Files:**
- Modify: `src/lib/resume-index-store.ts`

- [ ] **Step 1: Refactor Resume Index Store to Zustand**

```typescript
import { create } from 'zustand';

export interface ResumeIndexEntry {
	id: string;
	name: string;
	lastModified: number;
	templateId: string;
}

interface ResumeIndexState {
	resumes: ResumeIndexEntry[];
	createResumeIndexEntry: (id: string, name: string, templateId: string) => void;
	updateResumeIndexModified: (id: string) => void;
	deleteResumeIndexEntry: (id: string) => void;
}

const getInitialIndexState = (): { resumes: ResumeIndexEntry[] } => {
    // ... same logic as before ...
};

export const useResumeIndexStore = create<ResumeIndexState>((set) => ({
	...getInitialIndexState(),
	createResumeIndexEntry: (id, name, templateId) => set((state) => ({
		resumes: [
			...state.resumes,
			{ id, name, templateId, lastModified: Date.now() },
		],
	})),
	updateResumeIndexModified: (id) => set((state) => ({
		resumes: state.resumes.map(r => r.id === id ? { ...r, lastModified: Date.now() } : r)
	})),
	deleteResumeIndexEntry: (id) => set((state) => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(`resume-${id}`);
		}
		return { resumes: state.resumes.filter((r) => r.id !== id) };
	}),
}));

if (typeof window !== "undefined") {
	useResumeIndexStore.subscribe((state) => {
		const { resumes } = state;
		localStorage.setItem("resume-index", JSON.stringify({ resumes }));
	});
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/resume-index-store.ts
git commit -m "feat: migrate resumeIndexStore to zustand"
```

---

### Task 4: Migrate Resume Store (The Big One)

**Files:**
- Modify: `src/lib/resume-store.ts`
- Test: `src/lib/resume-store.test.ts`

- [ ] **Step 1: Refactor Resume Store to Zustand**
Move all export functions into the store's action set. Update `loadResume` to use `set()`.

- [ ] **Step 2: Update Resume Store Tests**
Update `src/lib/resume-store.test.ts` to use `useResumeStore.getState()` and `useResumeStore.setState()`.

- [ ] **Step 3: Run Tests**
Run: `npm run test src/lib/resume-store.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/lib/resume-store.ts src/lib/resume-store.test.ts
git commit -m "feat: migrate resumeStore to zustand"
```

---

### Task 5: Update Component Call Sites (Batch Update)

**Files:**
- Modify: `src/components/**/*.tsx`, `src/routes/**/*.tsx`

- [ ] **Step 1: Update Settings Store Usages**
Update `GlobalSettingsModal.tsx`, `InteractiveAIPromptModal.tsx`.

- [ ] **Step 2: Update Resume Index Store Usages**
Update `src/routes/resumes.tsx`.

- [ ] **Step 3: Update Resume Store Usages**
Update all components in `src/components/editor/` and `src/routes/editor/$id.tsx`.

- [ ] **Step 4: Cleanup TanStack Store**
Run: `npm uninstall @tanstack/store @tanstack/react-store`

- [ ] **Step 5: Final Verification**
Run: `npm run lint` and `npm run test`
Expected: PASS

- [ ] **Step 6: Final Commit**
```bash
git add .
git commit -m "refactor: complete migration to zustand and cleanup"
```
