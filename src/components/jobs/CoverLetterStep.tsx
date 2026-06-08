import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import type { JobApplication } from "#/lib/job-application-schema";
import { generateCoverLetterDraft } from "#/lib/job-ai";
import { useJobApplicationStore } from "#/lib/job-application-store";
import { useSettingsStore } from "#/lib/settings-store";

interface CoverLetterStepProps {
	job: JobApplication;
}

export function CoverLetterStep({ job }: CoverLetterStepProps) {
	const saveCoverLetterDraft = useJobApplicationStore(
		(state) => state.saveCoverLetterDraft,
	);
	const settings = useSettingsStore();
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleGenerate = async () => {
		setError(null);
		if (!job.fitBrief || !job.tailoredResume) {
			setError("Generate a fit brief and tailored resume snapshot first.");
			return;
		}
		setIsGenerating(true);
		try {
			const result = await generateCoverLetterDraft(
				{
					provider: settings.defaultProvider,
					apiKey: settings.apiKeys[settings.defaultProvider],
					baseUrl: settings.baseUrls[settings.defaultProvider],
					modelName: settings.selectedModels[settings.defaultProvider],
				},
				job,
				job.fitBrief,
				job.tailoredResume,
			);
			if (result.ok && result.value) {
				saveCoverLetterDraft(job.id, result.value.content);
			} else {
				setError(result.error ?? "Could not parse cover letter draft.");
			}
		} catch (generationError) {
			setError(
				generationError instanceof Error
					? generationError.message
					: "Could not generate cover letter.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<section className="grid gap-4 rounded-base border-2 border-border bg-white p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-heading text-2xl">Cover letter</h2>
					<p className="text-muted-foreground text-sm">
						Generate a draft, then edit it directly before sending.
					</p>
				</div>
				<Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
					{isGenerating ? (
						<Loader2 className="size-4 animate-spin" aria-hidden="true" />
					) : (
						<Sparkles className="size-4" aria-hidden="true" />
					)}
					Generate
				</Button>
			</div>
			{error && (
				<div className="rounded-base border-2 border-red-800 bg-red-100 p-3 text-red-950 text-sm">
					{error}
				</div>
			)}
			<Textarea
				value={job.coverLetterDraft?.content ?? ""}
				onChange={(event) => saveCoverLetterDraft(job.id, event.target.value)}
				className="min-h-80"
				placeholder="Draft or paste a cover letter for this job."
			/>
		</section>
	);
}
