# Design Spec: Comprehensive GEMINI.md Update

## Goal
Update `GEMINI.md` to be a comprehensive, architecture-aware guide for developers, strictly using `pnpm` as the package manager and reflecting the current state of the codebase (TanStack Start, React 19, Zustand, AI SDK, etc.).

## 1. Project Overview & Infrastructure
- **Framework:** TanStack Start (React 19).
- **Runtime:** Cloudflare Workers (compatibility via `@cloudflare/vite-plugin`).
- **Description:** A full-stack, SSR-ready resume builder app with file-based routing and localized state management.

## 2. Tech Stack Details
- **Core:** TanStack Start, React 19, TypeScript.
- **State Management:** Zustand (with local storage persistence).
- **AI Integration:** AI SDK (@ai-sdk/react, @ai-sdk/openai, etc.).
- **Styling:** Tailwind CSS v4, Shadcn UI, Lucide React.
- **Analytics:** PostHog.
- **Tooling:** Biome (lint/format), Vitest (unit/integration testing), Wrangler (deployment).

## 3. Architecture & Data Flow
- `src/routes/`: File-based routing via TanStack Router.
- `src/lib/`:
    - `resume-store.ts`: Core Zustand store for resume data.
    - `settings-store.ts`: Zustand store for app settings.
    - `resume-schema.ts`: Zod schema for resume validation.
- `src/components/`:
    - `editor/`: Complex form components for resume editing.
    - `dashboard/`: Components for managing saved resumes.
    - `ui/`: Shared Shadcn components.

## 4. Development Workflow (pnpm)
- **Install:** `pnpm install`
- **Dev:** `pnpm dev` (Vite dev server)
- **Build:** `pnpm build`
- **Test:** `pnpm test` (Vitest)
- **Lint:** `pnpm lint` (Biome)
- **Format:** `pnpm format` (Biome)
- **Typegen:** `pnpm cf-typegen` (Wrangler types)
- **Check:** `pnpm check` (Biome)

## 5. Deployment
- **Command:** `pnpm deploy` (Builds and then runs `wrangler deploy`).

## Success Criteria
- No mentions of `npm` in `GEMINI.md` or the `package.json` deploy script.
- Accurate representation of the project's current architecture and tools.
- Clear, actionable instructions for developers.
