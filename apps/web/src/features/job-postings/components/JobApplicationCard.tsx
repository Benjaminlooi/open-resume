import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Trash2 } from "lucide-react";
import type {
	JobApplication,
	JobApplicationStatus,
} from "#/features/job-postings/job-application-schema";

interface JobApplicationCardProps {
	application: JobApplication;
	onDelete: (id: string) => void;
}

const getStatusBadgeStyle = (status: JobApplicationStatus) => {
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

const formatStatus = (status: JobApplicationStatus) => {
	return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function JobApplicationCard({
	application,
	onDelete,
}: JobApplicationCardProps) {
	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (
			window.confirm(
				`Are you sure you want to delete the job application for "${application.title}" at "${application.company}"?`,
			)
		) {
			onDelete(application.id);
		}
	};

	return (
		<div className="border-2 border-border rounded-base p-5 flex flex-col bg-white shadow-shadow hover:-translate-y-1 transition-transform relative z-10 text-[#082F49] h-64 justify-between">
			<div className="flex flex-col gap-2 min-h-0">
				<div className="flex items-start justify-between gap-2 min-h-0">
					<div className="min-w-0 flex-1">
						<h3
							className="font-heading text-xl truncate"
							title={application.title}
						>
							{application.title}
						</h3>
						<p
							className="text-md font-bold text-muted-foreground truncate"
							title={application.company}
						>
							{application.company}
						</p>
					</div>
					<span
						className={`text-xs px-2 py-1 rounded-base border-2 font-bold ${getStatusBadgeStyle(
							application.status,
						)}`}
					>
						{formatStatus(application.status)}
					</span>
				</div>

				<div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1 min-h-0">
					{application.location && (
						<div className="flex items-center gap-1.5 min-w-0">
							<MapPin className="size-4 shrink-0" />
							<span className="truncate" title={application.location}>
								{application.location}
							</span>
						</div>
					)}
					<div className="flex items-center gap-1.5">
						<Calendar className="size-4 shrink-0" />
						<span>
							Updated: {new Date(application.updatedAt).toLocaleDateString()}
						</span>
					</div>
				</div>
			</div>

			<div className="border-t-2 border-dashed border-border pt-3 mt-2 min-w-0">
				<div className="text-xs truncate">
					<span className="font-bold">Resume: </span>
					{application.sourceResumeName ? (
						<span className="text-main-foreground bg-main/20 px-1.5 py-0.5 rounded-sm border border-main font-semibold">
							Source: {application.sourceResumeName}
						</span>
					) : (
						<span className="text-muted-foreground italic">
							No resume snapshot copied yet
						</span>
					)}
				</div>
			</div>

			<div className="flex gap-2 mt-4 shrink-0">
				<Link
					to="/jobs/$id"
					params={{ id: application.id }}
					className="flex-1 text-center bg-main text-main-foreground border-2 border-border rounded-base px-2 py-1.5 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow flex items-center justify-center gap-1 cursor-pointer"
				>
					View Workspace
				</Link>
				<button
					type="button"
					onClick={handleDelete}
					className="bg-red-200 text-red-900 border-2 border-border rounded-base px-3 py-1.5 font-bold text-sm hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all shadow-shadow flex items-center justify-center cursor-pointer"
					title="Delete application"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
		</div>
	);
}
