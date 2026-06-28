import {
	AlertTriangle,
	Check,
	Clipboard,
	FileText,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	generateCoverLetter,
	getProviderConfig,
} from "#/features/job-postings/job-ai";
import { getResumeData, useRootStore } from "#/lib/root-store";
import StepShell from "./StepShell";

interface CoverLetterStepProps {
	applicationId: string;
}

export default function CoverLetterStep({
	applicationId,
}: CoverLetterStepProps) {
	const jobApplications = useRootStore((s) => s.jobApplication.jobApplications);
	const saveCoverLetterDraft = useRootStore(
		(s) => s.jobApplication.saveCoverLetterDraft,
	);
	const generatingCoverLetterAppId = useRootStore((s) => s.jobApplication.generatingCoverLetterAppId);
	const setGeneratingCoverLetter = useRootStore((s) => s.jobApplication.setGeneratingCoverLetter);
	const application = jobApplications.find((app) => app.id === applicationId);

	const coverLetterDraft = application?.coverLetterDraft;

	const isGenerating = generatingCoverLetterAppId === applicationId;
	const [error, setError] = useState<string | null>(null);
	const [localContent, setLocalContent] = useState(
		coverLetterDraft?.content || "",
	);
	const [isSaved, setIsSaved] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	// Sync local states only when a new draft is generated to prevent cursor jump/race conditions
	const [lastGeneratedAt, setLastGeneratedAt] = useState(coverLetterDraft?.generatedAt);
	useEffect(() => {
		if (coverLetterDraft) {
			if (coverLetterDraft.generatedAt !== lastGeneratedAt) {
				setLocalContent(coverLetterDraft.content || "");
				setLastGeneratedAt(coverLetterDraft.generatedAt);
			}
		} else {
			setLocalContent("");
			setLastGeneratedAt(undefined);
		}
	}, [coverLetterDraft, lastGeneratedAt]);

	// Auto-save logic with debounce
	useEffect(() => {
		if (!coverLetterDraft || localContent === coverLetterDraft.content) {
			return;
		}

		setIsSaving(true);
		setIsSaved(false);

		const timer = setTimeout(async () => {
			try {
				await saveCoverLetterDraft(applicationId, {
					content: localContent,
					generatedAt: coverLetterDraft.generatedAt,
					updatedAt: Date.now(),
				});
				setIsSaved(true);
			} catch (err) {
				console.error("Auto-save cover letter failed:", err);
			} finally {
				setIsSaving(false);
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [localContent, coverLetterDraft, applicationId, saveCoverLetterDraft]);

	if (!application) {
		// StepShell renders the "not found" state when the application is missing.
		return (
			<StepShell
				applicationId={applicationId}
				stepId="cover-letter"
				title="Cover Letter"
			/>
		);
	}

	const { tailoredResume, sourceResumeSnapshot, fitBrief } = application;

	const handleGenerate = async () => {
		if (!fitBrief) {
			setError(
				"Cannot generate cover letter: Fit Analysis must be generated first.",
			);
			return;
		}

		setGeneratingCoverLetter(applicationId);
		setError(null);

		try {
			const resumeToUse = tailoredResume || sourceResumeSnapshot;
			let finalResume = resumeToUse;

			if (!finalResume) {
				const defaultResumeId = useRootStore.getState().resumeIndex.defaultResumeId;
				if (defaultResumeId) {
					finalResume = await getResumeData(defaultResumeId);
				}
			}

			if (!finalResume) {
				throw new Error(
					"No resume found. Please select a default resume or begin tailoring first.",
				);
			}

			const providerConfig = getProviderConfig();

			const draft = await generateCoverLetter(
				providerConfig,
				application,
				fitBrief,
				finalResume,
			);
			saveCoverLetterDraft(applicationId, draft);
			setLastGeneratedAt(draft.generatedAt);
		} catch (err) {
			console.error(err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to generate cover letter.",
			);
		} finally {
			setGeneratingCoverLetter(null);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(localContent);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<StepShell
			applicationId={applicationId}
			stepId="cover-letter"
			title="Cover Letter"
			subtitle="Generate a tailored cover letter based on your experience and the role fit analysis."
		>
			{error && (
				<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold flex gap-2 items-center">
					<AlertTriangle className="size-5 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{!coverLetterDraft ? (
				<div className="border-2 border-dashed border-border rounded-base p-12 bg-white flex flex-col items-center justify-center text-center">
					<div className="size-16 rounded-full border-2 border-border bg-[#F5F3FF] flex items-center justify-center mb-4 text-[#8B5CF6]">
						<FileText className="size-8" />
					</div>
					<h3 className="text-xl font-heading mb-2">
						No Cover Letter Drafted Yet
					</h3>
					<p className="text-muted-foreground max-w-md mb-6">
						AI will generate a polished cover letter referencing your specific
						strengths and tailoring it to this job application.
					</p>
					{!fitBrief && (
						<div className="bg-amber-100 text-amber-950 border-2 border-[#FCD34D] p-3 rounded-base text-sm font-bold max-w-md mb-6">
							⚠️ Fit Analysis must be generated in Step 2 before generating the
							cover letter.
						</div>
					)}
					<button
						type="button"
						disabled={isGenerating || !fitBrief}
						onClick={handleGenerate}
						className="inline-flex h-12 items-center gap-2 rounded-base border-2 border-border bg-main px-6 py-2.5 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-main"
					>
						{isGenerating ? (
							<>
								<Loader2 className="size-5 animate-spin" />
								Generating Cover Letter...
							</>
						) : (
							<>
								<Sparkles className="size-5" />
								Generate Cover Letter
							</>
						)}
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-bold text-muted-foreground">
							Last Generated:{" "}
							{new Date(coverLetterDraft.generatedAt).toLocaleDateString()}
						</span>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleCopy}
								className="inline-flex h-9 items-center gap-1.5 px-3 border-2 border-border bg-white font-bold text-xs rounded-base transition-all shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer"
							>
								{isCopied ? (
									<Check className="size-4 text-green-600" />
								) : (
									<Clipboard className="size-4" />
								)}
								{isCopied ? "Copied!" : "Copy Content"}
							</button>
							<button
								type="button"
								disabled={isGenerating}
								onClick={handleGenerate}
								className="inline-flex h-9 items-center gap-1.5 px-3 border-2 border-border bg-white hover:bg-main/5 font-bold text-xs rounded-base transition-all shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Sparkles className="size-4 text-purple-600" />
								{isGenerating ? "Regenerating..." : "Regenerate Cover Letter"}
							</button>
						</div>
					</div>

					{/* Auto-save status feedback */}
					<div className="flex justify-end text-xs font-bold text-muted-foreground h-4">
						{isSaving && <span className="text-amber-600 animate-pulse">Saving changes...</span>}
						{!isSaving && isSaved && <span className="text-emerald-600">✓ Auto-saved</span>}
					</div>

					<div className="flex flex-col gap-2">
						<textarea
							value={localContent}
							onChange={(e) => setLocalContent(e.target.value)}
							placeholder="Your cover letter text..."
							rows={18}
							className="w-full border-2 border-border rounded-base p-4 focus:outline-none focus:ring-2 focus:ring-main font-mono text-sm bg-white shadow-inner leading-relaxed"
						/>
					</div>
				</div>
			)}
		</StepShell>
	);
}
