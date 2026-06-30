# Backend Fastify Route Plugins Design

## Goal

Refactor the backend so `apps/backend/src/server.ts` stops growing with every endpoint. The refactor should use Fastify's plugin model for route organization and app infrastructure, while preserving the existing API behavior.

## Current Context

The backend is an API-only Fastify service. It currently creates dependencies, registers global infrastructure, and defines all endpoints inside `createServer()`.

Existing route groups are already visible:

- System: `/health`, `/openapi.json`, `/docs`
- Profile: `/profile`, `/profile/resume`
- Resumes: `/resumes`, `/resumes/:id`, default resume endpoints
- Jobs: `/jobs`, `/jobs/:id`, `/jobs/:id/retry-crawl`

The branch is also moving backend contracts into the shared `@open-resume/contracts` package. The route refactor should keep using those schemas instead of creating a new contract layer.

## Chosen Approach

Use explicit Fastify plugin registration with one new infrastructure dependency: `fastify-plugin`.

`server.ts` remains the composition root. It creates the Fastify instance, repository, crawl queue, and route context. It registers app-level plugins, then registers domain route plugins.

Proposed structure:

```text
apps/backend/src/
  server.ts
  plugins/
    cors.ts
    error-handler.ts
    openapi.ts
  routes/
    context.ts
    system-routes.ts
    profile-routes.ts
    resume-routes.ts
    job-routes.ts
  profile/
    default-profile.ts
```

## Fastify Plugin Boundaries

App infrastructure plugins should live in `plugins/` and be wrapped with `fastify-plugin` when their behavior should apply at the app level instead of being hidden by Fastify encapsulation.

Expected infrastructure plugins:

- `plugins/cors.ts`: register the current localhost-only CORS policy.
- `plugins/error-handler.ts`: register the current Zod-aware error handler and response shape.
- `plugins/openapi.ts`: preserve the current Swagger and Swagger UI setup.

Route plugins should live in `routes/`. They should be Fastify plugin functions returned by factories that receive a typed context:

```ts
server.register(createSystemRoutes(context));
server.register(createProfileRoutes(context));
server.register(createResumeRoutes(context));
server.register(createJobRoutes(context));
```

Route plugins do not need `fastify-plugin` initially because route encapsulation is acceptable. They should not decorate the parent server.

## Route Context

`routes/context.ts` should define the shared dependencies that route plugins may use:

```ts
export interface CompanionRouteContext {
  jobRepository: JobRepository;
  crawlQueue: CrawlQueue;
  getProfilePath(): string;
}
```

Routes may use this context, route schemas from shared contracts, and narrow local helpers. Routes should not create repositories, create crawl queues, instantiate Fastify, or read environment variables.

## URL Strategy

Keep the existing root resource paths, such as `/jobs`, `/resumes`, and `/profile`.

Do not introduce `/api` in this refactor. The backend is an API-only service running separately from the web app, so `/api` would add a breaking route migration without a clear immediate benefit. The route plugin design should still allow a prefix to be added later if the app needs public versioning or mixed web/API hosting.

## Behavior To Preserve

The refactor must preserve:

- Existing URLs and HTTP methods
- Existing response bodies and status codes
- Existing OpenAPI operation IDs and tags
- Existing CORS policy
- Existing error response shape
- Existing `createServer(options)` API
- Existing startup recovery behavior
- Existing repository ownership and cleanup behavior

## Out Of Scope

Do not add these in this pass:

- `@fastify/autoload`
- `@fastify/env`
- `@fastify/sensible`
- API versioning
- `/api` route prefixes
- Repository or crawl queue behavior changes
- Frontend backend client changes

These can be revisited when the app has a concrete need for them.

## Testing

Keep testing primarily at the existing `server.test.ts` integration level. Since public behavior should not change, those tests are the right guardrail.

Run at minimum:

```bash
pnpm --filter @open-resume/backend test
pnpm --filter @open-resume/backend typecheck
```

If OpenAPI registration is touched, also run:

```bash
pnpm --filter @open-resume/backend openapi
pnpm --filter @open-resume/backend openapi:lint
```

## Success Criteria

- `server.ts` is reduced to app composition and lifecycle responsibilities.
- Each route group can be understood without reading unrelated endpoints.
- Fastify infrastructure is registered through named plugins.
- No public API behavior changes.
- Backend tests and typecheck pass.
