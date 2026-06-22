# Resume Editor — AGENTS.md

**Form-based resume editing** — section-by-section forms, live preview, template rendering.

## STRUCTURE

```
editor/
├── PersonalInfoForm.tsx     # Name, email, phone, links
├── SummaryForm.tsx          # Professional summary
├── ExperienceForm.tsx       # Work experience (drag-reorderable)
├── EducationForm.tsx        # Education entries
├── SkillsForm.tsx           # Skills with categories
├── ProjectsForm.tsx         # Project entries
├── CertificationsForm.tsx   # Certifications
├── LanguagesForm.tsx        # Languages
├── SectionList.tsx          # Section navigation sidebar
├── EditorHeader.tsx         # Save, preview, settings toolbar
├── NewResumeModal.tsx       # Create resume dialog
├── GlobalSettingsModal.tsx  # Theme, templates, AI settings
├── InteractiveAIPromptModal.tsx  # AI-assisted editing modal
├── ResumePreview.tsx        # Live preview pane
├── DemoTemplate.tsx         # Default resume template renderer
├── ModernTemplate.tsx       # Alternative template
└── DemoTemplate.test.tsx    # Template tests
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add form section | Follow `ExperienceForm.tsx` pattern | Register in `SectionList.tsx` |
| Add template | Copy `DemoTemplate.tsx` pattern | Register in `resume-store.ts` |
| Modify AI edit modal | `InteractiveAIPromptModal.tsx` | Uses `@ai-sdk/react` |
| Add editor setting | `GlobalSettingsModal.tsx` | Persisted via settings-store |

## CONVENTIONS

- Each section form is a standalone component receiving `EditorState` from the store.
- Forms use `useResumeStore` directly (no prop drilling for resume data).
- Templates are pure render components — no state, props-only.
- Section ordering managed by `SectionList.tsx` with `activeSection` in store.
- Drag-reorder uses `@dnd-kit` (see ExperienceForm for pattern).

## ANTI-PATTERNS

- Don't put store logic inside form components — keep them as views over store.
- Don't modify `DemoTemplate` or `ModernTemplate` for non-template changes.
- Don't bypass the section registry — new sections must be added to `SectionList` and `AVAILABLE_SECTIONS`.
- AI prompt: DO NOT use `propose_resume_update` during drafting/brainstorming — only when user asks to apply.
- No `@testing-library/react` for component tests — use `renderToStaticMarkup` from `react-dom/server` (existing convention).
