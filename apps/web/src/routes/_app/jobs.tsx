import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/jobs")({
	component: JobsLayout,
});

/**
 * Layout route for the `/jobs` segment.
 *
 * `routes/jobs.tsx` is the layout route for the `jobs/` directory, so every
 * nested route (e.g. `/jobs/$id`) renders inside this component. The shared app
 * header now comes from the root layout (`__root.tsx`), so this layout simply
 * renders the matched child via `<Outlet />`: the jobs dashboard (`/jobs`) or a
 * job workspace (`/jobs/$id`).
 */
function JobsLayout() {
	return <Outlet />;
}
