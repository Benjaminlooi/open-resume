import {
	AlertTriangle,
	Check,
	FileText,
	Info,
	Loader2,
	Sparkles,
	X,
} from "lucide-react";
import { useState } from "react";
import { generateResumeTailoring } from "#/lib/job-ai";
import {
	downloadFile,
	exportApplicationPacketToJson,
	exportCoverLetterToMarkdown,
	exportTailoredResumeToMarkdown,
} from "#/lib/job-application-export";
import type { ResumeEditTarget } from "#/lib/job-application-schema";
import { useJobApplicationStore } from "#/lib/job-application-store";
import { useResumeIndexStore } from "#/lib/resume-index-store";
import type { Resume } from "#/lib/resume-schema";
import { useSettingsStore } from "#/lib/settings-store";
import TailoredResumePreview from "./TailoredResumePreview";

interface ResumeTailoringStepProps {
	applicationId: string;
}

export default function ResumeTailoringStep({
	applicationId,
}: ResumeTailoringStepProps) {
	const {
		jobApplications,
		ensureTailoredResume,
		saveResumeEditProposals,
		applyResumeEditProposal,
		rejectResumeEditProposal,
	} = useJobApplicationStore();

	const application = jobApplications.find((app) => app.id === applicationId);

	const defaultResumeId = useResumeIndexStore((s) => s.defaultResumeId);
	const resumesList = useResumeIndexStore((s) => s.resumes);
	const defaultResumeEntry = resumesList.find((r) => r.id === defaultResumeId);
	const defaultResumeName = defaultResumeEntry?.name || "Default Resume";

	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"proposals" | "preview">(
		"proposals",
	);

	if (!application) {
		return (
			<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold">
				Job application not found.
			</div>
		);
	}

	const {
		tailoredResume,
		resumeEditProposals,
		fitBrief,
		sourceResumeSnapshot,
	} = application;

	const sourceResumeId = application.sourceResumeId || defaultResumeId;
	const sourceResumeEntry = resumesList.find((r) => r.id === sourceResumeId);
	const initialTemplateId = sourceResumeEntry?.templateId || "demo";

	const handleStartTailoring = () => {
		if (!defaultResumeId) {
			setError("Cannot start tailoring: No default resume is selected.");
			return;
		}
		ensureTailoredResume(applicationId);
	};

	const handleGenerateProposals = async () => {
		if (!fitBrief) {
			setError(
				"Cannot generate proposals: Fit Analysis must be generated first.",
			);
			return;
		}
		const resumeToTailor = sourceResumeSnapshot || tailoredResume;
		if (!resumeToTailor) {
			setError("No source resume snapshot found to tailor.");
			return;
		}

		setIsGenerating(true);
		setError(null);

		try {
			const { defaultProvider, apiKeys, baseUrls, selectedModels } =
				useSettingsStore.getState();
			const providerConfig = {
				provider: defaultProvider,
				apiKey: apiKeys[defaultProvider],
				baseUrl: baseUrls[defaultProvider],
				modelName: selectedModels[defaultProvider],
			};

			const proposals = await generateResumeTailoring(
				providerConfig,
				application,
				fitBrief,
				resumeToTailor,
			);
			saveResumeEditProposals(applicationId, proposals);
		} catch (err) {
			console.error(err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to generate resume tailoring proposals.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleExportResume = () => {
		if (!tailoredResume) return;
		const content = exportTailoredResumeToMarkdown(tailoredResume);
		const companySlug = application.company.trim().replace(/\s+/g, "_");
		downloadFile(content, `${companySlug}_Tailored_Resume.md`, "text/markdown");
	};

	const handleExportCoverLetter = () => {
		if (!application.coverLetterDraft) return;
		const content = exportCoverLetterToMarkdown(
			application.coverLetterDraft,
			application.title,
			application.company,
		);
		const companySlug = application.company.trim().replace(/\s+/g, "_");
		downloadFile(content, `${companySlug}_Cover_Letter.md`, "text/markdown");
	};

	const handleExportPacket = () => {
		const content = exportApplicationPacketToJson(application);
		const companySlug = application.company.trim().replace(/\s+/g, "_");
		downloadFile(
			content,
			`${companySlug}_Application_Packet.json`,
			"application/json",
		);
	};

	const getTargetDescription = (
		target: ResumeEditTarget,
		resume: Resume | null | undefined,
	) => {
		if (!target) return "Unknown Target";
		if (target.section === "summary") {
			return "Profile Summary";
		}
		if (target.section === "experience") {
			const item = resume?.experience?.find((e) => e.id === target.itemId);
			const company = item?.company || "Experience Item";
			if ("field" in target && target.field === "role") {
				return `Work Experience: ${company} (Job Title / Role)`;
			}
			if ("field" in target && target.field === "description") {
				return `Work Experience: ${company} (Description)`;
			}
			if ("field" in target && target.field === "bullet") {
				return `Work Experience: ${company} (Bullet #${target.bulletIndex + 1})`;
			}
			return `Work Experience: ${company}`;
		}
		if (target.section === "skills") {
			const item = resume?.skills?.find((s) => s.id === target.itemId);
			const category = item?.category || "Skills Category";
			return `Skills: ${category}`;
		}
		if (target.section === "projects") {
			const item = resume?.projects?.find((p) => p.id === target.itemId);
			const name = item?.name || "Project";
			return `Project: ${name} (Description)`;
		}
		return "Unknown Section";
	};

	return (
		<div className="bg-white border-2 border-border rounded-base p-6 shadow-shadow text-[#082F49] flex flex-col gap-6">
			<div className="flex justify-between items-center border-b-2 border-border pb-4">
				<div>
					<h2 className="text-2xl font-heading">Resume Tailoring</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Create a tailored version of your resume by reviewing and approving
						specific AI proposals.
					</p>
				</div>
				<p className="text-sm text-muted-foreground">Step 3 of 5</p>
			</div>

			{error && (
				<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold flex gap-2 items-center">
					<AlertTriangle className="size-5 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{/* Check: Tailored resume is not initialized */}
			{!tailoredResume ? (
				<div className="border-2 border-border rounded-base p-6 bg-[#FFFBEB] border-[#FEF3C7] shadow-light flex flex-col gap-4">
					<div className="flex gap-3 items-start">
						<Info className="size-6 text-[#D97706] shrink-0 mt-0.5" />
						<div>
							<h3 className="text-lg font-heading mb-1 text-[#B45309]">
								Start Resume Tailoring
							</h3>
							<p className="text-sm leading-relaxed text-[#78350F] mb-3">
								Tailoring will create a job-specific copy of your default
								resume. Your original default resume will remain untouched.
							</p>
							{defaultResumeId ? (
								<p className="text-sm text-[#78350F] font-bold">
									Selected Default Resume:{" "}
									<span className="bg-white/80 px-2 py-0.5 rounded border border-[#FDE68A]">
										{defaultResumeName}
									</span>
								</p>
							) : (
								<div className="bg-red-50 text-red-900 border border-red-200 rounded p-2 text-xs font-bold mt-2">
									⚠️ No default resume is currently selected. Please set a
									default resume on the Resumes page to begin tailoring.
								</div>
							)}
						</div>
					</div>

					<div className="flex justify-end border-t border-[#FDE68A] pt-4 mt-2">
						<button
							type="button"
							disabled={!defaultResumeId}
							onClick={handleStartTailoring}
							className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-main px-4 py-2 font-bold text-sm shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-main"
						>
							Start Tailoring
						</button>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-6">
					{/* Status Bar */}
					<div className="bg-[#F0F9FF] border-2 border-[#B9E6FE] rounded-base p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
						<div>
							<span className="font-bold text-[#0369A1]">
								Tailoring Branch Created:
							</span>
							<p className="text-muted-foreground mt-0.5">
								Cloned from source:{" "}
								<span className="font-semibold">
									{application.sourceResumeName || "Default Resume"}
								</span>
							</p>
						</div>
						{!fitBrief && (
							<div className="text-amber-800 font-bold text-xs bg-amber-50 border border-amber-200 p-2 rounded">
								⚠️ You must generate a Fit Analysis in Step 2 before generating
								proposals.
							</div>
						)}
					</div>

					{/* Sub-tabs layout */}
					<div className="flex gap-2 border-b-2 border-border pb-4">
						<button
							type="button"
							onClick={() => setActiveTab("proposals")}
							className={`px-4 py-2 border-2 rounded-base font-bold text-sm transition-all cursor-pointer ${
								activeTab === "proposals"
									? "bg-[#38BDF8] text-[#082F49] border-border shadow-shadow"
									: "bg-white text-muted-foreground border-border/60 hover:border-border hover:shadow-light"
							}`}
						>
							Review Proposals
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("preview")}
							className={`px-4 py-2 border-2 rounded-base font-bold text-sm transition-all cursor-pointer ${
								activeTab === "preview"
									? "bg-[#38BDF8] text-[#082F49] border-border shadow-shadow"
									: "bg-white text-muted-foreground border-border/60 hover:border-border hover:shadow-light"
							}`}
						>
							Live Preview & Export
						</button>
					</div>

					{activeTab === "proposals" ? (
						<div className="flex flex-col gap-6">
							{/* No Proposals state */}
							{resumeEditProposals.length === 0 ? (
								<div className="border-2 border-dashed border-border rounded-base p-12 bg-white flex flex-col items-center justify-center text-center">
									<div className="size-16 rounded-full border-2 border-border bg-[#F5F3FF] flex items-center justify-center mb-4 text-[#8B5CF6]">
										<Sparkles className="size-8" />
									</div>
									<h3 className="text-xl font-heading mb-2">
										No Proposals Generated
									</h3>
									<p className="text-muted-foreground max-w-md mb-6">
										AI will analyze the gaps between your resume and the job
										requirements and suggest specific, non-destructive rewrites.
									</p>
									<button
										type="button"
										disabled={isGenerating || !fitBrief}
										onClick={handleGenerateProposals}
										className="inline-flex h-12 items-center gap-2 rounded-base border-2 border-border bg-main px-6 py-2.5 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-main"
									>
										{isGenerating ? (
											<>
												<Loader2 className="size-5 animate-spin" />
												Generating Proposals...
											</>
										) : (
											<>
												<Sparkles className="size-5" />
												Generate Tailoring Proposals
											</>
										)}
									</button>
								</div>
							) : (
								<div className="flex flex-col gap-6">
									{/* Proposals List */}
									<div className="flex flex-col gap-4">
										<h3 className="text-xl font-heading">
											AI Recommendations ({resumeEditProposals.length})
										</h3>

										{resumeEditProposals.map((proposal) => {
											const isApplied =
												proposal.status === "applied" ||
												proposal.status === "approved";
											const isRejected = proposal.status === "rejected";
											const isPending = !isApplied && !isRejected;

											return (
												<div
													key={proposal.id}
													className={`border-2 border-border rounded-base p-5 bg-white shadow-light flex flex-col gap-4 transition-colors ${
														isApplied ? "border-green-500 bg-green-50/10" : ""
													} ${isRejected ? "opacity-60" : ""}`}
												>
													<div className="flex items-start justify-between gap-4">
														<div>
															<h4 className="font-heading text-lg text-main-foreground">
																{getTargetDescription(
																	proposal.target,
																	tailoredResume,
																)}
															</h4>
															<p className="text-sm font-bold text-muted-foreground mt-1">
																Rationale:{" "}
																<span className="font-normal text-[#082F49]">
																	{proposal.rationale}
																</span>
															</p>
														</div>

														{/* Status Badges */}
														{!isPending && (
															<span
																className={`text-xs px-2.5 py-1 rounded-base border-2 font-bold uppercase tracking-wider ${
																	isApplied
																		? "bg-green-150 text-green-950 border-green-300"
																		: "bg-red-150 text-red-950 border-red-300"
																}`}
															>
																{isApplied ? "Approved" : "Rejected"}
															</span>
														)}
													</div>

													{/* Comparison Diffs */}
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div className="flex flex-col gap-1.5">
															<span className="text-xs font-bold uppercase text-[#9F1239]">
																Current Content
															</span>
															<div className="bg-[#FFF1F2] text-[#881337] line-through p-3.5 rounded-base border-2 border-[#FECDD3] text-sm font-mono whitespace-pre-wrap">
																{proposal.currentText || "(Empty)"}
															</div>
														</div>
														<div className="flex flex-col gap-1.5">
															<span className="text-xs font-bold uppercase text-[#14532D]">
																Proposed Tailoring
															</span>
															<div className="bg-[#F0FDF4] text-[#14532D] p-3.5 rounded-base border-2 border-[#BBF7D0] text-sm font-mono whitespace-pre-wrap">
																{proposal.suggestedText}
															</div>
														</div>
													</div>

													{/* Actions */}
													{isPending && (
														<div className="flex justify-end gap-3 border-t border-border pt-3 mt-1">
															<button
																type="button"
																onClick={() =>
																	rejectResumeEditProposal(
																		applicationId,
																		proposal.id,
																	)
																}
																className="inline-flex h-9 items-center gap-1 px-3 border-2 border-border bg-red-100 hover:bg-red-200 text-red-950 font-bold text-xs rounded-base transition-all shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer"
															>
																<X className="size-4" />
																Reject Proposal
															</button>
															<button
																type="button"
																onClick={() =>
																	applyResumeEditProposal(
																		applicationId,
																		proposal.id,
																	)
																}
																className="inline-flex h-9 items-center gap-1 px-4 border-2 border-border bg-green-150 hover:bg-green-200 text-green-950 font-bold text-xs rounded-base transition-all shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer"
															>
																<Check className="size-4" />
																Approve & Apply
															</button>
														</div>
													)}
												</div>
											);
										})}
									</div>

									{/* Regenerate Proposals Button */}
									<div className="flex justify-end border-t border-border pt-4 mt-2">
										<button
											type="button"
											disabled={isGenerating || !fitBrief}
											onClick={handleGenerateProposals}
											className="inline-flex h-10 items-center gap-2 rounded-base border-2 border-border bg-white px-4 py-2 font-bold text-sm shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{isGenerating ? (
												<>
													<Loader2 className="size-4 animate-spin" />
													Regenerating Proposals...
												</>
											) : (
												<>
													<Sparkles className="size-4" />
													Regenerate Proposals
												</>
											)}
										</button>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-6">
							{/* Export Actions Panel */}
							<div className="border-2 border-border rounded-base p-5 bg-white shadow-shadow flex flex-col gap-4">
								<h3 className="font-heading text-lg">Export Actions</h3>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									<button
										type="button"
										onClick={handleExportResume}
										className="inline-flex h-11 items-center justify-center gap-2 border-2 border-border bg-[#F5F3FF] hover:bg-[#E0E7FF] text-[#082F49] font-bold text-sm rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
									>
										<FileText className="size-4 text-indigo-600" />
										Export Tailored Resume (MD)
									</button>
									<button
										type="button"
										disabled={!application.coverLetterDraft}
										onClick={handleExportCoverLetter}
										className="inline-flex h-11 items-center justify-center gap-2 border-2 border-border bg-[#FDF2F8] hover:bg-[#FCE7F3] text-[#082F49] font-bold text-sm rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<FileText className="size-4 text-pink-600" />
										Export Cover Letter (MD)
									</button>
									<button
										type="button"
										onClick={handleExportPacket}
										className="inline-flex h-11 items-center justify-center gap-2 border-2 border-border bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#082F49] font-bold text-sm rounded-base shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
									>
										<FileText className="size-4 text-emerald-600" />
										Export Full Packet (JSON)
									</button>
								</div>
								{!application.coverLetterDraft && (
									<p className="text-xs text-muted-foreground font-semibold">
										💡 Tip: Generate a cover letter in Step 4 to enable
										exporting the cover letter as markdown.
									</p>
								)}
							</div>

							{/* Live Preview */}
							<TailoredResumePreview
								tailoredResume={tailoredResume}
								templateId={initialTemplateId}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
