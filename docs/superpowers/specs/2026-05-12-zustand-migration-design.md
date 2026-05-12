# Design Spec: Migrate TanStack Store to Zustand

## Overview
This document outlines the migration of the application's state management from `@tanstack/store` to `zustand`. The primary goals are to adopt a more idiomatic Zustand pattern (actions inside the store) while maintaining existing functionality, persistence logic, and type safety.

## Background
The project currently uses TanStack Store for three main state containers:
1. `resume-index-store`: List of resumes.
2. `resume-store`: Current resume being edited.
3. `settings-store`: AI and application settings.

Zustand offers a simpler API and is more widely used in the React ecosystem, providing better community support and patterns for React 19.

## Proposed Changes

### 1. Store Refactoring
All stores will be refactored to use Zustand's `create` function. Following the user's preference, actions will be moved inside the store state.

#### `resume-store.ts` (Example Structure)
```typescript
interface ResumeState extends EditorState {
  // Actions
  setActiveSection: (id: string) => void;
  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void;
  // ... other actions
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  ...getInitialState(),
  setActiveSection: (id) => set({ activeSection: id }),
  updatePersonalInfo: (field, value) => set((state) => ({
    personalInfo: { ...state.personalInfo, [field]: value }
  })),
  // ... other actions
}));
```

### 2. Persistence
We will continue using manual `localStorage` persistence logic inside `subscribe` blocks or `getInitialState` functions to preserve the custom migration logic (e.g., bullet-to-HTML migration in `resume-store.ts`). This ensures no data loss during the transition.

### 3. Component Updates
All components using `useStore` from `@tanstack/react-store` will be updated:

**From:**
```tsx
import { useStore } from "@tanstack/react-store";
import { resumeStore, updatePersonalInfo } from "@/lib/resume-store";

const name = useStore(resumeStore, (s) => s.personalInfo.fullName);
const handleClick = () => updatePersonalInfo("fullName", "New Name");
```

**To:**
```tsx
import { useResumeStore } from "@/lib/resume-store";

const name = useResumeStore((s) => s.personalInfo.fullName);
const updatePersonalInfo = useResumeStore((s) => s.updatePersonalInfo);
const handleClick = () => updatePersonalInfo("fullName", "New Name");
```

### 4. Test Updates
Existing tests in `src/lib/*.test.ts` will be updated to:
- Use the new hooks or the store's `getState()` method.
- Reset the store state between tests using `setState`.

## Alternatives Considered

### Alternative A: Keep actions as external functions
- **Pros:** Minimal changes to component call sites.
- **Cons:** Not idiomatic Zustand; harder to track state transitions in some devtools.

### Alternative B: Use Zustand Persistence Middleware
- **Pros:** Cleaner code.
- **Cons:** Riskier to implement with existing legacy data migration logic that runs *before* the store is fully initialized.

**Recommendation:** Move actions into the store (per user request) and keep manual persistence for safety and logic preservation.

## Success Criteria
1. All stores migrated to Zustand.
2. No regressions in resume editing, saving, or settings management.
3. All existing tests pass.
4. Type safety is maintained across the application.
5. Code follows idiomatic Zustand patterns.
