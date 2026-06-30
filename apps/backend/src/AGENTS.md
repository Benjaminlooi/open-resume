# Backend — AGENTS.md

**Fastify 5 daemon** — job scraping, AI analysis, SQLite persistence, OpenAPI.

## STRUCTURE

```
src/
├── routes/              # System, job, application, profile, resume handlers
├── job-postings/        # SQLite repo, crawl queue, AI analyzer
├── extract/             # Playwright scraper, HTML/text clean-up, JSON-LD
├── plugins/             # CORS, error handler, OpenAPI registration
├── profile/             # Default candidate profile
├── db/                  # DB schema (Drizzle)
├── server.ts            # Fastify app factory
├── index.ts             # Daemon entrypoint
├── schema.ts            # Zod contracts
├── config.ts            # Env config
└── openapi.ts           # OpenAPI registry
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add route | `src/routes/*.ts` | Register via route factory pattern |
| Add crawl logic | `src/job-postings/crawl-queue.ts` | Background queue manager |
| Add extraction engine | `src/extract/` | Playwright or text parser |
| Modify AI analysis | `src/job-postings/ai-analyzer.ts` | Provider-agnostic prompt pipeline |
| Extend DB schema | `src/db/schema.ts` | Drizzle schema |
| Modify OpenAPI spec | `src/openapi.ts` + route schemas | Swagger UI auto-generated |

## CONVENTIONS

- Zod 4 for request/response validation. All routes use `fastify-type-provider-zod`.
- Playwright scrapes in headless Chromium — no extra browser deps needed.
- Crawl queue uses SQLite as a job store (polling, not Pub/Sub).
- OpenAPI 3.0 generated from route schemas. Run `pnpm backend:openapi` to export.
- Config via env vars, defaulting in `config.ts`. See `.env.example`.

## ANTI-PATTERNS

- Don't hardcode paths or URLs — use `config.ts`.
- Don't bypass OpenAPI registration — every route must expose its schema.
- Don't store secrets in code — use `.env` (gitignored).
- Don't add heavy dependencies — the backend is intentionally lightweight.
- Route files MUST NOT create repositories, crawl queues, or read env vars directly — inject from `context.ts`.
- Route files MUST NOT decorate the parent server without `fastify-plugin`.
- Don't rely on old synchronous boolean contract for `loadResume()` — await the async result.
