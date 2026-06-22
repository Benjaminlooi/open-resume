# Web Lib — AGENTS.md

**Shared state, schemas, and companion client** — the data layer for the frontend.

## STRUCTURE

```
src/lib/
├── resume-store.ts          # Core Zustand store: resume CRUD + persistence
├── resume-schema.ts         # Zod schema for resume data shape
├── resume-markdown.ts       # Resume ←→ Markdown conversion
├── resume-index-store.ts    # Resume list index (saved resumes)
├── settings-store.ts        # App settings (theme, AI config)
├── ai-store.ts              # AI provider preferences
├── local-companion-client.ts # Typed fetch client for companion API
├── dummy-resume.ts          # Demo/initial resume data
└── utils.ts                 # Shared utilities
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add/change resume field | `resume-schema.ts` + `resume-store.ts` | Schema first, store second |
| Add store with persistence | `resume-store.ts` (pattern) | Zustand + devtools + localStorage |
| Call companion API | `local-companion-client.ts` | Zod-validated responses |
| Resume markdown export | `resume-markdown.ts` | Both directions |
| Modify app settings | `settings-store.ts` | Persisted to localStorage |

## CONVENTIONS

- Zustand stores use `devtools` middleware. Name the store in the middleware options for devtools debugging.
- Stores with persistence use `persist` middleware with `localStorage`.
- Companion client functions return Zod-parsed types — never raw `fetch` responses.
- Schema changes must be backward-compatible (resume data is persisted).
- Dummy data in `dummy-resume.ts` for first-run experience.
