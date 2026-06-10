import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useJobApplicationStore } from "#/lib/job-application-store";

interface NewJobApplicationModalProps {
	onClose: () => void;
}

export default function NewJobApplicationModal({
	onClose,
}: NewJobApplicationModalProps) {
	const navigate = useNavigate();
	const createJobApplication = useJobApplicationStore(
		(state) => state.createJobApplication,
	);
	const [company, setCompany] = useState("");
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [sourceUrl, setSourceUrl] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!company.trim()) {
			setError("Company name is required");
			return;
		}
		if (!title.trim()) {
			setError("Job title is required");
			return;
		}

		const id = createJobApplication(
			company.trim(),
			title.trim(),
			location.trim(),
			sourceUrl.trim(),
			description.trim(),
		);

		onClose();
		navigate({ to: "/jobs/$id", params: { id } });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white border-2 border-border rounded-base p-6 w-full max-w-2xl shadow-shadow flex flex-col gap-4 text-[#082F49]">
				<h2 className="text-2xl font-heading">New Job Application</h2>

				{error && (
					<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-2 text-sm font-bold">
						{error}
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
							rows={6}
							className="w-full border-2 border-border rounded-base p-2 focus:outline-none focus:ring-2 focus:ring-main font-mono text-sm bg-white"
						/>
					</div>

					<div className="flex justify-end gap-4 mt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 border-2 border-border rounded-base font-bold hover:bg-main/5 cursor-pointer bg-white"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 bg-main text-main-foreground border-2 border-border rounded-base font-bold shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
						>
							Add Job
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
