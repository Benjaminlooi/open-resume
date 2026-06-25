import type { ComponentType } from "react";
import { z } from "zod";
import ApplicationTrackerStep from "./components/ApplicationTrackerStep";
import CoverLetterStep from "./components/CoverLetterStep";
import FitBriefStep from "./components/FitBriefStep";
import JobDetailsStep from "./components/JobDetailsStep";
import ResumeTailoringStep from "./components/ResumeTailoringStep";

/**
 * Stable identifier for each step in the application pipeline.
 *
 * Used as the URL search-param value (`?step=cover-letter`) so the active step
 * survives reloads and is deep-linkable. Deliberately decoupled from array
 * indices so steps can be reordered without invalidating URLs.
 */
export type PipelineStepId =
	| "details"
	| "fit"
	| "tailoring"
	| "cover-letter"
	| "tracker";

export interface PipelineStepDef {
	id: PipelineStepId;
	name: string;
	component: ComponentType<{ applicationId: string }>;
}

/**
 * Ordered list of pipeline steps rendered by the job workspace.
 *
 * Single source of truth for the sidebar navigation, the URL `step` param, and
 * the "Step X of N" labels inside each step component.
 */
export const PIPELINE_STEPS: PipelineStepDef[] = [
	{ id: "details", name: "Job Details", component: JobDetailsStep },
	{ id: "fit", name: "Fit Analysis", component: FitBriefStep },
	{ id: "tailoring", name: "Resume Tailoring", component: ResumeTailoringStep },
	{ id: "cover-letter", name: "Cover Letter", component: CoverLetterStep },
	{ id: "tracker", name: "Final Tracker", component: ApplicationTrackerStep },
];

export const DEFAULT_STEP_ID: PipelineStepId = "details";

/** Zod schema for validating the `step` URL search param. */
export const pipelineStepIdSchema = z.enum([
	"details",
	"fit",
	"tailoring",
	"cover-letter",
	"tracker",
]);

const VALID_IDS = PIPELINE_STEPS.map((step) => step.id);

/** Index of a step id within {@link PIPELINE_STEPS}, or null if unknown. */
export const stepIdToIndex = (id: PipelineStepId): number =>
	PIPELINE_STEPS.findIndex((step) => step.id === id);

/** Step id at a given index, clamped to the valid range. */
export const stepIndexToId = (index: number): PipelineStepId => {
	const clamped = Math.max(0, Math.min(index, PIPELINE_STEPS.length - 1));
	return PIPELINE_STEPS[clamped].id;
};

/** Clamp an arbitrary index to a valid step index. */
export const clampStepIndex = (index: number): number =>
	Math.max(0, Math.min(index, PIPELINE_STEPS.length - 1));

/**
 * Normalise an unknown search-param value into a valid step id, falling back to
 * the default step when the value is missing or unrecognised.
 */
export const normaliseStepId = (value: unknown): PipelineStepId => {
	const parsed = pipelineStepIdSchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_STEP_ID;
};

export const isPipelineStepId = (value: unknown): value is PipelineStepId =>
	typeof value === "string" && (VALID_IDS as string[]).includes(value);
