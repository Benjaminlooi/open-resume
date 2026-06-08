import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import type { JobApplication } from "#/lib/job-application-schema";
import { useJobApplicationStore } from "#/lib/job-application-store";

interface JobDetailsStepProps {
	job: JobApplication;
}

export function JobDetailsStep({ job }: JobDetailsStepProps) {
	const updateJobApplication = useJobApplicationStore(
		(state) => state.updateJobApplication,
	);

	return (
		<section className="grid gap-4 rounded-base border-2 border-border bg-white p-5">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor="job-company">Company</Label>
					<Input
						id="job-company"
						value={job.company}
						onChange={(event) =>
							updateJobApplication(job.id, { company: event.target.value })
						}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="job-title">Title</Label>
					<Input
						id="job-title"
						value={job.title}
						onChange={(event) =>
							updateJobApplication(job.id, { title: event.target.value })
						}
					/>
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor="job-location">Location</Label>
					<Input
						id="job-location"
						value={job.location}
						onChange={(event) =>
							updateJobApplication(job.id, { location: event.target.value })
						}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="job-source">Source URL</Label>
					<Input
						id="job-source"
						value={job.sourceUrl}
						onChange={(event) =>
							updateJobApplication(job.id, { sourceUrl: event.target.value })
						}
					/>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="job-description">Job description</Label>
				<Textarea
					id="job-description"
					value={job.description}
					onChange={(event) =>
						updateJobApplication(job.id, { description: event.target.value })
					}
					className="min-h-64"
				/>
			</div>
		</section>
	);
}
