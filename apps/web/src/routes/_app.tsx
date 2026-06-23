import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppHeader from "#/components/dashboard/AppHeader";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

/**
 * Pathless layout route for the authenticated/app section.
 *
 * The leading underscore makes this a *pathless* layout: it is a parent of
 * every route nested under `routes/_app/` (resumes, profile, editor, jobs)
 * without contributing a URL segment — so `/resumes`, `/jobs/$id`, etc. keep
 * their existing paths. It exists solely to mount the shared `<AppHeader />`
 * once for those pages, keeping it off routes that live outside this group —
 * the landing page (`/`, which has its own marketing header) and `/demo/posthog`.
 *
 * The header is `sticky top-0` and in normal flow, so child pages need no
 * compensating top padding.
 */
function AppLayout() {
	return (
		<>
			<AppHeader />
			<Outlet />
		</>
	);
}
