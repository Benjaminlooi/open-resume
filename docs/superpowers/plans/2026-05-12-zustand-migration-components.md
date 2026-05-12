# Zustand Store Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the migration of components from TanStack Store to Zustand.

**Architecture:** Replace `@tanstack/react-store` usage with the `useResumeStore` Zustand hook. State and actions should be retrieved from `useResumeStore`.

**Tech Stack:** React 19, Zustand, TypeScript.

---

### Task 1: Migrate LanguagesForm.tsx

**Files:**
- Modify: `src/components/editor/LanguagesForm.tsx`

- [ ] **Step 1: Replace imports and update component logic**

Replace:
```tsx
import { useStore } from "@tanstack/react-store";
// ...
import {
        addLanguage,
        deleteLanguage,
        reorderLanguages,
        resumeStore,
        updateLanguage,
} from "#/lib/resume-store";
```
With:
```tsx
import { useResumeStore } from "#/lib/resume-store";
```

Update hooks:
In `LanguageItem`:
```tsx
const { updateLanguage, deleteLanguage } = useResumeStore();
const lang = useResumeStore((state) =>
    (state.languages || []).find((l) => l.id === id),
);
```

In `LanguagesForm`:
```tsx
const { languages, addLanguage, reorderLanguages } = useResumeStore();
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/LanguagesForm.tsx
git commit -m "refactor: migrate LanguagesForm to Zustand"
```

### Task 2: Migrate ModernTemplate.tsx

**Files:**
- Modify: `src/components/editor/ModernTemplate.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 3: Migrate PersonalInfoForm.tsx

**Files:**
- Modify: `src/components/editor/PersonalInfoForm.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 4: Migrate ProjectsForm.tsx

**Files:**
- Modify: `src/components/editor/ProjectsForm.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 5: Migrate ResumePreview.tsx

**Files:**
- Modify: `src/components/editor/ResumePreview.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 6: Migrate SectionList.tsx

**Files:**
- Modify: `src/components/editor/SectionList.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 7: Migrate SkillsForm.tsx

**Files:**
- Modify: `src/components/editor/SkillsForm.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 8: Migrate editor route ($id.tsx)

**Files:**
- Modify: `src/routes/editor/$id.tsx`

- [ ] **Step 1: Update imports and hook usage**

- [ ] **Step 2: Commit**

### Task 9: Final Verification

- [ ] **Step 1: Run lint and tests**
- [ ] **Step 2: Verify app builds**
