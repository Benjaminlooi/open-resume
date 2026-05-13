# Open Resume

A modern, fast, and highly customizable resume builder application. Built with cutting-edge web technologies, it features file-based routing, server-side rendering, and AI integration, optimized for deployment on Cloudflare Workers.

## 🚀 Features

- **Modern UI:** Built with React 19, Tailwind CSS v4, and Shadcn UI.
- **File-Based Routing:** Seamless navigation and code splitting via TanStack Router.
- **Server-Side Rendering:** Enhanced performance and SEO with TanStack Start.
- **State Management:** Fast, persistent global state using Zustand.
- **AI Integration:** Powered by the AI SDK for advanced, intelligent resume building.
- **Analytics:** Integrated with PostHog for product analytics.
- **Edge Deployment:** Optimized for Cloudflare Workers.

## 🛠 Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) (LocalStorage persistence)
- **AI Integration:** [AI SDK](https://sdk.vercel.ai/docs) (`@ai-sdk/react`, OpenAI, Anthropic, Google) & TanStack AI
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) + Lucide React
- **Analytics:** [PostHog](https://posthog.com/)
- **Tooling:** Biome (Linting/Formatting), Vitest (Testing), Wrangler (Cloudflare deployment)

## 📁 Project Structure

```text
src/
├── routes/        # File-based routing via TanStack Router
├── lib/
│   ├── resume-store.ts     # Core Zustand store for resume data
│   ├── settings-store.ts   # Zustand store for app settings
│   └── resume-schema.ts    # Zod schema for resume validation
├── components/
│   ├── editor/             # Complex form components for resume editing
│   ├── dashboard/          # Components for managing saved resumes
│   └── ui/                 # Shared Shadcn UI components
```

## 💻 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed along with [`pnpm`](https://pnpm.io/).

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

Start the Vite development server on `http://localhost:3000`:
```bash
pnpm dev
```

### Build & Preview

Build the application for production:
```bash
pnpm build
```

Preview the production build locally:
```bash
pnpm preview
```

## 📜 Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts the Vite development server. |
| `pnpm build` | Builds the application for production. |
| `pnpm preview` | Starts a local server to preview the production build. |
| `pnpm test` | Runs tests using Vitest. |
| `pnpm format` | Formats code using Biome. |
| `pnpm lint` | Lints code using Biome. |
| `pnpm check` | Runs both lint and format checks via Biome. |
| `pnpm cf-typegen`| Generates TypeScript types for Cloudflare Workers using Wrangler. |
| `pnpm deploy` | Builds the app and deploys it to Cloudflare Workers via Wrangler. |

## 🌐 Deployment

This application is configured for deployment to **Cloudflare Workers**. 

To deploy to your Cloudflare account, run:

```bash
pnpm deploy
```

Ensure your `wrangler.jsonc` is properly configured and you are authenticated via the Wrangler CLI (`pnpm wrangler login`).
