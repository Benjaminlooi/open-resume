# Project Overview

Resume builder app. Use TanStack Start, React 19, TypeScript. 
SSR ready. File-based routing via TanStack Router.
Manage work/edu content via markdown (`content-collections`).
Styling via Tailwind CSS v4 + Shadcn UI.
Analytics via PostHog.

# Architecture & Structure

- `content/jobs/` + `content/education/`: Markdown files.
- `src/routes/`: Route components.
- `src/components/ui/`: Shadcn components.
- `src/lib/`: Utilities.

# Building and Running

Commands use `npm` or `pnpm`.

- Dev server: `npm run dev` (run `vite dev --port 3000`)
- Build prod: `npm run build`
- Preview prod: `npm run preview`
- Run tests: `npm run test` (Vitest)

# Development Conventions

- **Routing:** Add files in `src/routes/` to create routes. Use `<Link>` from `@tanstack/react-router`.
- **Content:** Add `.md` files in `content/jobs/` or `content/education/` with frontmatter (`jobTitle`, `company`, `startDate`, etc.).
- **Lint/Format:** Use Biome. Run `npm run lint` or `npm run format`.
- **Components:** Add Shadcn components via `pnpm dlx shadcn@latest add <component>`.
- **Styling:** Tailwind CSS. Edit `src/styles.css`.
