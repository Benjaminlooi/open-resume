# Job Postings Feature — AGENTS.md

**Job tracking + AI analysis pipeline** — manage job postings, fit scoring, resume tailoring, and cover letters.

## STRUCTURE

```
job-postings/
├── components/                  # UI components
│   ├── JobPostingCard.tsx       # Job card with fit score badge
│   ├── JobPostingDetailsDialog.tsx  # Full job posting details
│   ├── NewJobApplicationModal.tsx   # Create application from posting
│   ├── JobApplicationCard.tsx       # Application lifecycle card
│   ├── Steps/                       # Wizard: Details → Fit → Tailor → Cover
│   │   ├── JobDetailsStep.tsx
│   │   ├── FitBriefStep.tsx
│   │   ├── ResumeTailoringStep.tsx
│   │   ├── CoverLetterStep.tsx
│   │   └── ApplicationTrackerStep.tsx
│   └── ... (PipelineIntegrityPanel, TailoredResumePreview)
├── job-ai.ts                   # AI provider config + generation functions
├── job-application-store.ts    # Zustand store for applications
├── job-posting-store.ts        # Zustand store for postings
├── job-application-schema.ts   # Zod schemas
├── job-application-export.ts   # Export utilities
├── resume-edit-helper.ts       # Resume tailoring helper
└── *.test.ts                   # Co-located tests
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add AI provider | `job-ai.ts` `getModel()` | Switch statement maps providers |
| Add analysis step | `job-ai.ts` | Generate + parse pattern |
| Add wizard step | `components/Steps/` | Follow existing step pattern |
| Modify job card UI | `components/JobPostingCard.tsx` | Shows status + fit score |
| Extend application model | `job-application-schema.ts` + store | Schema first |

## CONVENTIONS

- AI pipeline: build prompt → `generateText()` → parse JSON response. Each step is a separate exported function.
- Provider-agnostic: `getModel()` wraps all providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Ollama, LM Studio).
- Stores follow the `useXxxStore` naming pattern with Zustand devtools.
- Tests co-located with source (e.g., `job-ai.test.ts` next to `job-ai.ts`).

## ANTI-PATTERNS

- Don't hardcode provider logic in components — use `job-ai.ts`.
- Don't call backend API directly from components — use `job-posting-store.ts`.
- Don't add new steps without updating the step sequence in `Steps/`.
- `applyResumeEditProposal` must ONLY mutate `tailoredResume`, never the saved source resume.
- Don't fabricate job details — if crawling fails, mark as `failed` with actionable error.
