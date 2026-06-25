import type { JobApplicationStatus } from "./job-application-schema";

/**
 * Tailwind class string for a given application status badge.
 *
 * Shared by the job workspace header (`/jobs/$id`) and the application card on
 * the jobs dashboard so the status colours stay consistent. Call sites are
 * responsible for any surrounding layout classes (padding, casing, etc.).
 */
export const getStatusBadgeStyle = (status: JobApplicationStatus): string => {
	switch (status) {
		case "saved":
			return "bg-slate-100 text-slate-800 border-slate-300";
		case "analyzing":
			return "bg-purple-100 text-purple-800 border-purple-300";
		case "tailoring":
			return "bg-amber-100 text-amber-800 border-amber-300";
		case "applied":
			return "bg-blue-100 text-blue-800 border-blue-300";
		case "interviewing":
			return "bg-emerald-100 text-emerald-800 border-emerald-300";
		case "offer":
			return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
		case "rejected":
			return "bg-red-100 text-red-800 border-red-300";
		case "archived":
			return "bg-zinc-100 text-zinc-800 border-zinc-300";
		default:
			return "bg-gray-100 text-gray-800 border-gray-300";
	}
};

/**
 * Capitalise the first letter of a status value for display.
 */
export const formatStatus = (status: JobApplicationStatus): string => {
	return status.charAt(0).toUpperCase() + status.slice(1);
};
