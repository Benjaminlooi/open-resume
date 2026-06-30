# Open Resume

A modern, fast, and highly customizable resume builder application. Built with cutting-edge web technologies, it features file-based routing, server-side rendering, and AI integration, optimized for deployment on Cloudflare Workers. It includes a backend service to scrape and track job postings.

## 🚀 Features

- **Monorepo Architecture:** Organized as a unified `pnpm` workspace with a web frontend and a backend.
- **Modern UI:** Built with React 19, Tailwind CSS v4, and Shadcn UI.
- **File-Based Routing:** Seamless navigation and code splitting via TanStack Router.
- **Server-Side Rendering:** Enhanced performance and SEO with TanStack Start.
- **State Management:** Fast, persistent global state using Zustand.
- **AI Integration:** Powered by the AI SDK for advanced, intelligent resume building.
- **Backend Service:** A local Fastify daemon that handles asynchronous job crawler queues (via Playwright) with SQLite storage, enabling one-click import of job descriptions from URL.
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

### Backend (`apps/backend`)
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
│       ├── lib/            # Stores, schemas, AI helpers, and backend client
│       └── components/     # Editor, dashboard, jobs, and shared UI
└── backend/              # Local Node Fastify backend daemon
    └── src/
        ├── extract/        # Job page text extraction and cleaning helpers
        ├── jobs/           # SQLite repository and background queue
        ├── server.ts       # Fastify app factory and route registry
        └── index.ts        # Backend daemon entrypoint
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

Start the web app and local backend together:
```bash
pnpm dev
```

The web app runs on `http://localhost:3000`. The local backend runs on `http://127.0.0.1:47321`.

Run only the web app:
```bash
pnpm web:dev
```

Run only the local backend:
```bash
pnpm backend:dev
```

---

## 🔌 Local Backend

Open Resume can use the local backend service to extract job details from pasted job URLs.

Configure backend environment variables in `apps/backend/.env`. Start from the checked-in example:
```bash
cp apps/backend/.env.example apps/backend/.env
```

For verbose request and extraction logs, set:
```env
OPEN_RESUME_BACKEND_LOG_LEVEL=debug
```

Check that the backend is running:
```bash
curl http://127.0.0.1:47321/health
```

Expected response:
```json
{"ok":true,"service":"open-resume-backend"}
```

Open `http://localhost:3000/jobs`, create a job application, paste a job URL, and click **Fetch details**. If the backend is not running, the app keeps working with manual job description paste.

### 👤 Candidate Profile & Resume Integration

The Local Backend uses two files stored inside the `.open-resume-backend/` configuration folder to perform background AI evaluations and suitability scoring:

1. **Candidate Profile (`profile.json`)**
   - **Purpose**: Defines your job preferences, target roles/archetypes, exit stories, superpowers, compensation ranges, location flexibility, and visa status.
   - **Management**: Edited dynamically through the **My Profile** GUI on the frontend (`/profile`). Saving the form pushes the update to the backend server via `PUT /profile`.
   - **Scoring**: Used by the AI to assess role-narrative alignment, salary threshold matches, location compatibility, and timezone restrictions.

2. **Synced Default Resume (`resume.json`)**
   - **Purpose**: Holds your current professional resume (experience, summary, skills, and projects).
   - **Management**: Automatically synced from the frontend to the backend daemon on mount, or manually triggered using the **Sync Resume** button on `/profile`.
   - **Scoring**: Analyzed by the AI to calculate keyword alignment, evaluate experience matches, call out skill gaps, and identify relevant strengths.

### Scraped Data Debugging

To debug scraping quality, enable scraped-data logs in `apps/backend/.env`. This prints the raw text and structured data before normalization:
```env
OPEN_RESUME_BACKEND_LOG_LEVEL=debug
OPEN_RESUME_BACKEND_LOG_SCRAPED_DATA=1
```

### OpenAPI Documentation & Testing

The backend exposes OpenAPI docs for manual testing and client tooling:

- `http://127.0.0.1:47321/openapi.json`: Machine-readable OpenAPI 3.0 document.
- `http://127.0.0.1:47321/docs`: Swagger UI for browser-based endpoint testing.

Generate the committed OpenAPI artifact for Bruno/Postman import:
```bash
pnpm backend:openapi
```

Validate the generated OpenAPI contract:
```bash
pnpm --filter @open-resume/backend openapi:lint
```

In Bruno, import `apps/backend/openapi.json` as an OpenAPI collection to generate requests for the backend endpoints.

---

## 📜 Workspace Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts the web app and local backend together. |
| `pnpm web:dev` | Starts only the web app. |
| `pnpm backend:dev` | Starts only the local backend. |
| `pnpm build` | Builds workspace apps for production. |
| `pnpm web:build` | Builds only the web app. |
| `pnpm backend:build` | Builds only the local backend. |
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
