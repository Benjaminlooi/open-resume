import { type FormEvent, useEffect, useState } from "react";
import { useJobApplicationStore } from "#/features/jobs/job-application-store";

interface JobDetailsStepProps {
	applicationId: string;
}

export default function JobDetailsStep({ applicationId }: JobDetailsStepProps) {
	const { jobApplications, updateJobApplication } = useJobApplicationStore();
	const application = jobApplications.find((app) => app.id === applicationId);

	const [company, setCompany] = useState(application?.company || "");
	const [title, setTitle] = useState(application?.title || "");
	const [location, setLocation] = useState(application?.location || "");
	const [sourceUrl, setSourceUrl] = useState(application?.sourceUrl || "");
	const [description, setDescription] = useState(
		application?.description || "",
	);
	const [error, setError] = useState("");
	const [isSaved, setIsSaved] = useState(false);

	useEffect(() => {
		if (application) {
			setCompany(application.company || "");
			setTitle(application.title || "");
			setLocation(application.location || "");
			setSourceUrl(application.sourceUrl || "");
			setDescription(application.description || "");
		}
	}, [application]);

	if (!application) {
		return (
			<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold">
				Job application not found.
			</div>
		);
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setError("");
		setIsSaved(false);

		if (!company.trim()) {
			setError("Company name is required");
			return;
		}
		if (!title.trim()) {
			setError("Job title is required");
			return;
		}

		updateJobApplication(applicationId, {
			company: company.trim(),
			title: title.trim(),
			location: location.trim(),
			sourceUrl: sourceUrl.trim(),
			description: description.trim(),
		});

		setIsSaved(true);
		const timer = setTimeout(() => setIsSaved(false), 3000);
		return () => clearTimeout(timer);
	};

	return (
		<div className="bg-white border-2 border-border rounded-base p-6 shadow-shadow text-[#082F49] flex flex-col gap-4">
			<div className="flex justify-between items-center border-b-2 border-border pb-4">
				<h2 className="text-2xl font-heading">Job Details</h2>
				<p className="text-sm text-muted-foreground">Step 1 of 5</p>
			</div>

			{error && (
				<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-3 text-sm font-bold">
					{error}
				</div>
			)}

			{isSaved && (
				<div className="bg-green-100 text-green-900 border-2 border-border rounded-base p-3 text-sm font-bold">
					Job details saved successfully!
				</div>
			)}

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div>
					<label className="block text-sm font-bold mb-1">
						Company <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						value={company}
						onChange={(e) => setCompany(e.target.value)}
						placeholder="e.g. Acme Corp"
						className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
					/>
				</div>

				<div>
					<label className="block text-sm font-bold mb-1">
						Job Title <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Software Engineer"
						className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-bold mb-1">Location</label>
						<input
							type="text"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							placeholder="e.g. Remote / New York"
							className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
						/>
					</div>
					<div>
						<label className="block text-sm font-bold mb-1">Job URL</label>
						<input
							type="url"
							value={sourceUrl}
							onChange={(e) => setSourceUrl(e.target.value)}
							placeholder="e.g. https://company.com/careers/123"
							className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main bg-white"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-bold mb-1">
						Job Description
					</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Paste job description here..."
						rows={8}
						className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main font-mono text-sm bg-white"
					/>
				</div>

				<div className="flex justify-end pt-2">
					<button
						type="submit"
						className="px-6 py-2.5 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer bg-main"
					>
						Save Details
					</button>
				</div>
			</form>
		</div>
	);
}
