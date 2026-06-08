import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import type {
	JobApplication,
	JobApplicationStatus,
} from "#/lib/job-application-schema";
import { useJobApplicationStore } from "#/lib/job-application-store";

const statuses: Array<{ value: JobApplicationStatus; label: string }> = [
	{ value: "saved", label: "Saved" },
	{ value: "analyzing", label: "Analyzing" },
	{ value: "tailoring", label: "Tailoring" },
	{ value: "applied", label: "Applied" },
	{ value: "interviewing", label: "Interviewing" },
	{ value: "offer", label: "Offer" },
	{ value: "rejected", label: "Rejected" },
	{ value: "archived", label: "Archived" },
];

interface ApplicationTrackerStepProps {
	job: JobApplication;
}

export function ApplicationTrackerStep({ job }: ApplicationTrackerStepProps) {
	const setStatus = useJobApplicationStore((state) => state.setStatus);
	const updateJobApplication = useJobApplicationStore(
		(state) => state.updateJobApplication,
	);

	return (
		<section className="grid gap-4 rounded-base border-2 border-border bg-white p-5">
			<div>
				<h2 className="font-heading text-2xl">Tracker</h2>
				<p className="text-muted-foreground text-sm">
					Keep application status, follow-ups, and private notes together.
				</p>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="grid gap-2">
					<Label>Status</Label>
					<Select
						value={job.status}
						onValueChange={(value) =>
							setStatus(job.id, value as JobApplicationStatus)
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statuses.map((status) => (
								<SelectItem key={status.value} value={status.value}>
									{status.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="follow-up">Follow up</Label>
					<Input
						id="follow-up"
						type="date"
						value={
							job.followUpAt
								? new Date(job.followUpAt).toISOString().slice(0, 10)
								: ""
						}
						onChange={(event) =>
							updateJobApplication(job.id, {
								followUpAt: event.target.value
									? new Date(`${event.target.value}T00:00:00`).getTime()
									: null,
							})
						}
					/>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="job-notes">Notes</Label>
				<Textarea
					id="job-notes"
					value={job.notes}
					onChange={(event) =>
						updateJobApplication(job.id, { notes: event.target.value })
					}
					className="min-h-48"
				/>
			</div>
		</section>
	);
}
