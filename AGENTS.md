# Repository Guidelines

## Project Structure & Module Organization

Open Resume is a TanStack Start app built with React 19, Vite, Tailwind CSS v4, Zustand, Vitest, and Cloudflare Workers. Application code lives in `src/`. File-based routes are in `src/routes/`, including `/`, `/resumes`, and `/editor/$id`. Reusable UI components live in `src/components/ui/`, editor workflows in `src/components/editor/`, dashboard cards and thumbnails in `src/components/dashboard/`, and shared state/schema utilities in `src/lib/`. PostHog integration is isolated under `src/integrations/posthog/`. Static assets are in `public/`; design notes and implementation plans are in `docs/superpowers/`.

## Build, Test, and Development Commands

Use `pnpm` for all package operations.

- `pnpm dev`: start Vite on `http://localhost:3000`.
- `pnpm build`: create a production build.
- `pnpm preview`: serve the production build locally.
- `pnpm test`: run Vitest once.
- `pnpm typecheck`: run `tsc --noEmit` for TypeScript semantic checks.
- `pnpm verify`: run typecheck, tests, and production build.
- `pnpm lint`: run Biome lint rules.
- `pnpm format`: format files with Biome.
- `pnpm check`: run Biome checks for formatting and linting.
- `pnpm cf-typegen`: generate Cloudflare Worker types.
- `pnpm deploy`: build and deploy with Wrangler.

## Coding Style & Naming Conventions

TypeScript is strict and uses `noUnusedLocals` and `noUnusedParameters`; keep imports and props clean. Prefer path aliases `#/*` or `@/*` for `src` imports. Biome formats with tabs and double quotes, and organizes imports. Components and route-level views use PascalCase, hooks/stores use camelCase names such as `useResumeStore`, and tests use `*.test.ts`.

## Testing Guidelines

Vitest is the active test framework. Keep unit tests close to the code they cover, as in `src/lib/resume-store.test.ts` and `src/lib/settings-store.test.ts`. Reset singleton Zustand stores between tests with `beforeEach` when state can leak. Run `pnpm test` before changing store logic, schema behavior, or route data flow.

Run `pnpm typecheck` for TypeScript or React prop/interface changes; Biome and Vite builds do not perform TypeScript semantic checking. Prefer `pnpm verify` before handing off feature work because it runs `pnpm typecheck`, `pnpm test`, and `pnpm build`. `pnpm lint` currently reports existing repository-wide Biome diagnostics, so treat lint output separately unless the task is explicitly to clean up lint.

## Commit & Pull Request Guidelines

Recent history uses short subjects such as `feat: add resume builder landing page`, `fix: broken lock file`, and `chore: update dependencies`. Prefer concise Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) and avoid committing unfinished `WIP` work. PRs should describe the user-visible change, list verification commands run, link related issues when present, and include screenshots for UI changes.

## Security & Configuration Tips

Do not commit local secrets from `.env.local` or Wrangler credentials. Cloudflare deployment settings live in `wrangler.jsonc`; update `compatibility_date`, routes, or flags deliberately and verify with `pnpm build` before deployment.
