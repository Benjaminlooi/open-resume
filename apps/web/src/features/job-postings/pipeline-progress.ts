import type { JobApplication } from "./job-application-schema";
import type { PipelineStepId } from "./pipeline-steps";
import { PIPELINE_STEPS } from "./pipeline-steps";

/**
 * Progress state for a single pipeline step.
 *
 * - `pending`    — not started yet and ready to be started.
 * - `blocked`    — a prerequisite step has not been completed (e.g. the fit
 *                  analysis must exist before the cover letter can be generated).
 * - `in-progress`— started but not yet finished.
 * - `complete`   — the step's artifact exists and is settled.
 */
export type StepProgressStatus =
	| "pending"
	| "blocked"
	| "in-progress"
	| "complete";

export interface StepProgress {
	status: StepProgressStatus;
	/** Human-readable guidance for what to do next on this step, if any. */
	nextAction?: string;
}

export interface PipelineProgress {
	steps: Record<PipelineStepId, StepProgress>;
	/** Overall next action — for the first non-complete step, in step order. */
	nextAction: string;
}

const isNonEmpty = (value: string | null | undefined): boolean =>
	!!value && value.trim().length > 0;

const isDefaultResumeMissing = (hasDefaultResume: boolean): boolean =>
	!hasDefaultResume;

/**
 * Pure, React-free derivation of pipeline progress from a single job
 * application.
 *
 * This is the single source of truth that the job workspace sidebar and
 * next-action bar read from, replacing the ad-hoc `getNextActionMessage`
 * if-chain that previously lived inline in the route component. It is display
 * only — it never writes to the persisted `status` field.
 *
 * `hasDefaultResume` mirrors how the store's `validatePipeline` computes the
 * source-resume fallback: it is `true` when a default resume is selected
 * globally, regardless of whether this application has its own snapshot.
 */
export function computePipelineProgress(
	app: JobApplication,
	hasDefaultResume: boolean,
): PipelineProgress {
	// --- Step: Job Details ---
	const detailsDone =
		isNonEmpty(app.title) &&
		isNonEmpty(app.company) &&
		isNonEmpty(app.description);
	const details: StepProgress = detailsDone
		? { status: "complete" }
		: {
				status: "in-progress",
				nextAction: "Enter the job title, company, and description (Step 1).",
			};

	// --- Step: Fit Analysis ---
	const fit: StepProgress = app.fitBrief
		? { status: "complete" }
		: {
				status: detailsDone ? "pending" : "blocked",
				nextAction: "Generate Fit Analysis (Step 2).",
			};

	// --- Step: Resume Tailoring ---
	let tailoring: StepProgress;
	if (!app.fitBrief) {
		tailoring = { status: "blocked" };
	} else if (!app.tailoredResume) {
		if (isDefaultResumeMissing(hasDefaultResume)) {
			tailoring = {
				status: "blocked",
				nextAction:
					"Select a default resume on the Resumes page to start tailoring (Step 3).",
			};
		} else {
			tailoring = {
				status: "pending",
				nextAction: "Start Resume Tailoring (Step 3).",
			};
		}
	} else {
		const hasPendingProposals = app.resumeEditProposals.some(
			(proposal) => proposal.status === "pending",
		);
		tailoring = hasPendingProposals
			? {
					status: "in-progress",
					nextAction: "Review and approve or reject pending tailoring proposals.",
				}
			: { status: "complete" };
	}

	// --- Step: Cover Letter ---
	let coverLetter: StepProgress;
	if (app.coverLetterDraft) {
		coverLetter = { status: "complete" };
	} else if (!app.fitBrief) {
		coverLetter = { status: "blocked" };
	} else {
		coverLetter = {
			status: "pending",
			nextAction: "Generate Cover Letter (Step 4).",
		};
	}

	// --- Step: Final Tracker ---
	const tracker: StepProgress = { status: "pending" };

	const steps: Record<PipelineStepId, StepProgress> = {
		details,
		fit,
		tailoring,
		"cover-letter": coverLetter,
		tracker,
	};

	// Overall next action = the first step (in order) that is not complete,
	// preferring steps that carry an explicit nextAction.
	const nextAction =
		PIPELINE_STEPS.map((step) => steps[step.id]).find(
			(step) => step.status !== "complete",
		)?.nextAction ?? "Submit the application and update its status (Step 5).";

	return { steps, nextAction };
}
