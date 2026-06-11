# Open Resume

A modern, fast, and highly customizable resume builder application. Built with cutting-edge web technologies, it features file-based routing, server-side rendering, and AI integration, optimized for deployment on Cloudflare Workers. It includes a companion backend service to scrape and track job postings.

## 🚀 Features

- **Monorepo Architecture:** Organized as a unified `pnpm` workspace with a web frontend and a companion backend.
- **Modern UI:** Built with React 19, Tailwind CSS v4, and Shadcn UI.
- **File-Based Routing:** Seamless navigation and code splitting via TanStack Router.
- **Server-Side Rendering:** Enhanced performance and SEO with TanStack Start.
- **State Management:** Fast, persistent global state using Zustand.
- **AI Integration:** Powered by the AI SDK for advanced, intelligent resume building.
- **Companion Backend:** A local Fastify daemon that handles asynchronous job crawler queues (via Playwright) with SQLite storage, enabling one-click import of job descriptions from URL.
- **Analytics:** Integrated with PostHog for product analytics.
- **Edge Deployment:** Frontend is optimized for Cloudflare Workers.

## 🛠 Tech Stack

### Frontend (`apps/web`)
- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) (LocalStorage persistence)
- **AI Integration:** [AI SDK](https://sdk.vercel.ai/docs) (`@ai-sdk/react`, OpenAI, Anthropic, Google) & TanStack AI
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) + Lucide React
- **Analytics:** [PostHog](https://posthog.com/)
- **Tooling:** Biome (Linting/Formatting), Vitest (Testing), Wrangler (Cloudflare deployment)

### Companion Backend (`apps/companion`)
- **Framework:** Fastify 5
- **Crawler:** Playwright (headless Chromium) for dynamic page retrieval
- **Database:** SQLite via native Node.js `node:sqlite`
- **Validation:** Zod 4
- **API Spec:** OpenAPI 3.0 (verified with Redocly)
- **Tooling:** tsx, tsup, Vitest

---

## 📁 Project Structure

```text
apps/
├── web/                    # TanStack Start frontend app
│   └── src/
│       ├── routes/         # File-based routing via TanStack Router
│       ├── lib/            # Stores, schemas, AI helpers, and companion client
│       └── components/     # Editor, dashboard, jobs, and shared UI
└── companion/              # Local Node Fastify companion backend daemon
    └── src/
        ├── extract/        # Job page text extraction and cleaning helpers
        ├── jobs/           # SQLite repository and background queue
        ├── server.ts       # Fastify app factory and route registry
        └── index.ts        # Companion daemon entrypoint
```

---

## 💻 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v22+) installed along with [`pnpm`](https://pnpm.io/).

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd resume-builder
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development Workflow

Start the web app and local companion together:
```bash
pnpm dev
```

The web app runs on `http://localhost:3000`. The local companion runs on `http://127.0.0.1:47321`.

Run only the web app:
```bash
pnpm web:dev
```

Run only the local companion:
```bash
pnpm companion:dev
```

---

## 🔌 Local Companion

Open Resume can use the local companion service to extract job details from pasted job URLs.

Configure companion environment variables in `apps/companion/.env`. Start from the checked-in example:
```bash
cp apps/companion/.env.example apps/companion/.env
```

For verbose request and extraction logs, set:
```env
OPEN_RESUME_COMPANION_LOG_LEVEL=debug
```

Check that the companion is running:
```bash
curl http://127.0.0.1:47321/health
```

Expected response:
```json
{"ok":true,"service":"open-resume-companion"}
```

Open `http://localhost:3000/jobs`, create a job application, paste a job URL, and click **Fetch details**. If the companion is not running, the app keeps working with manual job description paste.

### Scraped Data Debugging

To debug scraping quality, enable scraped-data logs in `apps/companion/.env`. This prints the raw text and structured data before normalization:
```env
OPEN_RESUME_COMPANION_LOG_LEVEL=debug
OPEN_RESUME_COMPANION_LOG_SCRAPED_DATA=1
```

### OpenAPI Documentation & Testing

The companion exposes OpenAPI docs for manual testing and client tooling:

- `http://127.0.0.1:47321/openapi.json`: Machine-readable OpenAPI 3.0 document.
- `http://127.0.0.1:47321/docs`: Swagger UI for browser-based endpoint testing.

Generate the committed OpenAPI artifact for Bruno/Postman import:
```bash
pnpm companion:openapi
```

Validate the generated OpenAPI contract:
```bash
pnpm --filter @open-resume/companion openapi:lint
```

In Bruno, import `apps/companion/openapi.json` as an OpenAPI collection to generate requests for the companion endpoints.

---

## 📜 Workspace Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts the web app and local companion together. |
| `pnpm web:dev` | Starts only the web app. |
| `pnpm companion:dev` | Starts only the local companion. |
| `pnpm build` | Builds workspace apps for production. |
| `pnpm web:build` | Builds only the web app. |
| `pnpm companion:build` | Builds only the local companion. |
| `pnpm preview` | Starts a local server to preview the web production build. |
| `pnpm test` | Runs workspace tests using Vitest. |
| `pnpm typecheck` | Runs TypeScript checks across workspace apps. |
| `pnpm format` | Formats code using Biome. |
| `pnpm lint` | Lints code using Biome. |
| `pnpm check` | Runs both lint and format checks via Biome. |
| `pnpm cf-typegen` | Generates TypeScript types for Cloudflare Workers using Wrangler. |
| `pnpm deploy` | Builds the app and deploys it to Cloudflare Workers via Wrangler. |

---

## 🌐 Deployment

This application is configured for deployment to **Cloudflare Workers**. 

To deploy to your Cloudflare account, run:

```bash
pnpm deploy
```

Ensure `apps/web/wrangler.jsonc` is properly configured and you are authenticated via the Wrangler CLI (`pnpm --filter @open-resume/web wrangler login`).
