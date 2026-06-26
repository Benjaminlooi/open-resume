import type { ReactNode } from "react";
import { useRootStore } from "#/lib/root-store";
import type { PipelineStepId } from "../pipeline-steps";
import {
	PIPELINE_STEPS,
	stepIdToIndex,
} from "../pipeline-steps";

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
	const application = useRootStore((state) =>
		state.jobApplication.jobApplications.find((app) => app.id === applicationId),
	);

	if (!application) {
		return (
			<div className="bg-red-100 text-red-900 border-2 border-border rounded-base p-4 text-sm font-bold">
				Job application not found.
			</div>
		);
	}

	const stepNumber = stepIdToIndex(stepId) + 1;
	const totalSteps = PIPELINE_STEPS.length;

	return (
		<div className="bg-white border-2 border-border rounded-base p-6 shadow-shadow text-[#082F49] flex flex-col gap-6">
			<div className="flex justify-between items-center border-b-2 border-border pb-4">
				<div>
					<h2 className="text-2xl font-heading">{title}</h2>
					{subtitle && (
						<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					Step {stepNumber} of {totalSteps}
				</p>
			</div>
			{children}
		</div>
	);
}
