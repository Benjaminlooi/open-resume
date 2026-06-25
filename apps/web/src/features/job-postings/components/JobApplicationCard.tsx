import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Trash2 } from "lucide-react";
import type { JobApplication } from "#/features/job-postings/job-application-schema";
import {
	formatStatus,
	getStatusBadgeStyle,
} from "#/features/job-postings/job-application-status";

interface JobApplicationCardProps {
	application: JobApplication;
	onDelete: (id: string) => void;
}

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
