import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import type { JobApplication } from "#/lib/job-application-schema";
import { generateResumeEditProposals } from "#/lib/job-ai";
import { useJobApplicationStore } from "#/lib/job-application-store";
import { useSettingsStore } from "#/lib/settings-store";

interface ResumeTailoringStepProps {
	job: JobApplication;
}

export function ResumeTailoringStep({ job }: ResumeTailoringStepProps) {
	const {
		ensureTailoredResume,
		saveResumeEditProposals,
		applyResumeEditProposal,
		rejectResumeEditProposal,
	} = useJobApplicationStore();
	const settings = useSettingsStore();
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreateSnapshot = () => {
		setError(null);
		if (!ensureTailoredResume(job.id)) {
			setError("Choose a default resume before creating a tailored snapshot.");
		}
	};

	const handleGenerate = async () => {
		setError(null);
		const ready = ensureTailoredResume(job.id);
		const currentJob = useJobApplicationStore
			.getState()
			.jobs.find((item) => item.id === job.id);
		if (!ready || !currentJob?.tailoredResume || !currentJob.fitBrief) {
			setError("Generate a fit brief and create a tailored resume snapshot first.");
			return;
		}
		setIsGenerating(true);
		try {
			const result = await generateResumeEditProposals(
				{
					provider: settings.defaultProvider,
					apiKey: settings.apiKeys[settings.defaultProvider],
					baseUrl: settings.baseUrls[settings.defaultProvider],
					modelName: settings.selectedModels[settings.defaultProvider],
				},
				currentJob,
				currentJob.fitBrief,
				currentJob.tailoredResume,
			);
			if (result.ok && result.value) {
				saveResumeEditProposals(job.id, result.value);
			} else {
				setError(result.error ?? "Could not parse tailoring proposals.");
			}
		} catch (generationError) {
			setError(
				generationError instanceof Error
					? generationError.message
					: "Could not generate tailoring proposals.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<section className="grid gap-4 rounded-base border-2 border-border bg-white p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-heading text-2xl">Tailored resume</h2>
					<p className="text-muted-foreground text-sm">
						Keep the source resume untouched; approve changes into this snapshot.
					</p>
				</div>
				<div className="flex gap-2">
					<Button type="button" variant="neutral" onClick={handleCreateSnapshot}>
						Create snapshot
					</Button>
					<Button
						type="button"
						onClick={handleGenerate}
						disabled={isGenerating}
						className="gap-2"
					>
						{isGenerating ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<Sparkles className="size-4" aria-hidden="true" />
						)}
						Propose edits
					</Button>
				</div>
			</div>
			{error && (
				<div className="rounded-base border-2 border-red-800 bg-red-100 p-3 text-red-950 text-sm">
					{error}
				</div>
			)}
			<div className="rounded-base border-2 border-border bg-secondary-background p-3 text-sm">
				Source resume: {job.sourceResumeName ?? "No tailored snapshot yet"}
			</div>
			<div className="grid gap-3">
				{job.resumeEditProposals.length > 0 ? (
					job.resumeEditProposals.map((proposal) => (
						<div
							key={proposal.id}
							className="rounded-base border-2 border-border p-4"
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="font-heading text-lg">{formatTarget(proposal.target)}</p>
								<span className="rounded-base border-2 border-border bg-secondary-background px-2 py-1 font-bold text-xs">
									{proposal.status}
								</span>
							</div>
							<div className="mt-3 grid gap-3 md:grid-cols-2">
								<div>
									<p className="font-bold text-sm">Current</p>
									<p className="mt-1 text-muted-foreground text-sm">
										{proposal.currentText || "Empty"}
									</p>
								</div>
								<div>
									<p className="font-bold text-sm">Suggested</p>
									<p className="mt-1 text-sm">{proposal.suggestedText}</p>
								</div>
							</div>
							<p className="mt-3 text-muted-foreground text-sm">
								{proposal.rationale}
							</p>
							{proposal.status === "pending" && (
								<div className="mt-3 flex gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() =>
											applyResumeEditProposal(job.id, proposal.id)
										}
									>
										<Check className="size-4" aria-hidden="true" />
										Apply
									</Button>
									<Button
										type="button"
										size="sm"
										variant="neutral"
										onClick={() =>
											rejectResumeEditProposal(job.id, proposal.id)
										}
									>
										<X className="size-4" aria-hidden="true" />
										Reject
									</Button>
								</div>
							)}
						</div>
					))
				) : (
					<p className="rounded-base border-2 border-dashed border-border p-4 text-muted-foreground text-sm">
						No resume edit proposals yet.
					</p>
				)}
			</div>
		</section>
	);
}

function formatTarget(target: JobApplication["resumeEditProposals"][number]["target"]) {
	if (target.section === "summary") return "Summary";
	if (target.section === "experience") {
		return target.field === "bullet"
			? `Experience bullet ${target.bulletIndex + 1}`
			: `Experience ${target.field}`;
	}
	if (target.section === "skills") return "Skills";
	return "Project description";
}
