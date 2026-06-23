import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashboardHeader from "#/components/dashboard/DashboardHeader";

export const Route = createFileRoute("/jobs")({
	component: JobsLayout,
});

/**
 * Layout route for the `/jobs` segment.
 *
 * `routes/jobs.tsx` is the layout route for the `jobs/` directory, so every
 * nested route (e.g. `/jobs/$id`) renders inside this component. The shared
 * chrome — just the dashboard header — lives here, and `<Outlet />` renders the
 * matched child: the jobs dashboard (`/jobs`) or a job workspace (`/jobs/$id`).
 *
 * Previously the entire jobs dashboard lived in this file with no `<Outlet />`,
 * so navigating to `/jobs/$id` matched the route but the child `JobWorkspace`
 * never rendered — clicking "View Workspace" changed the URL but left the page
 * visually unchanged.
 */
function JobsLayout() {
	return (
		<>
			<DashboardHeader />
			<Outlet />
		</>
	);
}
