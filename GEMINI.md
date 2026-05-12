# Project Overview

Resume builder app built with **TanStack Start**, **React 19**, and **TypeScript**. 
Optimized for **Cloudflare Workers** (via compatibility flags).
SSR ready with file-based routing via **TanStack Router**.
Styling via **Tailwind CSS v4** + **Shadcn UI**.
Analytics via **PostHog**.

# Tech Stack

- **Framework:** TanStack Start (React 19)
- **State Management:** Zustand (with LocalStorage persistence)
- **AI Integration:** AI SDK (@ai-sdk/react, @ai-sdk/openai, etc.)
- **Styling:** Tailwind CSS v4, Shadcn UI, Lucide React
- **Analytics:** PostHog
- **Tooling:** Biome (lint/format), Vitest (testing), Wrangler (deployment)

# Core Architecture

- `src/routes/`: File-based routing via TanStack Router.
- `src/lib/`:
    - `resume-store.ts`: Core Zustand store for resume data.
    - `settings-store.ts`: Zustand store for app settings.
    - `resume-schema.ts`: Zod schema for resume validation.
- `src/components/`:
    - `editor/`: Complex form components for resume editing.
    - `dashboard/`: Components for managing saved resumes.
    - `ui/`: Shared Shadcn components.

# Development Workflow

All commands use `pnpm`.

- **Install:** `pnpm install`
- **Dev server:** `pnpm dev` (Vite dev server)
- **Build prod:** `pnpm build`
- **Preview prod:** `pnpm preview`
- **Run tests:** `pnpm test` (Vitest)
- **Lint/Format:** `pnpm lint` or `pnpm format` (Biome)
- **Typegen:** `pnpm cf-typegen` (Wrangler types)
- **Check:** `pnpm check` (Biome)

# Development Conventions

- **Routing:** Add files in `src/routes/` to create routes. Use `<Link>` from `@tanstack/react-router`.
- **Styling:** Tailwind CSS v4. Edit `src/styles.css`. Use Shadcn components for UI elements.
- **Components:** Add Shadcn components via `pnpm dlx shadcn@latest add <component>`.
- **State:** Use Zustand stores in `src/lib/` for global/persistent state.

# Deployment

The app is deployed to Cloudflare Workers.

- **Deploy:** `pnpm deploy` (Builds and then runs `wrangler deploy`)
