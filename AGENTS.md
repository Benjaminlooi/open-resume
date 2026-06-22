# Open Resume — Project Knowledge Base

**Generated:** 2026-06-22
**Commit:** `5b8fa92` (`main`)
**Stack:** TanStack Start (React 19) + Fastify 5 + pnpm monorepo

## OVERVIEW

Resume builder with AI-powered job tracking. Frontend SSR on Cloudflare Workers, local companion daemon for job scraping/AI analysis.

## STRUCTURE

```
├── apps/
│   ├── web/              # TanStack Start frontend (port 3000)
│   │   └── src/
│   │       ├── routes/           # File-based routing (TanStack Router)
│   │       ├── components/       # editor/, ui/ (Shadcn), dashboard/
│   │       ├── features/         # job-postings/ (tracking + AI)
│   │       ├── lib/              # Zustand stores, schemas, companion client
│   │       └── integrations/     # posthog/
│   └── companion/         # Fastify 5 daemon (port 47321)
│       └── src/
│           ├── routes/           # System, job, profile, resume API routes
│           ├── job-postings/     # SQLite repo + crawl queue + AI analyzer
│           ├── extract/          # Playwright scraper, HTML/json-ld extraction
│           ├── plugins/          # CORS, error handler, OpenAPI
│           └── profile/          # Candidate profile defaults
├── packages/
│   └── contracts/         # Shared Zod schemas
└── docs/                  # Superpowers specs & plans
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Resume CRUD + editor | `apps/web/src/components/editor/` + `apps/web/src/lib/resume-store.ts` | Zustand persistence |
| Résumé templates | `apps/web/src/components/editor/{DemoTemplate,ModernTemplate}.tsx` | React components |
| Job posting management | `apps/web/src/features/job-postings/` | Store + AI pipeline + components |
| AI fit analysis | `apps/web/src/features/job-postings/job-ai.ts` | Multi-provider (OpenAI, Anthropic, etc.) |
| Companion API client | `apps/web/src/lib/local-companion-client.ts` | Zod-validated fetch wrapper |
| Companion crawl pipeline | `apps/companion/src/job-postings/` | Queue + repository |
| Scraping engine | `apps/companion/src/extract/` | Playwright + HTML/JSON-LD parsers |
| OpenAPI spec | `apps/companion/src/routes/` + `apps/companion/src/openapi.ts` | Swagger UI at /docs |
| Route definitions | `apps/web/src/routes/` | File-based, TanStack Router |

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `useResumeStore` | hook (store) | `resume-store.ts` | 10+ | Core resume CRUD + persistence |
| `useJobPostingStore` | hook (store) | `job-posting-store.ts` | 8+ | Job posting CRUD + companion sync |
| `useJobApplicationStore` | hook (store) | `job-application-store.ts` | 6+ | Job application lifecycle |
| `local-companion-client` | module | `local-companion-client.ts` | 12+ | Typed fetch wrapper for companion API |
| `companionFetch` | function | `local-companion-client.ts` | 15+ | Base fetch with error handling |
| `getModel` | function | `features/job-postings/job-ai.ts` | 3+ | AI provider factory (OpenAI, Anthropic, Google, Ollama, etc.) |
| `generateJobFitBrief` | function | `features/job-postings/job-ai.ts` | 2+ | AI job fit analysis |
| `resumeSchema` | Zod schema | `resume-schema.ts` | 5+ | Resume data validation |
| `resume-markdown` | module | `resume-markdown.ts` | 3+ | Resume ←→ Markdown conversion |
| `server.ts` (companion) | module | `companion/src/server.ts` | 1+ | Fastify app factory with route registry |
| `crawl-queue.ts` | module | `companion/src/job-postings/` | 2+ | Background crawl job manager |

## CONVENTIONS

- **TypeScript:** strict mode, `noUnusedLocals`, `noUnusedParameters`. No `as any`, no `@ts-*` pragmas.
- **Imports:** path aliases `#/` or `@/` for `apps/web/src/`. Biome organizes imports automatically.
- **Formatting:** Biome with tabs + double quotes.
- **Naming:** Components/PascalCase, hooks+stores/camelCase, tests `*.test.ts`/`*.test.tsx`.
- **Routing:** File-based TanStack Router under `apps/web/src/routes/`.
- **Styling:** Tailwind CSS v4 + Shadcn UI (CLI-managed). Custom globals in `styles.css`.
- **State:** Zustand with devtools + localStorage persistence for stores.
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`). No WIP commits.

## ANTI-PATTERNS (THIS PROJECT)

- Never suppress types (`as any`, `@ts-ignore`, `@ts-expect-error`).
- Never commit local secrets (`.env.local`, Wrangler credentials).
- Never modify Shadcn UI components directly — use the Shadcn CLI to update.
- Never skip `pnpm verify` before handing off feature work.

## COMMANDS

```bash
pnpm dev              # Web (3000) + Companion (47321)
pnpm web:dev          # Web only
pnpm companion:dev    # Companion only
pnpm build            # Build all
pnpm test             # Vitest across workspace
pnpm typecheck        # tsc --noEmit
pnpm verify           # typecheck + test + build
pnpm lint / format    # Biome
pnpm deploy           # Cloudflare Workers
pnpm companion:openapi  # Export OpenAPI JSON
```

## NOTES

- Companion is OPTIONAL — app works without it (manual paste fallback).
- Companion SQLite DB at `apps/companion/.open-resume-companion/jobs.sqlite` (gitignored).
- Local dev needs `pnpm install` at root (workspace-aware).
- Worktrees exist at `.worktrees/` for parallel feature branches — ignore them for main dev.
