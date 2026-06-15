import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import { generateJobFitBrief } from "#/features/jobs/job-ai";
import { useJobApplicationStore } from "#/features/jobs/job-application-store";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import { getResumeData } from "#/lib/resume-store";
import { useSettingsStore } from "#/lib/settings-store";

interface FitBriefStepProps {
	applicationId: string;
}

export default function FitBriefStep({ applicationId }: FitBriefStepProps) {
	const { jobApplications, saveFitBrief, setStatus } = useJobApplicationStore();
	const application = jobApplications.find((app) => app.id === applicationId);

	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!application) {
		return (
			<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold">
				Job application not found.
			</div>
		);
	}

	const handleGenerate = async () => {
		setIsGenerating(true);
		setError(null);

		try {
			const defaultResumeId = useResumeIndexStore.getState().defaultResumeId;
			if (!defaultResumeId) {
				throw new Error(
					"No default resume selected. Please select a default resume first on the Resumes page.",
				);
			}

			const defaultResume = await getResumeData(defaultResumeId);
			if (!defaultResume) {
				throw new Error(
					`Failed to load default resume data for ID: ${defaultResumeId}`,
				);
			}

			// Get active provider config from settings store
			const { defaultProvider, apiKeys, baseUrls, selectedModels } =
				useSettingsStore.getState();
			const providerConfig = {
				provider: defaultProvider,
				apiKey: apiKeys[defaultProvider],
				baseUrl: baseUrls[defaultProvider],
				modelName: selectedModels[defaultProvider],
			};

			const fitBrief = await generateJobFitBrief(
				providerConfig,
				application,
				defaultResume,
			);
			saveFitBrief(applicationId, fitBrief);
			setStatus(applicationId, "analyzing");
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to generate fit analysis.");
		} finally {
			setIsGenerating(false);
		}
	};

	const { fitBrief } = application;

	return (
		<div className="bg-white border-2 border-border rounded-base p-6 shadow-shadow text-[#082F49] flex flex-col gap-6">
			<div className="flex justify-between items-center border-b-2 border-border pb-4">
				<div>
					<h2 className="text-2xl font-heading">Fit Analysis</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Analyze how well your default resume aligns with the job
						description.
					</p>
				</div>
				<p className="text-sm text-muted-foreground">Step 2 of 5</p>
			</div>

			{error && (
				<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold flex gap-2 items-center">
					<AlertTriangle className="size-5 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{!fitBrief ? (
				<div className="border-2 border-dashed border-border rounded-base p-12 bg-white flex flex-col items-center justify-center text-center">
					<div className="size-16 rounded-full border-2 border-border bg-[#F5F3FF] flex items-center justify-center mb-4 text-[#8B5CF6]">
						<Sparkles className="size-8" />
					</div>
					<h3 className="text-xl font-heading mb-2">
						No Fit Analysis Generated Yet
					</h3>
					<p className="text-muted-foreground max-w-md mb-6">
						AI will compare your default resume with the job description to
						identify strengths, key keywords, requirements, and profile gaps.
					</p>
					<button
						type="button"
						disabled={isGenerating}
						onClick={handleGenerate}
						className="inline-flex h-12 items-center gap-2 rounded-base border-2 border-border bg-main px-6 py-2.5 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-main"
					>
						{isGenerating ? (
							<>
								<Loader2 className="size-5 animate-spin" />
								Generating Fit Analysis...
							</>
						) : (
							<>
								<Sparkles className="size-5" />
								Generate Fit Analysis
							</>
						)}
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-6">
					{/* Role Summary */}
					<div className="border-2 border-border rounded-base p-5 bg-white shadow-light">
						<h3 className="text-lg font-heading mb-2">Role Summary</h3>
						<p className="leading-relaxed">{fitBrief.roleSummary}</p>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Requirements */}
						<div className="border-2 border-border rounded-base p-5 bg-white shadow-light flex flex-col">
							<h3 className="text-lg font-heading mb-3 flex items-center gap-2 border-b border-border pb-2">
								<CheckCircle2 className="size-5 text-[#0EA5E9]" />
								Key Requirements
							</h3>
							<ul className="flex flex-col gap-2 list-none pl-0">
								{fitBrief.requirements.map((req, i) => (
									<li key={i} className="flex gap-2 text-sm leading-relaxed">
										<ArrowRight className="size-4 text-[#0EA5E9] shrink-0 mt-0.5" />
										<span>{req}</span>
									</li>
								))}
							</ul>
						</div>

						{/* Keywords */}
						<div className="border-2 border-border rounded-base p-5 bg-white shadow-light flex flex-col">
							<h3 className="text-lg font-heading mb-3 flex items-center gap-2 border-b border-border pb-2">
								<Sparkles className="size-5 text-[#8B5CF6]" />
								Target Keywords
							</h3>
							<div className="flex flex-wrap gap-2">
								{fitBrief.keywords.map((kw, i) => (
									<span
										key={i}
										className="px-2.5 py-1 text-xs font-bold bg-[#F0F9FF] border-2 border-[#B9E6FE] rounded-base text-[#0369A1]"
									>
										{kw}
									</span>
								))}
							</div>
						</div>
					</div>

					{/* Strengths vs Gaps/Risks */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Strengths */}
						<div className="border-2 border-border rounded-base p-5 bg-[#F0FDF4] border-[#BBF7D0] shadow-light flex flex-col">
							<h3 className="text-lg font-heading mb-3 text-[#15803D] flex items-center gap-2 border-b border-[#BBF7D0] pb-2">
								<CheckCircle2 className="size-5 text-[#16A34A]" />
								Strengths & Matches
							</h3>
							<ul className="flex flex-col gap-2 list-none pl-0 text-[#14532D]">
								{fitBrief.strengths.map((str, i) => (
									<li key={i} className="flex gap-2 text-sm leading-relaxed">
										<span className="text-[#16A34A] font-bold shrink-0">•</span>
										<span>{str}</span>
									</li>
								))}
							</ul>
						</div>

						{/* Gaps / Risks */}
						<div className="border-2 border-border rounded-base p-5 bg-[#FFF1F2] border-[#FECDD3] shadow-light flex flex-col">
							<h3 className="text-lg font-heading mb-3 text-[#B91C1C] flex items-center gap-2 border-b border-[#FECDD3] pb-2">
								<AlertTriangle className="size-5 text-[#E11D48]" />
								Gaps & Risks
							</h3>
							<div className="flex flex-col gap-4">
								{fitBrief.gaps.length > 0 && (
									<div>
										<h4 className="text-xs font-bold uppercase text-[#9F1239] mb-1">
											Gaps
										</h4>
										<ul className="flex flex-col gap-1.5 list-none pl-0 text-[#881337]">
											{fitBrief.gaps.map((gap, i) => (
												<li
													key={i}
													className="flex gap-2 text-sm leading-relaxed"
												>
													<span className="text-[#E11D48] font-bold shrink-0">
														•
													</span>
													<span>{gap}</span>
												</li>
											))}
										</ul>
									</div>
								)}
								{fitBrief.risks.length > 0 && (
									<div>
										<h4 className="text-xs font-bold uppercase text-[#9F1239] mb-1">
											Risks & Concerns
										</h4>
										<ul className="flex flex-col gap-1.5 list-none pl-0 text-[#881337]">
											{fitBrief.risks.map((risk, i) => (
												<li
													key={i}
													className="flex gap-2 text-sm leading-relaxed"
												>
													<span className="text-[#E11D48] font-bold shrink-0">
														•
													</span>
													<span>{risk}</span>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Next Actions */}
					<div className="border-2 border-border rounded-base p-5 bg-[#FFFBEB] border-[#FEF3C7] shadow-light">
						<h3 className="text-lg font-heading mb-3 text-[#B45309] flex items-center gap-2 border-b border-[#FDE68A] pb-2">
							💡 Recommended Next Actions
						</h3>
						<ul className="flex flex-col gap-2 list-none pl-0 text-[#78350F]">
							{fitBrief.nextActions.map((action, i) => (
								<li key={i} className="flex gap-2 text-sm leading-relaxed">
									<span className="text-[#D97706] font-bold shrink-0">
										{i + 1}.
									</span>
									<span>{action}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Regeneration Button */}
					<div className="flex justify-end border-t border-border pt-4 mt-2">
						<button
							type="button"
							disabled={isGenerating}
							onClick={handleGenerate}
							className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-white px-4 py-2 font-bold text-sm shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isGenerating ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Regenerating...
								</>
							) : (
								<>
									<Sparkles className="size-4" />
									Regenerate Analysis
								</>
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
