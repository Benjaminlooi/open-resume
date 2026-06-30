# Local Backend Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a local Node backend that lets Open Resume extract job details from pasted job URLs through a localhost API.

**Architecture:** Convert the repository into a cohesive pnpm monorepo with `apps/web` for the existing TanStack Start application and `apps/backend` for the local Node backend. The root package becomes an orchestrator only: `pnpm dev` starts both apps, while package-specific scripts remain available through pnpm filters. The backend exposes a health endpoint and a URL extraction endpoint that returns a typed job extraction result, and the web app calls it opportunistically.

**Tech Stack:** pnpm workspace, TypeScript, Fastify, Playwright, Zod, Vitest, tsx, tsup, existing React/TanStack Start app.

---

## File Structure

- Modify `pnpm-workspace.yaml` to include only `apps/*` packages while preserving the existing `allowBuilds` settings.
- Move the current web app files into `apps/web`.
- Replace root `package.json` with monorepo orchestration scripts.
- Move the existing app `package.json` to `apps/web/package.json`.
- Create `apps/backend/package.json` for the local backend package.
- Create `apps/backend/tsconfig.json` for Node-oriented TypeScript.
- Create `apps/backend/vitest.config.ts` for backend tests.
- Create `apps/backend/src/schema.ts` for request/response contracts.
- Create `apps/backend/src/extract/json-ld.ts` for `schema.org/JobPosting` extraction.
- Create `apps/backend/src/extract/html.ts` for readable text fallback extraction.
- Create `apps/backend/src/extract/normalize.ts` for normalizing extracted fields.
- Create `apps/backend/src/server.ts` for the Fastify app factory.
- Create `apps/backend/src/index.ts` for local daemon startup.
- Create `apps/backend/src/*.test.ts` files for unit and route coverage.
- Create `apps/web/src/lib/local-backend-client.ts` in the web app for optional localhost calls.
- Create `apps/web/src/lib/local-backend-client.test.ts` for the web client behavior.
- Modify `apps/web/src/components/jobs/NewJobApplicationModal.tsx` to add a “Fetch details” action beside the URL field.

## Task 1: Add Workspace Scaffolding

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Move: `package.json` to `apps/web/package.json`
- Move: `src/` to `apps/web/src/`
- Move: `public/` to `apps/web/public/`
- Move: `vite.config.ts` to `apps/web/vite.config.ts`
- Move: `tsconfig.json` to `apps/web/tsconfig.json`
- Move: `components.json` to `apps/web/components.json` if present
- Move: `wrangler.jsonc` to `apps/web/wrangler.jsonc` if present
- Move: `test-ai-sdk.ts` to `apps/web/test-ai-sdk.ts`
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/vitest.config.ts`

- [ ] **Step 1: Create app directories and move the existing web app**

Run:

```bash
mkdir -p apps/web apps/backend
git mv package.json apps/web/package.json
git mv src apps/web/src
git mv public apps/web/public
git mv vite.config.ts apps/web/vite.config.ts
git mv tsconfig.json apps/web/tsconfig.json
test ! -f components.json || git mv components.json apps/web/components.json
test ! -f wrangler.jsonc || git mv wrangler.jsonc apps/web/wrangler.jsonc
test ! -f test-ai-sdk.ts || git mv test-ai-sdk.ts apps/web/test-ai-sdk.ts
```

Expected: existing web app manifest, source, and config files are staged as moves under `apps/web`.

- [ ] **Step 2: Update workspace package discovery**

Replace `pnpm-workspace.yaml` with:

```yaml
packages:
  - "apps/*"

allowBuilds:
  '@google/genai': true
  core-js: true
  esbuild: true
  protobufjs: true
  sharp: true
  workerd: true
```

- [ ] **Step 3: Create root package manifest with monorepo orchestration**

Create a new root `package.json`:

```json
{
  "name": "open-resume-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm -r --parallel --filter @open-resume/web --filter @open-resume/backend dev",
    "web:dev": "pnpm --filter @open-resume/web dev",
    "backend:dev": "pnpm --filter @open-resume/backend dev",
    "build": "pnpm -r --filter @open-resume/web --filter @open-resume/backend build",
    "web:build": "pnpm --filter @open-resume/web build",
    "backend:build": "pnpm --filter @open-resume/backend build",
    "test": "pnpm -r --filter @open-resume/web --filter @open-resume/backend test",
    "web:test": "pnpm --filter @open-resume/web test",
    "backend:test": "pnpm --filter @open-resume/backend test",
    "typecheck": "pnpm -r --filter @open-resume/web --filter @open-resume/backend typecheck",
    "verify": "pnpm typecheck && pnpm test && pnpm build",
    "lint": "pnpm --filter @open-resume/web lint",
    "format": "pnpm --filter @open-resume/web format",
    "check": "pnpm --filter @open-resume/web check",
    "deploy": "pnpm --filter @open-resume/web deploy"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 4: Update the web package manifest**

In `apps/web/package.json`, change the existing `"name"` from `"open-resume"` to `"@open-resume/web"`. Keep the existing `private`, `type`, `imports`, `scripts`, `dependencies`, `devDependencies`, and `pnpm` blocks unchanged.

```json
{
  "name": "@open-resume/web",
  "private": true
}
```

- [ ] **Step 5: Create backend package manifest**

Create `apps/backend/package.json`:

```json
{
  "name": "@open-resume/backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsup src/index.ts --format esm --target node22 --dts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^11.1.0",
    "fastify": "^5.8.0",
    "playwright": "^1.57.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^22.19.19",
    "tsup": "^8.5.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 6: Create backend TypeScript config**

Create `apps/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 7: Create backend Vitest config**

Create `apps/backend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 8: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` updates and install completes without dependency resolution errors.

- [ ] **Step 9: Verify package scripts are discoverable**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
```

Expected: TypeScript reports no input files or no errors until source files are added. If it reports no input files, continue to Task 2.

- [ ] **Step 10: Verify unified dev script is discoverable**

Run:

```bash
pnpm dev
```

Expected: pnpm starts both filtered `dev` scripts. Stop it with `Ctrl-C` after confirming `@open-resume/web` starts Vite and `@open-resume/backend` starts `tsx watch`.

- [ ] **Step 11: Commit scaffolding**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml apps/web apps/backend/package.json apps/backend/tsconfig.json apps/backend/vitest.config.ts
git commit -m "chore: scaffold app workspace"
```

## Task 2: Define Backend API Contracts

**Files:**
- Create: `apps/backend/src/schema.ts`
- Test: `apps/backend/src/schema.test.ts`

- [ ] **Step 1: Write schema tests**

Create `apps/backend/src/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  extractJobRequestSchema,
  jobExtractionResultSchema,
} from "./schema.js";

describe("backend schema", () => {
  it("accepts a valid extraction request", () => {
    const parsed = extractJobRequestSchema.parse({
      url: "https://example.com/jobs/123",
    });

    expect(parsed.url).toBe("https://example.com/jobs/123");
  });

  it("rejects non-http URLs", () => {
    expect(() =>
      extractJobRequestSchema.parse({ url: "file:///etc/passwd" }),
    ).toThrow();
  });

  it("accepts a normalized extraction result", () => {
    const parsed = jobExtractionResultSchema.parse({
      sourceUrl: "https://example.com/jobs/123",
      title: "Software Engineer",
      company: "Example Inc",
      location: "Remote",
      description: "Build useful software.",
      rawText: "Software Engineer at Example Inc. Build useful software.",
      extractionMethod: "json-ld",
      extractedAt: 1791571200000,
    });

    expect(parsed.extractionMethod).toBe("json-ld");
  });
});
```

- [ ] **Step 2: Run schema tests and verify they fail**

Run:

```bash
pnpm --filter @open-resume/backend test src/schema.test.ts
```

Expected: FAIL because `apps/backend/src/schema.ts` does not exist.

- [ ] **Step 3: Implement schemas**

Create `apps/backend/src/schema.ts`:

```ts
import { z } from "zod";

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  }, "URL must use http or https");

export const extractJobRequestSchema = z.object({
  url: httpUrlSchema,
});

export type ExtractJobRequest = z.infer<typeof extractJobRequestSchema>;

export const extractionMethodSchema = z.enum([
  "json-ld",
  "readability",
  "playwright",
]);

export const jobExtractionResultSchema = z.object({
  sourceUrl: httpUrlSchema,
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  rawText: z.string(),
  extractionMethod: extractionMethodSchema,
  extractedAt: z.number(),
});

export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const backendErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export type BackendErrorResponse = z.infer<
  typeof backendErrorResponseSchema
>;
```

- [ ] **Step 4: Run schema tests and verify they pass**

Run:

```bash
pnpm --filter @open-resume/backend test src/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit API contracts**

```bash
git add apps/backend/src/schema.ts apps/backend/src/schema.test.ts
git commit -m "feat: define backend extraction contracts"
```

## Task 3: Implement HTML and JSON-LD Extraction

**Files:**
- Create: `apps/backend/src/extract/json-ld.ts`
- Create: `apps/backend/src/extract/html.ts`
- Create: `apps/backend/src/extract/normalize.ts`
- Test: `apps/backend/src/extract/json-ld.test.ts`
- Test: `apps/backend/src/extract/html.test.ts`
- Test: `apps/backend/src/extract/normalize.test.ts`

- [ ] **Step 1: Write JSON-LD tests**

Create `apps/backend/src/extract/json-ld.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractJobPostingJsonLd } from "./json-ld.js";

describe("extractJobPostingJsonLd", () => {
  it("extracts schema.org JobPosting data", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Frontend Engineer",
              "description": "Build React interfaces.",
              "hiringOrganization": { "name": "Acme" },
              "jobLocation": {
                "address": { "addressLocality": "Singapore" }
              }
            }
          </script>
        </head>
      </html>
    `;

    expect(extractJobPostingJsonLd(html)).toEqual({
      title: "Frontend Engineer",
      company: "Acme",
      location: "Singapore",
      description: "Build React interfaces.",
    });
  });

  it("returns null when no JobPosting data exists", () => {
    expect(extractJobPostingJsonLd("<html></html>")).toBeNull();
  });
});
```

- [ ] **Step 2: Write HTML fallback tests**

Create `apps/backend/src/extract/html.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractReadableText } from "./html.js";

describe("extractReadableText", () => {
  it("removes scripts, styles, and repeated whitespace", () => {
    const text = extractReadableText(`
      <html>
        <style>.hidden { display: none; }</style>
        <script>window.secret = true;</script>
        <body>
          <main>
            <h1>Backend Engineer</h1>
            <p>Build crawler services.</p>
          </main>
        </body>
      </html>
    `);

    expect(text).toContain("Backend Engineer");
    expect(text).toContain("Build crawler services.");
    expect(text).not.toContain("window.secret");
    expect(text).not.toContain("display: none");
  });
});
```

- [ ] **Step 3: Write normalization tests**

Create `apps/backend/src/extract/normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeExtraction } from "./normalize.js";

describe("normalizeExtraction", () => {
  it("uses structured fields when available", () => {
    const result = normalizeExtraction({
      sourceUrl: "https://example.com/job",
      rawText: "Fallback text",
      method: "json-ld",
      structured: {
        title: "Product Engineer",
        company: "Example",
        location: "Remote",
        description: "Ship product features.",
      },
    });

    expect(result.title).toBe("Product Engineer");
    expect(result.company).toBe("Example");
    expect(result.location).toBe("Remote");
    expect(result.description).toBe("Ship product features.");
  });

  it("falls back to raw text when structured fields are missing", () => {
    const result = normalizeExtraction({
      sourceUrl: "https://example.com/job",
      rawText: "Senior Designer at Example. Design practical workflows.",
      method: "readability",
      structured: null,
    });

    expect(result.title).toBe("");
    expect(result.company).toBe("");
    expect(result.location).toBe("");
    expect(result.description).toBe(
      "Senior Designer at Example. Design practical workflows.",
    );
  });
});
```

- [ ] **Step 4: Run extraction tests and verify they fail**

Run:

```bash
pnpm --filter @open-resume/backend test src/extract
```

Expected: FAIL because extraction modules do not exist.

- [ ] **Step 5: Implement JSON-LD extraction**

Create `apps/backend/src/extract/json-ld.ts`:

```ts
interface StructuredJobPosting {
  title: string;
  company: string;
  location: string;
  description: string;
}

const scriptRegex =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function extractJobPostingJsonLd(
  html: string,
): StructuredJobPosting | null {
  const matches = [...html.matchAll(scriptRegex)];

  for (const match of matches) {
    const rawJson = decodeHtmlEntities(match[1] ?? "").trim();
    const parsed = parseJsonSafely(rawJson);
    const candidates = flattenJsonLd(parsed);

    for (const candidate of candidates) {
      if (!isJobPosting(candidate)) continue;

      return {
        title: stringValue(candidate.title),
        company: stringValue(candidate.hiringOrganization?.name),
        location: extractLocation(candidate.jobLocation),
        description: stripHtml(stringValue(candidate.description)),
      };
    }
  }

  return null;
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function flattenJsonLd(value: unknown): Record<string, any>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];

  const record = value as Record<string, any>;
  const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [];
  return [record, ...graph.flatMap(flattenJsonLd)];
}

function isJobPosting(value: Record<string, any>): boolean {
  const type = value["@type"];
  if (Array.isArray(type)) return type.includes("JobPosting");
  return type === "JobPosting";
}

function extractLocation(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(extractLocation).filter(Boolean).join("; ");
  }

  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, any>;
  const address = record.address;

  if (typeof address === "string") return address;
  if (address && typeof address === "object") {
    return [
      stringValue(address.addressLocality),
      stringValue(address.addressRegion),
      stringValue(address.addressCountry),
    ]
      .filter(Boolean)
      .join(", ");
  }

  return stringValue(record.name);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
```

- [ ] **Step 6: Implement readable text extraction**

Create `apps/backend/src/extract/html.ts`:

```ts
export function extractReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 7: Implement normalized extraction result**

Create `apps/backend/src/extract/normalize.ts`:

```ts
import type { JobExtractionResult } from "../schema.js";

type ExtractionMethod = JobExtractionResult["extractionMethod"];

interface StructuredFields {
  title: string;
  company: string;
  location: string;
  description: string;
}

interface NormalizeExtractionInput {
  sourceUrl: string;
  rawText: string;
  method: ExtractionMethod;
  structured: StructuredFields | null;
}

export function normalizeExtraction(
  input: NormalizeExtractionInput,
): JobExtractionResult {
  return {
    sourceUrl: input.sourceUrl,
    title: input.structured?.title ?? "",
    company: input.structured?.company ?? "",
    location: input.structured?.location ?? "",
    description: input.structured?.description || input.rawText,
    rawText: input.rawText,
    extractionMethod: input.method,
    extractedAt: Date.now(),
  };
}
```

- [ ] **Step 8: Run extraction tests and verify they pass**

Run:

```bash
pnpm --filter @open-resume/backend test src/extract
```

Expected: PASS.

- [ ] **Step 9: Commit extraction modules**

```bash
git add apps/backend/src/extract
git commit -m "feat: extract job details from html"
```

## Task 4: Build the Fastify Backend Server

**Files:**
- Create: `apps/backend/src/server.ts`
- Create: `apps/backend/src/index.ts`
- Test: `apps/backend/src/server.test.ts`

- [ ] **Step 1: Write route tests**

Create `apps/backend/src/server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createServer } from "./server.js";

describe("backend server", () => {
  it("responds to health checks", async () => {
    const server = createServer();
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: "open-resume-backend",
    });
  });

  it("rejects invalid extraction requests", async () => {
    const server = createServer();
    const response = await server.inject({
      method: "POST",
      url: "/extract-job",
      payload: { url: "file:///etc/passwd" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Invalid extraction request",
    });
  });
});
```

- [ ] **Step 2: Run route tests and verify they fail**

Run:

```bash
pnpm --filter @open-resume/backend test src/server.test.ts
```

Expected: FAIL because `createServer` is not defined.

- [ ] **Step 3: Implement Fastify app factory**

Create `apps/backend/src/server.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { extractReadableText } from "./extract/html.js";
import { extractJobPostingJsonLd } from "./extract/json-ld.js";
import { normalizeExtraction } from "./extract/normalize.js";
import { extractJobRequestSchema } from "./schema.js";

export function createServer() {
  const server = Fastify({
    logger: false,
  });

  server.register(cors, {
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  });

  server.get("/health", async () => ({
    ok: true,
    service: "open-resume-backend",
  }));

  server.post("/extract-job", async (request, reply) => {
    const parsed = extractJobRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid extraction request",
        details: parsed.error.message,
      });
    }

    const response = await fetch(parsed.data.url, {
      headers: {
        "user-agent":
          "OpenResumeBackend/0.1 (+https://github.com/Benjaminlooi/resume-builder)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return reply.status(502).send({
        error: "Failed to fetch job URL",
        details: `${response.status} ${response.statusText}`,
      });
    }

    const html = await response.text();
    const rawText = extractReadableText(html);
    const structured = extractJobPostingJsonLd(html);
    const result = normalizeExtraction({
      sourceUrl: parsed.data.url,
      rawText,
      method: structured ? "json-ld" : "readability",
      structured,
    });

    return reply.send(result);
  });

  return server;
}
```

- [ ] **Step 4: Implement daemon entrypoint**

Create `apps/backend/src/index.ts`:

```ts
import { createServer } from "./server.js";

const port = Number.parseInt(process.env.OPEN_RESUME_BACKEND_PORT ?? "47321", 10);
const host = process.env.OPEN_RESUME_BACKEND_HOST ?? "127.0.0.1";

const server = createServer();

try {
  await server.listen({ host, port });
  console.log(`Open Resume backend listening on http://${host}:${port}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
```

- [ ] **Step 5: Run route tests and verify they pass**

Run:

```bash
pnpm --filter @open-resume/backend test src/server.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run backend typecheck**

Run:

```bash
pnpm --filter @open-resume/backend typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit server bootstrap**

```bash
git add apps/backend/src/server.ts apps/backend/src/index.ts apps/backend/src/server.test.ts
git commit -m "feat: add local backend server"
```

## Task 5: Add Playwright Fallback Extraction

**Files:**
- Modify: `apps/backend/src/server.ts`
- Create: `apps/backend/src/extract/playwright.ts`
- Test: `apps/backend/src/extract/playwright.test.ts`

- [ ] **Step 1: Write Playwright unit test with injected page HTML**

Create `apps/backend/src/extract/playwright.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizePlaywrightExtraction } from "./playwright.js";

describe("normalizePlaywrightExtraction", () => {
  it("returns readable text from rendered html", () => {
    const result = normalizePlaywrightExtraction({
      sourceUrl: "https://example.com/job",
      html: "<main><h1>AI Engineer</h1><p>Build hiring tools.</p></main>",
    });

    expect(result.description).toContain("AI Engineer");
    expect(result.description).toContain("Build hiring tools.");
    expect(result.extractionMethod).toBe("playwright");
  });
});
```

- [ ] **Step 2: Run Playwright test and verify it fails**

Run:

```bash
pnpm --filter @open-resume/backend test src/extract/playwright.test.ts
```

Expected: FAIL because `playwright.ts` does not exist.

- [ ] **Step 3: Implement Playwright extraction helper**

Create `apps/backend/src/extract/playwright.ts`:

```ts
import { chromium } from "playwright";
import { extractReadableText } from "./html.js";
import { extractJobPostingJsonLd } from "./json-ld.js";
import { normalizeExtraction } from "./normalize.js";
import type { JobExtractionResult } from "../schema.js";

export function normalizePlaywrightExtraction(input: {
  sourceUrl: string;
  html: string;
}): JobExtractionResult {
  const rawText = extractReadableText(input.html);
  const structured = extractJobPostingJsonLd(input.html);

  return normalizeExtraction({
    sourceUrl: input.sourceUrl,
    rawText,
    method: "playwright",
    structured,
  });
}

export async function extractWithPlaywright(
  sourceUrl: string,
): Promise<JobExtractionResult> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    const html = await page.content();
    return normalizePlaywrightExtraction({ sourceUrl, html });
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 4: Update server fallback logic**

In `apps/backend/src/server.ts`, add this import:

```ts
import { extractWithPlaywright } from "./extract/playwright.js";
```

Replace the fetch failure block:

```ts
if (!response.ok) {
  return reply.status(502).send({
    error: "Failed to fetch job URL",
    details: `${response.status} ${response.statusText}`,
  });
}
```

with:

```ts
if (!response.ok) {
  const result = await extractWithPlaywright(parsed.data.url);
  return reply.send(result);
}
```

After `const result = normalizeExtraction(...)`, add:

```ts
if (!result.description || result.description.length < 160) {
  const playwrightResult = await extractWithPlaywright(parsed.data.url);
  return reply.send(playwrightResult);
}
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
pnpm --filter @open-resume/backend test
```

Expected: PASS.

- [ ] **Step 6: Run Playwright browser install**

Run:

```bash
pnpm --filter @open-resume/backend exec playwright install chromium
```

Expected: Chromium installs for local extraction.

- [ ] **Step 7: Commit Playwright fallback**

```bash
git add apps/backend/src/extract/playwright.ts apps/backend/src/extract/playwright.test.ts apps/backend/src/server.ts
git commit -m "feat: add playwright extraction fallback"
```

## Task 6: Add Web App Backend Client

**Files:**
- Create: `apps/web/src/lib/local-backend-client.ts`
- Test: `apps/web/src/lib/local-backend-client.test.ts`

- [ ] **Step 1: Write web client tests**

Create `apps/web/src/lib/local-backend-client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJobWithLocalBackend } from "./local-backend-client";

describe("local backend client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns extracted job details from the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          sourceUrl: "https://example.com/job",
          title: "Engineer",
          company: "Example",
          location: "Remote",
          description: "Build software.",
          rawText: "Engineer at Example. Build software.",
          extractionMethod: "json-ld",
          extractedAt: 1791571200000,
        }),
      })),
    );

    const result = await extractJobWithLocalBackend("https://example.com/job");

    expect(result).toMatchObject({
      title: "Engineer",
      company: "Example",
      description: "Build software.",
    });
  });

  it("returns a user-facing error when the backend is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(
      extractJobWithLocalBackend("https://example.com/job"),
    ).rejects.toThrow("Local backend is not reachable");
  });
});
```

- [ ] **Step 2: Run web client tests and verify they fail**

Run:

```bash
pnpm --filter @open-resume/web test src/lib/local-backend-client.test.ts
```

Expected: FAIL because `local-backend-client.ts` does not exist.

- [ ] **Step 3: Implement web client**

Create `apps/web/src/lib/local-backend-client.ts`:

```ts
import { z } from "zod";

const backendBaseUrl = "http://127.0.0.1:47321";

const jobExtractionResultSchema = z.object({
  sourceUrl: z.string().url(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  rawText: z.string(),
  extractionMethod: z.enum(["json-ld", "readability", "playwright"]),
  extractedAt: z.number(),
});

export type LocalBackendJobExtraction = z.infer<
  typeof jobExtractionResultSchema
>;

export async function extractJobWithLocalBackend(
  url: string,
): Promise<LocalBackendJobExtraction> {
  let response: Response;

  try {
    response = await fetch(`${backendBaseUrl}/extract-job`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new Error(
      "Local backend is not reachable. Start it with pnpm --filter @open-resume/backend dev.",
    );
  }

  if (!response.ok) {
    throw new Error("Local backend could not extract this job URL.");
  }

  return jobExtractionResultSchema.parse(await response.json());
}
```

- [ ] **Step 4: Run web client tests and verify they pass**

Run:

```bash
pnpm --filter @open-resume/web test src/lib/local-backend-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit web client**

```bash
git add apps/web/src/lib/local-backend-client.ts apps/web/src/lib/local-backend-client.test.ts
git commit -m "feat: add local backend client"
```

## Task 7: Wire URL Extraction Into New Job Modal

**Files:**
- Modify: `apps/web/src/components/jobs/NewJobApplicationModal.tsx`
- Test: `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx`

- [ ] **Step 1: Add modal behavior test**

Append this test to `apps/web/src/components/jobs/NewJobApplicationModal.test.tsx`:

```tsx
it("fills job fields from the local backend", async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      sourceUrl: "https://example.com/job",
      title: "Backend Engineer",
      company: "Example",
      location: "Remote",
      description: "Build extraction services.",
      rawText: "Backend Engineer at Example. Build extraction services.",
      extractionMethod: "json-ld",
      extractedAt: 1791571200000,
    }),
  } as Response);

  render(<NewJobApplicationModal onClose={vi.fn()} />);

  await userEvent.type(
    screen.getByLabelText(/Job URL/i),
    "https://example.com/job",
  );
  await userEvent.click(screen.getByRole("button", { name: /Fetch details/i }));

  expect(await screen.findByDisplayValue("Example")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Backend Engineer")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Remote")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Build extraction services.")).toBeInTheDocument();
});
```

If the existing test file does not already mock global `fetch`, add this near the top:

```ts
const fetch = vi.fn();
vi.stubGlobal("fetch", fetch);
```

- [ ] **Step 2: Run modal test and verify it fails**

Run:

```bash
pnpm --filter @open-resume/web test src/components/jobs/NewJobApplicationModal.test.tsx
```

Expected: FAIL because the Fetch details button does not exist.

- [ ] **Step 3: Import the backend client**

In `apps/web/src/components/jobs/NewJobApplicationModal.tsx`, add:

```ts
import { extractJobWithLocalBackend } from "#/lib/local-backend-client";
```

- [ ] **Step 4: Add extraction loading state**

Inside `NewJobApplicationModal`, after the existing `error` state, add:

```ts
const [isExtracting, setIsExtracting] = useState(false);
```

- [ ] **Step 5: Add extraction handler**

Inside `NewJobApplicationModal`, before `handleSubmit`, add:

```ts
const handleFetchDetails = async () => {
  if (!sourceUrl.trim()) {
    setError("Job URL is required before fetching details");
    return;
  }

  setError("");
  setIsExtracting(true);

  try {
    const extracted = await extractJobWithLocalBackend(sourceUrl.trim());
    setCompany(extracted.company);
    setTitle(extracted.title);
    setLocation(extracted.location);
    setDescription(extracted.description);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to fetch job details");
  } finally {
    setIsExtracting(false);
  }
};
```

- [ ] **Step 6: Replace the Job URL field block**

Replace the existing Job URL `<div>` in `apps/web/src/components/jobs/NewJobApplicationModal.tsx` with:

```tsx
<div>
  <label className="block text-sm font-bold mb-1" htmlFor="job-url">
    Job URL
  </label>
  <div className="flex gap-2">
    <input
      id="job-url"
      type="url"
      value={sourceUrl}
      onChange={(e) => setSourceUrl(e.target.value)}
      placeholder="e.g. https://company.com/careers/123"
      className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
    />
    <button
      type="button"
      onClick={handleFetchDetails}
      disabled={isExtracting}
      className="shrink-0 px-3 py-2 border-2 border-border rounded-base font-bold hover:bg-main/5 disabled:opacity-60 cursor-pointer bg-white"
    >
      {isExtracting ? "Fetching" : "Fetch details"}
    </button>
  </div>
</div>
```

- [ ] **Step 7: Add htmlFor/id labels for required test selectors**

Change the Company label and input to:

```tsx
<label className="block text-sm font-bold mb-1" htmlFor="job-company">
  Company <span className="text-red-500">*</span>
</label>
<input
  id="job-company"
  type="text"
  required
  value={company}
  onChange={(e) => setCompany(e.target.value)}
  placeholder="e.g. Acme Corp"
  className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
/>
```

Change the Job Title label and input to:

```tsx
<label className="block text-sm font-bold mb-1" htmlFor="job-title">
  Job Title <span className="text-red-500">*</span>
</label>
<input
  id="job-title"
  type="text"
  required
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  placeholder="e.g. Software Engineer"
  className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
/>
```

Change the Location label and input to:

```tsx
<label className="block text-sm font-bold mb-1" htmlFor="job-location">
  Location
</label>
<input
  id="job-location"
  type="text"
  value={location}
  onChange={(e) => setLocation(e.target.value)}
  placeholder="e.g. Remote / New York"
  className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
/>
```

Change the Job Description label and textarea to:

```tsx
<label className="block text-sm font-bold mb-1" htmlFor="job-description">
  Job Description
</label>
<textarea
  id="job-description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="Paste job description here..."
  rows={6}
  className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main font-mono text-sm bg-white"
/>
```

- [ ] **Step 8: Run modal test**

Run:

```bash
pnpm --filter @open-resume/web test src/components/jobs/NewJobApplicationModal.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit UI integration**

```bash
git add apps/web/src/components/jobs/NewJobApplicationModal.tsx apps/web/src/components/jobs/NewJobApplicationModal.test.tsx
git commit -m "feat: fetch job details from local backend"
```

## Task 8: Verify End-to-End Bootstrap

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add monorepo and local backend usage docs**

Add this section to `README.md`:

````md
## Development

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

## Local Backend

Open Resume can use the optional local backend service to extract job details from pasted job URLs.

```bash
curl http://127.0.0.1:47321/health
```

Expected response:

```json
{"ok":true,"service":"open-resume-backend"}
```

Open `http://localhost:3000/jobs`, create a job application, paste a job URL, and click **Fetch details**. If the backend is not running, the app keeps working with manual job description paste.
````

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm backend:test
pnpm backend:build
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands pass.

- [ ] **Step 3: Run local smoke test**

Terminal 1:

```bash
pnpm dev
```

Terminal 2:

```bash
curl http://127.0.0.1:47321/health
```

Expected:

```json
{"ok":true,"service":"open-resume-backend"}
```

Terminal 2:

```bash
curl -X POST http://127.0.0.1:47321/extract-job \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com"}'
```

Expected: JSON response with `sourceUrl`, `description`, `rawText`, `extractionMethod`, and `extractedAt`.

- [ ] **Step 4: Commit docs and verification updates**

```bash
git add README.md
git commit -m "docs: document local backend workflow"
```

## Self-Review

- Spec coverage: The plan covers a cohesive pnpm monorepo shape, moving the web app to `apps/web`, adding a local Node backend, a single root `pnpm dev`, localhost API extraction, typed contracts, web app integration, and verification. It does not include desktop packaging, cloud sync, authentication, persistent local backend storage, or batch scanning; those are intentionally out of scope for bootstrap.
- Placeholder scan: No task uses open-ended placeholders. Each code-changing step includes exact files, code, commands, and expected results.
- Type consistency: The extraction methods are consistently `json-ld`, `readability`, and `playwright`; the web client and backend schema use the same response fields; modal state maps directly into the existing `createJobApplication` fields.
