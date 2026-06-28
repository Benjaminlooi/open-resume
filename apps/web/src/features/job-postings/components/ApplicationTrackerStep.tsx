import { useEffect, useState } from "react";
import type { JobApplicationStatus } from "#/features/job-postings/job-application-schema";
import { useRootStore } from "#/lib/root-store";
import StepShell from "./StepShell";

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
	const jobApplications = useRootStore((s) => s.jobApplication.jobApplications);
	const setStatus = useRootStore((s) => s.jobApplication.setStatus);
	const updateJobApplication = useRootStore(
		(s) => s.jobApplication.updateJobApplication,
	);
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
	const [isSaving, setIsSaving] = useState(false);

	// Sync local states only when applicationId changes to prevent cursor jump/race conditions
	const [prevAppId, setPrevAppId] = useState(applicationId);
	useEffect(() => {
		if (applicationId !== prevAppId) {
			setPrevAppId(applicationId);
			setNotes(application?.notes || "");
			if (application?.followUpAt) {
				const d = new Date(application.followUpAt);
				const year = d.getFullYear();
				const month = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				setFollowUpDate(`${year}-${month}-${day}`);
			} else {
				setFollowUpDate("");
			}
			setIsSaved(false);
			setIsSaving(false);
		}
	}, [applicationId, prevAppId, application]);

	// Auto-save logic with debounce
	useEffect(() => {
		// Calculate the follow-up timestamp from current form state
		let currentFollowUpTimestamp: number | null = null;
		if (followUpDate) {
			const [year, month, day] = followUpDate.split("-").map(Number);
			currentFollowUpTimestamp = new Date(year, month - 1, day).getTime();
		}

		const storeFollowUp = application?.followUpAt || null;
		const storeNotes = application?.notes || "";

		// Check if there are actual changes before triggering auto-save
		if (notes === storeNotes && currentFollowUpTimestamp === storeFollowUp) {
			return;
		}

		setIsSaving(true);
		setIsSaved(false);

		const timer = setTimeout(async () => {
			try {
				await updateJobApplication(applicationId, {
					notes: notes.trim(),
					followUpAt: currentFollowUpTimestamp,
				});
				setIsSaved(true);
			} catch (err) {
				console.error("Auto-save failed:", err);
			} finally {
				setIsSaving(false);
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [notes, followUpDate, applicationId, updateJobApplication, application]);

	if (!application) {
		// StepShell renders the "not found" state when the application is missing.
		return (
			<StepShell
				applicationId={applicationId}
				stepId="tracker"
				title="Application Tracker"
			/>
		);
	}

	const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newStatus = e.target.value as JobApplicationStatus;
		setStatus(applicationId, newStatus);
	};

	return (
		<StepShell
			applicationId={applicationId}
			stepId="tracker"
			title="Application Tracker"
			subtitle="Update the tracking status, follow-up reminders, and general interview notes."
		>
			<div className="flex flex-col gap-5">
				{/* Auto-save status feedback */}
				<div className="flex justify-end text-xs font-bold text-muted-foreground h-4">
					{isSaving && <span className="text-amber-600 animate-pulse">Saving changes...</span>}
					{!isSaving && isSaved && <span className="text-emerald-600">✓ Auto-saved</span>}
				</div>

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
			</div>
		</StepShell>
	);
}
