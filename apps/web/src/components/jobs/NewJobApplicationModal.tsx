import { type FormEvent, useState } from "react";
import { createCompanionJob } from "#/lib/local-companion-client";

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
	const [sourceUrl, setSourceUrl] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

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
			await createCompanionJob(trimmedUrl);
			onCreated?.();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to add job.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="flex w-full max-w-xl flex-col gap-4 rounded-base border-2 border-border bg-white p-6 text-[#082F49] shadow-shadow">
				<h2 className="font-heading text-2xl">Add Job URL</h2>
				{error && (
					<div className="rounded-base border-2 border-border bg-red-100 p-2 font-bold text-red-900 text-sm">
						{error}
					</div>
				)}
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
			</div>
		</div>
	);
}
