import type { ReactNode } from "react";
import { useRootStore } from "#/lib/root-store";
import type { PipelineStepId } from "../pipeline-steps";
import {
	PIPELINE_STEPS,
	stepIdToIndex,
	stepIndexToId,
} from "../pipeline-steps";
import { computePipelineProgress } from "../pipeline-progress";
import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, ArrowRight } from "lucide-react";

interface StepShellProps {
	/** The application this step belongs to. */
	applicationId: string;
	/** Which step this is, used to derive the "Step X of N" label. */
	stepId: PipelineStepId;
	/** Large heading, e.g. "Job Details". */
	title: string;
	/** One-line description shown under the title. */
	subtitle?: string;
	/**
	 * Step body. Optional so the shell can be rendered on its own to surface
	 * the "application not found" state from a step's early-return guard.
	 */
	children?: ReactNode;
}

/**
 * Shared framing for every pipeline step component.
 *
 * Replaces the per-step duplication of: the "application not found" guard, the
 * header row (title + subtitle + "Step N of M"), and the outer card chrome. The
 * "Step N of M" label is derived from {@link PIPELINE_STEPS} so it can never
 * drift if steps are reordered.
 */
export default function StepShell({
	applicationId,
	stepId,
	title,
	subtitle,
	children,
}: StepShellProps) {
	const navigate = useNavigate();
	const application = useRootStore((state) =>
		state.jobApplication.jobApplications.find((app) => app.id === applicationId),
	);
	const defaultResumeId = useRootStore((state) => state.resumeIndex.defaultResumeId);

	if (!application) {
		return (
			<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold animate-fade-in-slide-up">
				Job application not found.
			</div>
		);
	}

	const stepNumber = stepIdToIndex(stepId) + 1;
	const totalSteps = PIPELINE_STEPS.length;

	// Progress state for rendering the thin progress bar
	const hasDefaultResume = defaultResumeId !== null;
	const progress = computePipelineProgress(application, hasDefaultResume);
	const stepProgress = progress.steps[stepId];
	const isBlocked = stepProgress.status === "blocked";

	const completedCount = PIPELINE_STEPS.filter(
		(step) => progress.steps[step.id].status === "complete"
	).length;
	const progressPercentage = Math.round((completedCount / totalSteps) * 100);

	const goToStep = (index: number) => {
		navigate({
			to: "/jobs/$id",
			params: { id: applicationId },
			search: { step: stepIndexToId(index) },
		});
	};

	// Determine prerequisite step or warning details
	const activeIndex = stepIdToIndex(stepId);
	const prerequisiteStepIndex = PIPELINE_STEPS.findIndex(
		(step, idx) => idx < activeIndex && progress.steps[step.id].status !== "complete"
	);

	return (
		<div className="bg-white border-2 border-border rounded-base p-6 shadow-shadow text-[#082F49] flex flex-col gap-6">
			{/* Header */}
			<div className="flex flex-col border-b-2 border-border pb-4 gap-2">
				<div className="flex justify-between items-start md:items-center">
					<div>
						<h2 className="text-2xl font-heading">{title}</h2>
						{subtitle && (
							<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
						)}
					</div>
					<p className="text-sm text-muted-foreground shrink-0 ml-4 font-bold">
						Step {stepNumber} of {totalSteps}
					</p>
				</div>
				{/* Progress micro-visualization */}
				<div className="w-full mt-2 flex items-center gap-3">
					<div className="h-2 flex-grow bg-slate-100 border border-border rounded-full overflow-hidden">
						<div
							className="h-full bg-emerald-500 transition-all duration-500"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
					<span className="text-xs font-bold text-muted-foreground shrink-0">
						{progressPercentage}%
					</span>
				</div>
			</div>

			{/* Content / Blocked Warning */}
			{isBlocked ? (
				<div className="border-2 border-amber-200 bg-amber-50/50 rounded-base p-6 text-[#082F49] flex flex-col items-center justify-center text-center py-10 shadow-light">
					<div className="size-12 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center mb-3 text-amber-700">
						<Lock className="size-5" />
					</div>
					<h3 className="text-lg font-heading mb-1 text-amber-950">Step Blocked</h3>
					{prerequisiteStepIndex !== -1 ? (
						<>
							<p className="text-sm text-muted-foreground max-w-md mb-5">
								Requires <strong>{PIPELINE_STEPS[prerequisiteStepIndex].name}</strong> (Step {prerequisiteStepIndex + 1}) to be completed first.
							</p>
							<button
								type="button"
								onClick={() => goToStep(prerequisiteStepIndex)}
								className="inline-flex h-9 items-center gap-1.5 px-4 border-2 border-border bg-white hover:bg-slate-50 font-bold text-xs rounded-base transition-all shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer"
							>
								Go to Step {prerequisiteStepIndex + 1}
								<ArrowRight className="size-3.5" />
							</button>
						</>
					) : (
						<>
							<p className="text-sm text-muted-foreground max-w-md mb-5">
								{stepProgress.nextAction || "Please select a default resume to start tailoring."}
							</p>
							<Link
								to="/resumes"
								className="inline-flex h-9 items-center gap-1.5 px-4 border-2 border-border bg-white hover:bg-slate-50 font-bold text-xs rounded-base transition-all shadow-light hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none cursor-pointer"
							>
								Go to Resumes Page
								<ArrowRight className="size-3.5" />
							</Link>
						</>
					)}
				</div>
			) : (
				children
			)}
		</div>
	);
}
