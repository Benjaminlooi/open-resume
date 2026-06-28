import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Check,
	ChevronLeft,
	ChevronRight,
	Lock,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	formatStatus,
	getStatusBadgeStyle,
} from "#/features/job-postings/job-application-status";
import { useRootStore, getResumeData } from "#/lib/root-store";
import { computePipelineProgress } from "#/features/job-postings/pipeline-progress";
import {
	DEFAULT_STEP_ID,
	type PipelineStepId,
	PIPELINE_STEPS,
	normaliseStepId,
	stepIdToIndex,
	stepIndexToId,
} from "#/features/job-postings/pipeline-steps";
import {
	generateJobFitBrief,
	generateCoverLetter,
	getProviderConfig,
} from "#/features/job-postings/job-ai";

export const Route = createFileRoute("/_app/jobs/$id")({
	validateSearch: (search: Record<string, unknown>): {
		step?: PipelineStepId;
	} => ({
		step: normaliseStepId(search.step),
	}),
	component: JobWorkspace,
});

function JobWorkspace() {
	const { id } = Route.useParams();
	const { step } = Route.useSearch();
	const navigate = useNavigate();

	const jobApplications = useRootStore((s) => s.jobApplication.jobApplications);
	const validatePipeline = useRootStore((s) => s.jobApplication.validatePipeline);
	const loadJobApplications = useRootStore(
		(s) => s.jobApplication.loadJobApplications,
	);
	const loadIndex = useRootStore((s) => s.resumeIndex.loadIndex);
	const defaultResumeId = useRootStore((s) => s.resumeIndex.defaultResumeId);
	const [isMounted, setIsMounted] = useState(false);

	const generatingFitAppId = useRootStore((s) => s.jobApplication.generatingFitAppId);
	const generatingCoverLetterAppId = useRootStore((s) => s.jobApplication.generatingCoverLetterAppId);
	const setGeneratingFit = useRootStore((s) => s.jobApplication.setGeneratingFit);
	const setGeneratingCoverLetter = useRootStore((s) => s.jobApplication.setGeneratingCoverLetter);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (isMounted) {
			loadJobApplications().catch((err) =>
				console.error("Failed to load job applications", err),
			);
			loadIndex().catch((err) =>
				console.error("Failed to load resumes index", err),
			);
		}
	}, [isMounted, loadJobApplications, loadIndex]);

	const application = jobApplications.find((app) => app.id === id);

	const activeStepId: PipelineStepId = step ?? DEFAULT_STEP_ID;
	const activeStepIndex = stepIdToIndex(activeStepId);

	const goToStep = (index: number) => {
		navigate({
			to: "/jobs/$id",
			params: { id },
			search: { step: stepIndexToId(index) },
		});
	};

	// Single source of truth for progress: stepper badges + next-action bar both read from this.
	const progress = application
		? computePipelineProgress(application, defaultResumeId !== null)
		: { steps: {} as any, nextAction: "" };

	// Define the primary actionable functions for next-action bar
	const getPrimaryAction = () => {
		if (!application) return null;

		if (progress.steps.details.status !== "complete") {
			return {
				label: "Fill Job Details",
				disabled: false,
				loading: false,
				onClick: () => goToStep(0),
			};
		}

		if (progress.steps.fit.status !== "complete") {
			const isGenerating = generatingFitAppId === id;
			return {
				label: "Generate Fit Analysis",
				disabled: isGenerating,
				loading: isGenerating,
				onClick: async () => {
					goToStep(1);
					setGeneratingFit(id);
					try {
						const defaultResId = useRootStore.getState().resumeIndex.defaultResumeId;
						if (!defaultResId) {
							throw new Error(
								"No default resume selected. Please select a default resume first on the Resumes page.",
							);
						}
						const defaultResume = await getResumeData(defaultResId);
						if (!defaultResume) {
							throw new Error("Failed to load default resume data.");
						}
						const providerConfig = getProviderConfig();
						const fitBrief = await generateJobFitBrief(
							providerConfig,
							application,
							defaultResume,
						);
						await useRootStore.getState().jobApplication.saveFitBrief(id, fitBrief);
						await useRootStore.getState().jobApplication.setStatus(id, "analyzing");
					} catch (err) {
						console.error(err);
						alert(err instanceof Error ? err.message : "Failed to generate fit analysis.");
					} finally {
						setGeneratingFit(null);
					}
				},
			};
		}

		if (progress.steps.tailoring.status !== "complete") {
			if (!application.tailoredResume) {
				const defaultResId = useRootStore.getState().resumeIndex.defaultResumeId;
				return {
					label: "Start Resume Tailoring",
					disabled: !defaultResId,
					loading: false,
					onClick: async () => {
						goToStep(2);
						await useRootStore.getState().jobApplication.ensureTailoredResume(id);
					},
				};
			}
			return {
				label: "Review Tailoring Proposals",
				disabled: false,
				loading: false,
				onClick: () => goToStep(2),
			};
		}

		if (progress.steps["cover-letter"].status !== "complete") {
			const isGenerating = generatingCoverLetterAppId === id;
			return {
				label: "Generate Cover Letter",
				disabled: isGenerating || !application.fitBrief,
				loading: isGenerating,
				onClick: async () => {
					goToStep(3);
					setGeneratingCoverLetter(id);
					try {
						const { fitBrief } = application;
						if (!fitBrief) {
							throw new Error("Fit Analysis must be generated first.");
						}
						const resumeToUse = application.tailoredResume || application.sourceResumeSnapshot;
						let finalResume = resumeToUse;
						if (!finalResume) {
							const defaultResId = useRootStore.getState().resumeIndex.defaultResumeId;
							if (defaultResId) {
								finalResume = await getResumeData(defaultResId);
							}
						}
						if (!finalResume) {
							throw new Error("No resume found. Please select a default resume or begin tailoring first.");
						}
						const providerConfig = getProviderConfig();
						const draft = await generateCoverLetter(
							providerConfig,
							application,
							fitBrief,
							finalResume,
						);
						await useRootStore.getState().jobApplication.saveCoverLetterDraft(id, draft);
					} catch (err) {
						console.error(err);
						alert(err instanceof Error ? err.message : "Failed to generate cover letter.");
					} finally {
						setGeneratingCoverLetter(null);
					}
				},
			};
		}

		return {
			label: "Go to Final Tracker",
			disabled: false,
			loading: false,
			onClick: () => goToStep(4),
		};
	};

	const primaryAction = getPrimaryAction();

	// Keyboard shortcut handling
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const activeEl = document.activeElement;
			if (
				activeEl &&
				(activeEl.tagName === "INPUT" ||
					activeEl.tagName === "TEXTAREA" ||
					activeEl.tagName === "SELECT" ||
					activeEl.getAttribute("contenteditable") === "true")
			) {
				return;
			}

			if (e.key === "ArrowLeft") {
				if (activeStepIndex > 0) {
					goToStep(activeStepIndex - 1);
				}
			} else if (e.key === "ArrowRight") {
				if (activeStepIndex < PIPELINE_STEPS.length - 1) {
					const nextStepId = PIPELINE_STEPS[activeStepIndex + 1].id;
					if (progress.steps[nextStepId]?.status !== "blocked") {
						goToStep(activeStepIndex + 1);
					}
				}
			}

			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				const action = getPrimaryAction();
				if (action && !action.disabled && !action.loading) {
					action.onClick();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeStepIndex, goToStep, progress.steps]);

	if (!isMounted) {
		return null;
	}

	if (!application) {
		return (
			<main className="mx-auto max-w-[1300px] p-8 text-[#082F49]">
				<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-6 text-sm font-bold flex flex-col gap-4 max-w-xl mx-auto shadow-shadow">
					<div className="flex gap-2 items-center text-lg font-heading">
						<AlertCircle className="size-6 shrink-0" />
						<span>Job application not found</span>
					</div>
					<p>
						The job application with ID "{id}" could not be found. It may have
						been deleted.
					</p>
					<Link
						to="/jobs"
						className="inline-flex w-fit items-center gap-1.5 border-2 border-border bg-white p-2 rounded-base font-bold text-sm shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
					>
						<ArrowLeft className="size-4" />
						Back to Jobs list
					</Link>
				</div>
			</main>
		);
	}

	const ActiveStepComponent = PIPELINE_STEPS[activeStepIndex].component;
	const warnings = validatePipeline();
	const jobWarnings = warnings[id] || [];

	return (
		<main className="mx-auto w-full max-w-[1300px] h-auto lg:h-[calc(100dvh-74px)] p-4 md:p-6 lg:p-8 text-[#082F49] flex flex-col gap-4 md:gap-6 overflow-y-visible lg:overflow-hidden">
			{/* Back Link */}
			<div className="shrink-0">
				<Link
					to="/jobs"
					className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
				>
					<ArrowLeft className="size-4" />
					Back to Jobs
				</Link>
			</div>

			{/* Header */}
			<div className="shrink-0 border-2 border-border rounded-base p-5 bg-white shadow-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-3xl font-heading">{application.title}</h1>
					<p className="text-lg font-bold text-muted-foreground mt-0.5">
						{application.company}
						{application.location && ` • ${application.location}`}
					</p>
				</div>
				<span
					className={`text-xs px-3 py-1.5 rounded-base border-2 font-bold uppercase tracking-wider ${getStatusBadgeStyle(
						application.status,
					)}`}
				>
					{formatStatus(application.status)}
				</span>
			</div>

			{/* Warnings Banner */}
			{jobWarnings.length > 0 && (
				<div className="shrink-0 bg-amber-100 border-2 border-amber-300 rounded-base p-4 text-amber-950 font-bold text-sm shadow-light">
					<div className="font-heading text-md mb-1.5 flex items-center gap-1.5 text-amber-950">
						⚠️ Pipeline Warnings for this Job:
					</div>
					<ul className="list-disc pl-5 font-normal flex flex-col gap-1">
						{jobWarnings.map((warn, index) => (
							<li key={index}>{warn}</li>
						))}
					</ul>
				</div>
			)}

			<div className="grid grid-cols-1 grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-4 gap-4 md:gap-6 flex-1 min-h-0">
				{/* Mobile Top Horizontal Stepper */}
				<div className="lg:hidden flex overflow-x-auto pb-3 gap-2 border-b-2 border-border mb-2 shrink-0 -mx-4 px-4 scrollbar-none">
					{PIPELINE_STEPS.map((pipelineStep, index) => {
						const isActive = activeStepIndex === index;
						const stepProgress = progress.steps[pipelineStep.id];
						const isBlocked = stepProgress.status === "blocked";
						return (
							<button
								key={pipelineStep.id}
								type="button"
								disabled={isBlocked}
								onClick={() => goToStep(index)}
								className={`flex items-center gap-2 px-3 py-2 border-2 rounded-base font-bold text-xs shrink-0 transition-all ${
									isActive
										? "bg-main text-main-foreground border-border shadow-shadow"
										: isBlocked
										? "bg-slate-50 text-slate-450 border-border/40 cursor-not-allowed"
										: "bg-white text-muted-foreground border-border/60 hover:border-border cursor-pointer"
								}`}
							>
								<span className={`size-4 rounded-full border flex items-center justify-center text-[9px] font-heading shrink-0 ${
									isActive
										? "bg-white text-main border-border"
										: stepProgress.status === "complete"
										? "bg-emerald-500 text-white border-transparent"
										: "bg-slate-100 text-slate-400"
								}`}>
									{stepProgress.status === "complete" ? (
										<Check className="size-2.5 stroke-[3]" />
									) : isBlocked ? (
										<Lock className="size-2" />
									) : (
										index + 1
									)}
								</span>
								<span>{pipelineStep.name}</span>
							</button>
						);
					})}
				</div>

				{/* Desktop Navigation vertical stepper */}
				<div className="hidden lg:flex lg:col-span-1 flex-col gap-0 overflow-y-auto shrink-0 pr-1 relative">
					{PIPELINE_STEPS.map((pipelineStep, index) => {
						const isActive = activeStepIndex === index;
						const stepProgress = progress.steps[pipelineStep.id];
						const isLast = index === PIPELINE_STEPS.length - 1;
						const isBlocked = stepProgress.status === "blocked";

						return (
							<div className="flex gap-4 relative" key={pipelineStep.id}>
								{/* Connector Line */}
								{!isLast && (
									<div
										className={`absolute left-[15px] top-[32px] bottom-0 w-0.5 border-l-2 ${
											stepProgress.status === "complete"
												? "border-emerald-500 border-solid"
												: "border-border border-dashed"
										}`}
									/>
								)}

								{/* Circle indicator */}
								<div className="flex flex-col items-center shrink-0 z-10">
									<div
										className={`size-8 rounded-full border-2 flex items-center justify-center font-heading text-xs transition-all ${
											isActive
												? "bg-main text-main-foreground border-border ring-4 ring-main/20 scale-110"
												: stepProgress.status === "complete"
												? "bg-emerald-500 text-white border-border"
												: isBlocked
												? "bg-slate-100 text-slate-400 border-slate-300"
												: "bg-white text-muted-foreground border-border"
										}`}
									>
										{stepProgress.status === "complete" ? (
											<Check className="size-4 stroke-[3]" />
										) : isBlocked ? (
											<Lock className="size-3.5" />
										) : (
											<span>{index + 1}</span>
										)}
									</div>
								</div>

								{/* Step Button Card */}
								<button
									type="button"
									disabled={isBlocked}
									onClick={() => goToStep(index)}
									className={`flex-1 text-left px-4 py-3 rounded-base border-2 font-bold text-sm transition-all flex items-center justify-between gap-2 mb-6 ${
										isActive
											? "bg-white text-[#082F49] border-border shadow-shadow translate-x-1"
											: isBlocked
											? "bg-slate-50/50 text-slate-400 border-border/40 cursor-not-allowed"
											: "bg-white text-muted-foreground border-border/60 hover:border-border hover:shadow-light cursor-pointer"
									}`}
								>
									<div className="flex flex-col">
										<span className="font-heading text-[#082F49]">{pipelineStep.name}</span>
										<span className="text-xs font-normal text-muted-foreground mt-0.5">
											{stepProgress.status === "complete"
												? "Complete"
												: isBlocked
												? "Locked"
												: stepProgress.status === "in-progress"
												? "In Progress"
												: "Pending"}
										</span>
									</div>
									<div className="shrink-0">
										{stepProgress.status === "complete" && <Check className="size-4 text-emerald-600" />}
										{isBlocked && <Lock className="size-3.5 text-slate-400" />}
									</div>
								</button>
							</div>
						);
					})}
				</div>

				{/* Active Step Panel */}
				<div className="lg:col-span-3 min-h-0 overflow-y-visible lg:overflow-y-auto pr-1">
					<div key={activeStepId} className="animate-fade-in-slide-up h-full">
						<ActiveStepComponent applicationId={id} />
					</div>
				</div>
			</div>

			{/* Bottom Bar Navigation */}
			<div className="shrink-0 border-2 border-border rounded-base p-4 bg-white shadow-shadow flex flex-col sm:flex-row justify-between items-center gap-4">
				{/* Step Incrementation / Arrows */}
				<div className="flex items-center gap-3">
					<button
						type="button"
						disabled={activeStepIndex === 0}
						onClick={() => goToStep(activeStepIndex - 1)}
						className="inline-flex h-10 w-10 items-center justify-center border-2 border-border bg-white font-bold rounded-base shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						title="Previous Step"
					>
						<ChevronLeft className="size-5" />
					</button>

					<div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
						Step {activeStepIndex + 1} of 5
					</div>

					<button
						type="button"
						disabled={
							activeStepIndex === PIPELINE_STEPS.length - 1 ||
							progress.steps[PIPELINE_STEPS[activeStepIndex + 1].id]?.status === "blocked"
						}
						onClick={() => goToStep(activeStepIndex + 1)}
						className="inline-flex h-10 w-10 items-center justify-center border-2 border-border bg-white font-bold rounded-base shadow-light transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						title="Next Step"
					>
						<ChevronRight className="size-5" />
					</button>
				</div>

				{/* Action Area */}
				<div className="flex gap-3 items-center w-full sm:w-auto shrink-0 justify-end">
					{primaryAction && (
						<button
							type="button"
							disabled={primaryAction.disabled}
							onClick={primaryAction.onClick}
							className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-base border-2 border-border bg-main px-6 py-2.5 font-bold text-main-foreground shadow-shadow transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-main"
						>
							{primaryAction.loading ? (
								<>
									<Loader2 className="size-5 animate-spin" />
									Generating...
								</>
							) : (
								<>
									<Sparkles className="size-4" />
									{primaryAction.label}
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</main>
	);
}
