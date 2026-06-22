# Open Resume Development Guide

Welcome to the Open Resume developer documentation. This document combines repository guidelines, project overview, and development workflows.

## Project Overview & Tech Stack

Open Resume is structured as a pnpm monorepo containing a frontend web application and an optional local companion backend.

### Frontend (`apps/web`)
Open Resume is a resume builder application optimized for Cloudflare Workers (via compatibility flags) with SSR-ready file-based routing.
- **Framework:** TanStack Start (React 19)
- **State Management:** Zustand (with LocalStorage persistence)
- **AI Integration:** AI SDK (`@ai-sdk/react`, `@ai-sdk/openai`, etc.)
- **Styling:** Tailwind CSS v4 + Shadcn UI + Lucide React
- **Analytics:** PostHog
- **Tooling:** Vite, Wrangler (deployment), Vitest

### Companion Backend (`apps/companion`)
A local companion service running on localhost that assists with job details extraction and crawling from pasted job URLs.
- **Framework:** Fastify 5
- **Intake Database:** SQLite via native Node.js `node:sqlite` (used for queueing and caching scraped job data)
- **Crawler:** Playwright (headless Chromium) for dynamic page scraping
- **Validation & Serialization:** Zod 4, fastify-type-provider-zod
- **API Spec:** OpenAPI 3.0 (with Swagger UI and Redocly verification)
- **Tooling:** tsx, tsup, Vitest

---

## Project Structure & Core Architecture

Application code lives inside the `apps/` directory:

### Web Frontend (`apps/web`)
- `apps/web/src/routes/`: File-based routing via TanStack Router (e.g., `/`, `/resumes`, `/jobs`, `/editor/$id`).
- `apps/web/src/components/`:
  - `ui/`: Shared, reusable components (managed via Shadcn CLI).
  - `editor/`: Complex form components and workflows for resume editing.
  - `dashboard/`: Components for managing saved resumes (cards, thumbnails, etc.).
  - `jobs/`: Job tracker components (modals, integrity panels, application cards).
- `apps/web/src/lib/`: Shared state, schemas, and utility functions:
  - `resume-store.ts`: Core Zustand store for resume data.
  - `settings-store.ts`: Zustand store for app settings.
  - `job-application-store.ts`: Zustand store for tracking job applications.
  - `local-companion-client.ts`: Client API helper that integrates with the local companion server.
- `apps/web/src/integrations/posthog/`: Isolated PostHog analytics integration.
- `apps/web/public/`: Static assets.

### Companion Backend (`apps/companion`)
- `apps/companion/src/server.ts`: Fastify app definition and route handler factory.
- `apps/companion/src/index.ts`: Node daemon runner, startup logic, and database bootstrapping.
- `apps/companion/src/schema.ts`: Zod schema contracts for jobs, requests, responses, and validation.
- `apps/companion/src/openapi.ts`: OpenAPI generation registry helper.
- `apps/companion/src/jobs/`: SQLite persistence repository (`repository.ts`) and background crawl queue manager (`crawl-queue.ts`).
- `apps/companion/src/extract/`: Scraping engines. Uses Playwright (`playwright.ts`) to fetch raw pages (including frames) and HTML text clean-up utilities (`html.ts`, `json-ld.ts`).

---

## Build, Test, and Development Commands

Use `pnpm` for all workspace package operations. Commands can be run at the root (affecting both `web` and `companion` packages via filters) or targeted.

### Setup & Installation
- `pnpm install`: Install all dependencies across the workspace.

### Development & Preview
- `pnpm dev`: Start both the Vite web dev server (port `3000`) and the companion Fastify server (port `47321`) concurrently.
- `pnpm web:dev`: Start only the web development server.
- `pnpm companion:dev`: Start only the companion backend.
- `pnpm build`: Build both the web frontend and the companion backend.
- `pnpm web:build`: Build only the web application.
- `pnpm companion:build`: Build only the companion backend.
- `pnpm preview`: Serve the production build of the web app locally.
- `pnpm web:preview`: Serve the production build of the web app locally.

### Testing & Verification
- `pnpm test`: Run Vitest unit tests across both packages.
- `pnpm web:test`: Run Vitest tests for the web app.
- `pnpm companion:test`: Run Vitest tests for the companion backend.
- `pnpm typecheck`: Run TypeScript semantic compilation checks (`tsc --noEmit`) on all packages.
- `pnpm verify`: Runs typecheck, tests, and build workspace-wide to verify project status.

### Linting & Formatting
- `pnpm lint`: Run Biome lint rules.
- `pnpm format`: Format files across the workspace with Biome.
- `pnpm check`: Run Biome checks for formatting and linting.

### OpenAPI Commands
- `pnpm companion:openapi`: Export OpenAPI JSON schema artifact to `apps/companion/openapi.json`.
- `pnpm --filter @open-resume/companion openapi:lint`: Validate OpenAPI schema using Redocly.

### Deployment & Workers
- `pnpm cf-typegen`: Generate Cloudflare Worker bindings in `apps/web`.
- `pnpm deploy`: Build and deploy the web app to Cloudflare Workers using Wrangler.

---

## Development & Naming Conventions

- **Routing:** Add files under `apps/web/src/routes/` to create new file-based routes. Use `<Link>` from `@tanstack/react-router` for navigation.
- **Styling:** Tailwind CSS v4. Edit `apps/web/src/styles.css` for custom global CSS. Use Shadcn components for UI elements.
- **Components:** Add components via Shadcn CLI inside `apps/web` using:
  ```bash
  pnpm dlx shadcn@latest add <component-name>
  ```
- **State:** Use Zustand stores under `apps/web/src/lib/` for global/persistent state.
- **Coding Style:** 
  - TypeScript is strict and uses `noUnusedLocals` and `noUnusedParameters`; keep imports and props clean.
  - In `apps/web`, prefer path aliases `#/*` or `@/*` for `src` imports.
  - Biome formats with tabs and double quotes, and organizes imports.
  - Components and route-level views use PascalCase, hooks/stores use camelCase names (e.g., `useResumeStore`), and tests use `*.test.ts` or `*.test.tsx`.

---

## Testing Guidelines

Vitest is the active test framework.
- Keep unit tests close to the code they cover (e.g., `apps/web/src/lib/resume-store.test.ts` and `apps/companion/src/jobs/repository.test.ts`).
- Reset singleton Zustand stores between tests with `beforeEach` in frontend tests when state can leak.
- Reset/mock SQLite test databases (e.g., using `:memory:`) between test suites in the backend.
- Run `pnpm test` before changing store logic, schema behavior, database code, or route data flow.
- Run `pnpm typecheck` for TypeScript or React prop/interface changes (as Biome and Vite builds do not perform TypeScript semantic checking).
- Prefer running `pnpm verify` before handing off feature work to guarantee everything builds and passes tests.
- Treat lint output separately unless explicitly tasked with cleanup.

---

## Commit & Pull Request Guidelines

- Use concise Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) and avoid committing unfinished `WIP` work.
- Example messages: `feat: add resume builder landing page`, `fix: broken lock file`, `feat(companion): add sqlite job store`.
- PRs must describe the user-visible change, list verification commands run, link related issues, and include screenshots for UI changes.

---

## Security & Configuration Tips

- **Local Secrets:** Do not commit local secrets from `apps/web/.env.local` or `apps/companion/.env`. Do not check in Wrangler credentials.
- **Wrangler Configuration:** Cloudflare deployment settings live in `apps/web/wrangler.jsonc`. Update compatibility settings deliberately and verify with `pnpm build` before deployment.
- **Local DB:** The companion's local SQLite database is stored in `apps/companion/.open-resume-companion/jobs.sqlite` by default (defined in environment variables or defaulting to workspace paths) and is git-ignored.
