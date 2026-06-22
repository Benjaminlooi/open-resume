import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useJobApplicationStore } from "#/features/job-postings/job-application-store";
import { createJobPosting } from "#/lib/local-companion-client";

interface NewJobApplicationModalProps {
	onClose: () => void;
	onCreated?: () => void;
}

function isValidHttpUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export default function NewJobApplicationModal({
	onClose,
	onCreated,
}: NewJobApplicationModalProps) {
	const navigate = useNavigate();
	const createJobApplication = useJobApplicationStore(
		(state) => state.createJobApplication,
	);

	const [activeTab, setActiveTab] = useState<"crawl" | "manual">("crawl");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Crawl form state
	const [sourceUrl, setSourceUrl] = useState("");

	// Manual form state
	const [companyName, setCompanyName] = useState("");
	const [jobTitle, setJobTitle] = useState("");
	const [location, setLocation] = useState("");
	const [manualSourceUrl, setManualSourceUrl] = useState("");
	const [jobDescription, setJobDescription] = useState("");

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedUrl = sourceUrl.trim();
		if (!isValidHttpUrl(trimmedUrl)) {
			setError("Enter a valid HTTP or HTTPS job URL.");
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			await createJobPosting(trimmedUrl);
			onCreated?.();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add job.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleManualSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedCompany = companyName.trim();
		const trimmedTitle = jobTitle.trim();
		const trimmedDescription = jobDescription.trim();

		if (!trimmedCompany || !trimmedTitle || !trimmedDescription) {
			setError("Company Name, Job Title, and Job Description are required.");
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			const appId = await createJobApplication(
				trimmedCompany,
				trimmedTitle,
				location.trim(),
				manualSourceUrl.trim(),
				trimmedDescription,
			);
			onCreated?.();
			onClose();
			navigate({ to: "/jobs/$id", params: { id: appId } });
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create application.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="flex w-full max-w-xl flex-col gap-4 rounded-base border-2 border-border bg-white p-6 text-[#082F49] shadow-shadow max-h-[90vh] overflow-y-auto">
				<h2 className="font-heading text-2xl">Add Job</h2>

				<div className="flex border-b-2 border-border">
					<button
						type="button"
						onClick={() => {
							setActiveTab("crawl");
							setError("");
						}}
						className={`flex-1 py-2 font-bold text-center border-r-2 border-border cursor-pointer transition-colors ${
							activeTab === "crawl"
								? "bg-main text-main-foreground"
								: "bg-white text-muted-foreground hover:bg-main/5"
						}`}
					>
						Crawl Job URL
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("manual");
							setError("");
						}}
						className={`flex-1 py-2 font-bold text-center cursor-pointer transition-colors ${
							activeTab === "manual"
								? "bg-main text-main-foreground"
								: "bg-white text-muted-foreground hover:bg-main/5"
						}`}
					>
						Manual Entry
					</button>
				</div>

				{error && (
					<div className="rounded-base border-2 border-border bg-red-100 p-2 font-bold text-red-900 text-sm">
						{error}
					</div>
				)}

				{activeTab === "crawl" ? (
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<div>
							<label className="mb-1 block font-bold text-sm" htmlFor="job-url">
								Job URL
							</label>
							<input
								id="job-url"
								type="url"
								required
								value={sourceUrl}
								onChange={(event) => setSourceUrl(event.target.value)}
								placeholder="https://company.com/careers/job"
								className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
							/>
						</div>
						<div className="mt-2 flex justify-end gap-4">
							<button
								type="button"
								onClick={onClose}
								className="cursor-pointer rounded-base border-2 border-border bg-white px-4 py-2 font-bold hover:bg-main/5"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="cursor-pointer rounded-base border-2 border-border bg-main px-4 py-2 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none disabled:opacity-60"
							>
								{isSubmitting ? "Adding..." : "Add Job"}
							</button>
						</div>
					</form>
				) : (
					<form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
						<div>
							<label
								className="mb-1 block font-bold text-sm"
								htmlFor="company-name"
							>
								Company Name *
							</label>
							<input
								id="company-name"
								type="text"
								required
								value={companyName}
								onChange={(event) => setCompanyName(event.target.value)}
								placeholder="Acme Corp"
								className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
							/>
						</div>
						<div>
							<label
								className="mb-1 block font-bold text-sm"
								htmlFor="job-title"
							>
								Job Title *
							</label>
							<input
								id="job-title"
								type="text"
								required
								value={jobTitle}
								onChange={(event) => setJobTitle(event.target.value)}
								placeholder="Software Engineer"
								className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
							/>
						</div>
						<div>
							<label
								className="mb-1 block font-bold text-sm"
								htmlFor="location"
							>
								Location
							</label>
							<input
								id="location"
								type="text"
								value={location}
								onChange={(event) => setLocation(event.target.value)}
								placeholder="Remote / San Francisco, CA"
								className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
							/>
						</div>
						<div>
							<label
								className="mb-1 block font-bold text-sm"
								htmlFor="manual-source-url"
							>
								Source URL
							</label>
							<input
								id="manual-source-url"
								type="url"
								value={manualSourceUrl}
								onChange={(event) => setManualSourceUrl(event.target.value)}
								placeholder="https://company.com/careers/job"
								className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
							/>
						</div>
						<div>
							<label
								className="mb-1 block font-bold text-sm"
								htmlFor="job-description"
							>
								Job Description *
							</label>
							<textarea
								id="job-description"
								required
								rows={5}
								value={jobDescription}
								onChange={(event) => setJobDescription(event.target.value)}
								placeholder="Paste the job description here..."
								className="w-full rounded-base border-2 border-border bg-white p-2 focus:outline-none focus:ring-2 focus:ring-main"
							/>
						</div>
						<div className="mt-2 flex justify-end gap-4">
							<button
								type="button"
								onClick={onClose}
								className="cursor-pointer rounded-base border-2 border-border bg-white px-4 py-2 font-bold hover:bg-main/5"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="cursor-pointer rounded-base border-2 border-border bg-main px-4 py-2 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
							>
								Create Application
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
