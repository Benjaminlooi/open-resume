import { useState, useEffect } from "react";
import { useJobApplicationStore } from "#/lib/job-application-store";
import type { JobApplicationStatus } from "#/lib/job-application-schema";

interface ApplicationTrackerStepProps {
	applicationId: string;
}

const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
	{ value: "saved", label: "Saved" },
	{ value: "analyzing", label: "Analyzing" },
	{ value: "tailoring", label: "Tailoring" },
	{ value: "applied", label: "Applied" },
	{ value: "interviewing", label: "Interviewing" },
	{ value: "offer", label: "Offer" },
	{ value: "rejected", label: "Rejected" },
	{ value: "archived", label: "Archived" },
];

export default function ApplicationTrackerStep({
	applicationId,
}: ApplicationTrackerStepProps) {
	const { jobApplications, setStatus, updateJobApplication } =
		useJobApplicationStore();
	const application = jobApplications.find((app) => app.id === applicationId);

	const getInitialFollowUpDate = () => {
		if (application?.followUpAt) {
			const d = new Date(application.followUpAt);
			const year = d.getFullYear();
			const month = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${year}-${month}-${day}`;
		}
		return "";
	};

	const [followUpDate, setFollowUpDate] = useState(getInitialFollowUpDate());
	const [notes, setNotes] = useState(application?.notes || "");
	const [isSaved, setIsSaved] = useState(false);

	useEffect(() => {
		if (application) {
			setNotes(application.notes || "");
			if (application.followUpAt) {
				const d = new Date(application.followUpAt);
				const year = d.getFullYear();
				const month = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				setFollowUpDate(`${year}-${month}-${day}`);
			} else {
				setFollowUpDate("");
			}
		}
	}, [application]);

	if (!application) {
		return (
			<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold">
				Job application not found.
			</div>
		);
	}

	const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newStatus = e.target.value as JobApplicationStatus;
		setStatus(applicationId, newStatus);
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaved(false);

		let followUpTimestamp: number | null = null;
		if (followUpDate) {
			const [year, month, day] = followUpDate.split("-").map(Number);
			followUpTimestamp = new Date(year, month - 1, day).getTime();
		}

		updateJobApplication(applicationId, {
			notes: notes.trim(),
			followUpAt: followUpTimestamp,
		});

		setIsSaved(true);
		const timer = setTimeout(() => setIsSaved(false), 3000);
		return () => clearTimeout(timer);
	};

	return (
		<div className="bg-white border-2 border-border rounded-base p-6 shadow-shadow text-[#082F49] flex flex-col gap-6">
			<div className="flex justify-between items-center border-b-2 border-border pb-4">
				<div>
					<h2 className="text-2xl font-heading">Application Tracker</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Update the tracking status, follow-up reminders, and general
						interview notes.
					</p>
				</div>
				<p className="text-sm text-muted-foreground">Step 5 of 5</p>
			</div>

			{isSaved && (
				<div className="bg-green-100 text-green-900 border-2 border-border rounded-base p-3 text-sm font-bold">
					Tracker changes saved successfully!
				</div>
			)}

			<form onSubmit={handleSave} className="flex flex-col gap-5">
				{/* Status Selection */}
				<div>
					<label className="block text-sm font-bold mb-1.5">
						Application Status
					</label>
					<select
						value={application.status}
						onChange={handleStatusChange}
						className="w-full border-2 border-border rounded-base p-2.5 focus:outline-none focus:ring-2 focus:ring-main bg-white font-bold"
					>
						{STATUS_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				</div>

				{/* Follow up Date */}
				<div>
					<label className="block text-sm font-bold mb-1.5">
						Follow-up Reminder Date
					</label>
					<input
						type="date"
						value={followUpDate}
						onChange={(e) => setFollowUpDate(e.target.value)}
						className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
					/>
					<p className="text-xs text-muted-foreground mt-1">
						Set a target date to follow up on this application (e.g. after
						submitting, or after an interview).
					</p>
				</div>

				{/* Notes */}
				<div>
					<label className="block text-sm font-bold mb-1.5">Notes & Log</label>
					<textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Log your conversations, interview questions, salary info, or follow-up notes here..."
						rows={10}
						className="w-full border-2 border-border rounded-base p-3 focus:outline-none focus:ring-2 focus:ring-main bg-white"
					/>
				</div>

				{/* Action Buttons */}
				<div className="flex justify-end pt-2 border-t border-border mt-2">
					<button
						type="submit"
						className="px-6 py-2.5 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer bg-main"
					>
						Save Tracker Info
					</button>
				</div>
			</form>
		</div>
	);
}
