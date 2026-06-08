import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import type { JobApplication } from "#/lib/job-application-schema";
import { generateJobFitBrief } from "#/lib/job-ai";
import { useJobApplicationStore } from "#/lib/job-application-store";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { getResumeData } from "#/lib/resume-store";
import { useSettingsStore } from "#/lib/settings-store";

interface FitBriefStepProps {
	job: JobApplication;
}

export function FitBriefStep({ job }: FitBriefStepProps) {
	const saveFitBrief = useJobApplicationStore((state) => state.saveFitBrief);
	const { defaultResumeId } = useResumeIndexStore();
	const settings = useSettingsStore();
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleGenerate = async () => {
		setError(null);
		if (!defaultResumeId) {
			setError("Choose a default resume before analyzing fit.");
			return;
		}
		const resume = getResumeData(defaultResumeId);
		if (!resume) {
			setError("The default resume could not be loaded.");
			return;
		}
		setIsGenerating(true);
		try {
			const result = await generateJobFitBrief(
				{
					provider: settings.defaultProvider,
					apiKey: settings.apiKeys[settings.defaultProvider],
					baseUrl: settings.baseUrls[settings.defaultProvider],
					modelName: settings.selectedModels[settings.defaultProvider],
				},
				job,
				resume,
			);
			if (result.ok && result.value) {
				saveFitBrief(job.id, result.value);
			} else {
				setError(result.error ?? "Could not parse job analysis.");
			}
		} catch (generationError) {
			setError(
				generationError instanceof Error
					? generationError.message
					: "Could not generate job analysis.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<section className="grid gap-4 rounded-base border-2 border-border bg-white p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-heading text-2xl">Fit brief</h2>
					<p className="text-muted-foreground text-sm">
						Analyze the role before tailoring your resume snapshot.
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
			{job.fitBrief ? (
				<div className="grid gap-4 md:grid-cols-2">
					<BriefList title="Requirements" items={job.fitBrief.requirements} />
					<BriefList title="Keywords" items={job.fitBrief.keywords} />
					<BriefList title="Strengths" items={job.fitBrief.strengths} />
					<BriefList title="Gaps" items={job.fitBrief.gaps} />
					<BriefList title="Risks" items={job.fitBrief.risks} />
					<BriefList title="Next actions" items={job.fitBrief.nextActions} />
				</div>
			) : (
				<p className="rounded-base border-2 border-dashed border-border p-4 text-muted-foreground text-sm">
					No fit brief generated yet.
				</p>
			)}
		</section>
	);
}

function BriefList({ title, items }: { title: string; items: string[] }) {
	return (
		<div>
			<h3 className="font-heading text-lg">{title}</h3>
			<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
				{items.length > 0 ? (
					items.map((item) => <li key={item}>{item}</li>)
				) : (
					<li className="text-muted-foreground">None captured</li>
				)}
			</ul>
		</div>
	);
}
