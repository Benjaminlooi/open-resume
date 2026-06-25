import { describe, expect, it } from "vitest";
import {
	DEFAULT_STEP_ID,
	PIPELINE_STEPS,
	type PipelineStepId,
	clampStepIndex,
	isPipelineStepId,
	normaliseStepId,
	pipelineStepIdSchema,
	stepIdToIndex,
	stepIndexToId,
} from "./pipeline-steps";

const ALL_IDS: PipelineStepId[] = [
	"details",
	"fit",
	"tailoring",
	"cover-letter",
	"tracker",
];

describe("PIPELINE_STEPS", () => {
	it("declares the five canonical steps in order", () => {
		expect(PIPELINE_STEPS.map((s) => s.id)).toEqual(ALL_IDS);
		expect(PIPELINE_STEPS).toHaveLength(5);
	});

	it("every step has a non-empty name and a component", () => {
		for (const step of PIPELINE_STEPS) {
			expect(step.name.length).toBeGreaterThan(0);
			expect(typeof step.component).toBe("function");
		}
	});

	it("has unique ids", () => {
		const ids = PIPELINE_STEPS.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("stepIdToIndex / stepIndexToId", () => {
	it("round-trips every valid id through an index and back", () => {
		for (const id of ALL_IDS) {
			expect(stepIndexToId(stepIdToIndex(id))).toBe(id);
		}
	});

	it("returns the expected indices", () => {
		expect(stepIdToIndex("details")).toBe(0);
		expect(stepIdToIndex("tracker")).toBe(4);
	});
});

describe("clampStepIndex", () => {
	it("clamps below zero to zero", () => {
		expect(clampStepIndex(-3)).toBe(0);
	});

	it("clamps above the last index to the last index", () => {
		expect(clampStepIndex(99)).toBe(PIPELINE_STEPS.length - 1);
	});

	it("passes through valid indices unchanged", () => {
		expect(clampStepIndex(2)).toBe(2);
	});
});

describe("stepIndexToId", () => {
	it("clamps out-of-range indices to the nearest valid step", () => {
		expect(stepIndexToId(-1)).toBe("details");
		expect(stepIndexToId(100)).toBe("tracker");
	});
});

describe("normaliseStepId", () => {
	it("passes valid ids through", () => {
		for (const id of ALL_IDS) {
			expect(normaliseStepId(id)).toBe(id);
		}
	});

	it("falls back to the default for missing or unknown values", () => {
		expect(normaliseStepId(undefined)).toBe(DEFAULT_STEP_ID);
		expect(normaliseStepId(null)).toBe(DEFAULT_STEP_ID);
		expect(normaliseStepId("nonsense")).toBe(DEFAULT_STEP_ID);
		expect(normaliseStepId("")).toBe(DEFAULT_STEP_ID);
	});
});

describe("isPipelineStepId", () => {
	it("narrows on valid ids", () => {
		for (const id of ALL_IDS) {
			expect(isPipelineStepId(id)).toBe(true);
		}
	});

	it("rejects anything else", () => {
		expect(isPipelineStepId("nonsense")).toBe(false);
		expect(isPipelineStepId(undefined)).toBe(false);
		expect(isPipelineStepId(123)).toBe(false);
	});
});

describe("pipelineStepIdSchema", () => {
	it("accepts all canonical ids", () => {
		for (const id of ALL_IDS) {
			expect(pipelineStepIdSchema.safeParse(id).success).toBe(true);
		}
	});

	it("rejects unknown values", () => {
		expect(pipelineStepIdSchema.safeParse("bogus").success).toBe(false);
	});
});
